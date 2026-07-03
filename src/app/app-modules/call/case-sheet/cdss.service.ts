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
import {
  Observable,
  TimeoutError,
  catchError,
  map,
  throwError,
  timeout,
} from 'rxjs';

import { ConfigService } from '../../core/services/config.service';
import {
  ApiResponse,
  CdssChiefComplaintsRequest,
  CdssDiagnosis,
  CdssError,
  CdssPatientContext,
  CdssQuestionSelection,
  CdssQuestionnaire,
  RawCdssDiagnosis,
  RawCdssQuestionSet,
} from './cdss.models';

/** All CDSS endpoints live on the 104 API under this prefix (legacy `url`). */
const CDSS_PREFIX = 'CDSS/';
const CHIEF_COMPLAINTS_PATH = CDSS_PREFIX + 'Symptoms';
const QUESTIONS_PATH = CDSS_PREFIX + 'getQuestions';
const RESULT_PATH = CDSS_PREFIX + 'getResult';
const SAVE_SYMPTOM_PATH = CDSS_PREFIX + 'saveSymptom';

const GENERIC_ERROR = 'Internal issue, please try again later.';
const TIMEOUT_ERROR =
  'The request timed out. Please check your connection and try again.';

/**
 * Max time to wait for any CDSS call before failing. Without this a hung
 * backend leaves the component's loading state stuck forever; on timeout the
 * stream errors and the component shows the (graceful) error state instead.
 */
const CDSS_TIMEOUT_MS = 20_000;

/**
 * Clinical Decision Support System API for the case-sheet.
 *
 * Wraps the legacy `CDSSService` calls (chief complaints, questionnaire,
 * result, save) on the 104 API base. Wire payloads (`data` envelope,
 * PascalCase keys) are normalised into the camelCase shapes the component
 * consumes. Auth headers and session-expiry are handled by the HTTP
 * interceptors; failures are normalised to a {@link CdssError}.
 */
@Injectable({ providedIn: 'root' })
export class CdssService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get baseUrl(): string {
    return this.config.get104BaseURL();
  }

  /**
   * Chief complaints applicable to a patient's age + gender (used to seed the
   * case-sheet complaint picker). Resolves to `[]` when none are returned.
   */
  getChiefComplaints(req: CdssChiefComplaintsRequest): Observable<string[]> {
    return this.http
      .post<ApiResponse<string[]>>(this.baseUrl + CHIEF_COMPLAINTS_PATH, req)
      .pipe(
        timeout(CDSS_TIMEOUT_MS),
        map((res) => this.readData(res) ?? []),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /**
   * Load the questionnaire for a chief complaint. The returned `id` is the
   * `complaintId` passed back to {@link getResult}. Resolves to a questionnaire
   * with an empty `questions` array when the backend has none.
   */
  getQuestions(patient: CdssPatientContext): Observable<CdssQuestionnaire> {
    return this.http
      .post<ApiResponse<RawCdssQuestionSet>>(this.baseUrl + QUESTIONS_PATH, patient)
      .pipe(
        timeout(CDSS_TIMEOUT_MS),
        map((res) => this.normaliseQuestionnaire(this.readData(res))),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /**
   * Suggested diagnoses (with advice) for a picked question. Resolves to `[]`
   * when the backend returns no diagnoses.
   */
  getResult(selection: CdssQuestionSelection): Observable<CdssDiagnosis[]> {
    return this.http
      .post<ApiResponse<RawCdssDiagnosis[]>>(this.baseUrl + RESULT_PATH, selection)
      .pipe(
        timeout(CDSS_TIMEOUT_MS),
        map((res) => (this.readData(res) ?? []).map((d) => this.normaliseDiagnosis(d))),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /**
   * Persist a selected symptom (legacy `saveSymptom`). Kept for parity with the
   * legacy service; resolves to the backend `data` payload.
   */
  saveSymptom(payload: unknown): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(this.baseUrl + SAVE_SYMPTOM_PATH, payload)
      .pipe(
        timeout(CDSS_TIMEOUT_MS),
        map((res) => this.readData(res)),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Normalise a raw questionnaire; drops questions without text. */
  private normaliseQuestionnaire(raw: RawCdssQuestionSet | undefined): CdssQuestionnaire {
    return {
      id: raw?.id ?? 0,
      disease: (raw?.disease ?? '').trim(),
      questions: (raw?.Questions ?? [])
        .map((q) => ({
          question: (q.question ?? '').trim(),
          isEmergency: q.isEmergency === true,
        }))
        .filter((q) => q.question.length > 0),
    };
  }

  /** Normalise a raw diagnosis into camelCase, coercing absent arrays to `[]`. */
  private normaliseDiagnosis(raw: RawCdssDiagnosis): CdssDiagnosis {
    return {
      disease: (raw.Disease ?? '').trim(),
      symptoms: this.cleanList(raw.Symptoms),
      information: this.cleanList(raw.Information),
      dosDonts: this.cleanList(raw.DoDonts),
      selfCare: this.cleanList(raw.SelfCare),
      action: this.cleanList(raw.Action),
    };
  }

  /** Trim entries and drop empty/blank ones from a possibly-absent string list. */
  private cleanList(list: (string | null | undefined)[] | undefined): string[] {
    return (list ?? [])
      .map((item) => (item ?? '').toString().trim())
      .filter((item) => item.length > 0);
  }

  /**
   * Read a data envelope: a non-200 status is a hard error; otherwise return
   * `data`, which may be absent (the legacy `extractData` returned `data` when
   * present). Callers handle the `undefined` case.
   */
  private readData<T>(res: ApiResponse<T>): T | undefined {
    if (res.statusCode && res.statusCode !== 200) {
      throw this.toError(res);
    }
    return res.data;
  }

  /**
   * Normalise any failure (in-body error envelope or transport error) into a
   * {@link CdssError} with the backend message when available.
   */
  private toError(err: unknown): CdssError {
    if (err instanceof TimeoutError) {
      return { status: 0, errorMessage: TIMEOUT_ERROR };
    }

    if (
      err &&
      typeof (err as CdssError).status === 'number' &&
      typeof (err as CdssError).errorMessage === 'string'
    ) {
      return err as CdssError;
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
