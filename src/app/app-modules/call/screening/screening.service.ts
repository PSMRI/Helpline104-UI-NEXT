/*
 * AMRIT – Accessible Medical Records via Integrated Technologies
 * Integrated EHR (Electronic Health Records) Solution
 *
 * Copyright (C) "Piramal Swasthya Management and Research Institute"
 *
 * This file is part of AMRIT.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see https://www.gnu.org/licenses/.
 */

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, TimeoutError, catchError, map, throwError, timeout } from 'rxjs';

import { ConfigService } from '../../core/services/config.service';
import {
  ApiResponse,
  QuestionType,
  QuestionsRequest,
  SaveScreeningRequest,
  SaveScreeningResponse,
  ScreeningError,
  ScreeningQuestion,
} from './screening.models';

/** Question types live on the common API; questions + save on the 104 API. */
const QUESTION_TYPES_PATH = 'questionTypeController/get/questionTypeList';
const QUESTIONS_PATH = 'beneficiary/get/questions';
const SAVE_PATH = 'beneficiary/save/benCaseSheet';

const GENERIC_ERROR = 'Internal issue, please try again later.';
const TIMEOUT_ERROR = 'The request timed out. Please check your connection and try again.';
const SCREENING_TIMEOUT_MS = 20_000;

/**
 * Disease-screening API shared by the Diabetic and BP screening tabs.
 *
 * Wraps the legacy `DiseaseScreeningService` (question types, questions) plus
 * the case-sheet save used to persist a screening result. Question-type lookup
 * is on the common API; questions and save are on the 104 API. The `{ data }`
 * envelope is unwrapped; failures normalise to a {@link ScreeningError}.
 */
@Injectable({ providedIn: 'root' })
export class ScreeningService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** Question-type list (common API). Resolves to `[]` when none returned. */
  getQuestionTypes(): Observable<QuestionType[]> {
    return this.http.post<ApiResponse<QuestionType[]>>(this.config.getCommonBaseURL() + QUESTION_TYPES_PATH, {}).pipe(
      timeout(SCREENING_TIMEOUT_MS),
      map((res) => this.readData(res) ?? []),
      catchError((err: unknown) => throwError(() => this.toError(err))),
    );
  }

  /**
   * Questions for a type + service (104 API). Each question's answer options
   * are sorted by `iD` (matching the legacy sort); resolves to `[]`.
   */
  getQuestions(questionTypeID: number, providerServiceMapID: number | null): Observable<ScreeningQuestion[]> {
    const body: QuestionsRequest = { questionTypeID, providerServiceMapID };
    return this.http.post<ApiResponse<ScreeningQuestion[]>>(this.config.get104BaseURL() + QUESTIONS_PATH, body).pipe(
      timeout(SCREENING_TIMEOUT_MS),
      map((res) =>
        (this.readData(res) ?? []).map((q) => ({
          ...q,
          m_104QuestionScore: [...(q.m_104QuestionScore ?? [])].sort((a, b) => (a.iD ?? 0) - (b.iD ?? 0)),
        })),
      ),
      catchError((err: unknown) => throwError(() => this.toError(err))),
    );
  }

  /** Save a screening result as a case-sheet row (104 API). */
  saveScreening(payload: SaveScreeningRequest): Observable<SaveScreeningResponse> {
    return this.http.post<ApiResponse<SaveScreeningResponse>>(this.config.get104BaseURL() + SAVE_PATH, payload).pipe(
      timeout(SCREENING_TIMEOUT_MS),
      map((res) => {
        if (res.statusCode && res.statusCode !== 200) {
          throw this.toError(res);
        }
        // Legacy read `benHistoryID` off the body; fall back when no envelope.
        return res.data ?? (res as unknown as SaveScreeningResponse) ?? {};
      }),
      catchError((err: unknown) => throwError(() => this.toError(err))),
    );
  }

  /** Non-200 status is a hard error; otherwise return (possibly absent) data. */
  private readData<T>(res: ApiResponse<T>): T | undefined {
    if (res.statusCode && res.statusCode !== 200) {
      throw this.toError(res);
    }
    return res.data;
  }

  /** Normalise any failure into a {@link ScreeningError}. */
  private toError(err: unknown): ScreeningError {
    if (err instanceof TimeoutError) {
      return { status: 0, errorMessage: TIMEOUT_ERROR };
    }

    if (
      err &&
      typeof (err as ScreeningError).status === 'number' &&
      typeof (err as ScreeningError).errorMessage === 'string'
    ) {
      return err as ScreeningError;
    }

    const envelope = err as ApiResponse<unknown> | undefined;
    if (envelope && typeof envelope.statusCode === 'number') {
      return {
        status: envelope.statusCode,
        errorMessage: envelope.errorMessage?.trim() || GENERIC_ERROR,
      };
    }

    if (err instanceof HttpErrorResponse) {
      const body = err.error as { errorMessage?: string } | string | null;
      const fromBody =
        body && typeof body === 'object' && typeof body.errorMessage === 'string'
          ? body.errorMessage
          : typeof body === 'string'
            ? body
            : '';
      return { status: err.status, errorMessage: fromBody.trim() || GENERIC_ERROR };
    }

    return { status: 0, errorMessage: GENERIC_ERROR };
  }
}
