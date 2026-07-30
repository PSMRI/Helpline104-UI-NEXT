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
  MctsCallRow,
  MctsQaRow,
  MmuVisitRow,
  OtherHelplineError,
} from './other-helpline.models';

const MCTS_HISTORY_PATH = 'mctsOutboundHistoryController/getMctsCallHistory';
const MCTS_RESPONSE_PATH = 'mctsOutboundHistoryController/getMctsCallResponse';
const MMU_CASESHEET_PATH = 'common/getBeneficiaryCaseSheetHistory';

const GENERIC_ERROR = 'Internal issue, please try again later.';
const TIMEOUT_ERROR = 'The request timed out. Please check your connection and try again.';
const HISTORY_TIMEOUT_MS = 20_000;

/**
 * Case-sheet history from other AMRIT helplines, shared by the MCTS and MMU
 * history tabs. MCTS lookups use the common API; MMU/TM case-sheet history uses
 * the MMU or TM API base depending on `isTm`. The `{ data }` envelope is
 * unwrapped; failures normalise to an {@link OtherHelplineError}.
 */
@Injectable({ providedIn: 'root' })
export class OtherHelplineService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** MCTS outbound-call history for a beneficiary (common API). */
  getMctsCallHistory(beneficiaryRegID: number | null): Observable<MctsCallRow[]> {
    return this.http
      .post<ApiResponse<MctsCallRow[]>>(this.config.getCommonBaseURL() + MCTS_HISTORY_PATH, {
        beneficiaryRegID,
      })
      .pipe(
        timeout(HISTORY_TIMEOUT_MS),
        map((res) => this.readData(res) ?? []),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Question/answer detail for one MCTS call (common API). */
  getMctsCallResponse(callDetailID: number): Observable<MctsQaRow[]> {
    return this.http
      .post<ApiResponse<MctsQaRow[]>>(this.config.getCommonBaseURL() + MCTS_RESPONSE_PATH, {
        callDetailID,
      })
      .pipe(
        timeout(HISTORY_TIMEOUT_MS),
        map((res) => this.readData(res) ?? []),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /**
   * MMU (or TM, when `isTm`) beneficiary case-sheet visit history. Resolves to
   * `[]` when none are found.
   */
  getMmuBenCasesheet(beneficiaryRegID: number | null, isTm: boolean): Observable<MmuVisitRow[]> {
    const base = isTm ? this.config.getTMBaseURL() : this.config.getMMUBaseURL();
    return this.http
      .post<ApiResponse<MmuVisitRow[]>>(base + MMU_CASESHEET_PATH, {
        beneficiaryRegID,
      })
      .pipe(
        timeout(HISTORY_TIMEOUT_MS),
        map((res) => this.readData(res) ?? []),
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

  /** Normalise any failure into an {@link OtherHelplineError}. */
  private toError(err: unknown): OtherHelplineError {
    if (err instanceof TimeoutError) {
      return { status: 0, errorMessage: TIMEOUT_ERROR };
    }

    if (
      err &&
      typeof (err as OtherHelplineError).status === 'number' &&
      typeof (err as OtherHelplineError).errorMessage === 'string'
    ) {
      return err as OtherHelplineError;
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
