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
import { ApiResponse, SnomedError, SnomedSearchRequest, SnomedSearchResponse, SnomedTerm } from './snomed.models';

/** Endpoint path (relative to the common API base), ported from CaseSheetService. */
const SNOMED_SEARCH_PATH = 'snomed/getSnomedCTRecordList';

const GENERIC_ERROR = 'Internal issue, please try again later.';
const TIMEOUT_ERROR = 'The request timed out. Please check your connection and try again.';
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * SNOMED CT term search for the case-sheet chief-complaint picker.
 *
 * Wraps the legacy `getSnomedCTRecordList` call (which the old app reached via
 * `CaseSheetService.searchDiagnosisBasedOnPageNo1`) on the common API base.
 * Auth headers and session-expiry are handled by the HTTP interceptors;
 * failures are normalised to a {@link SnomedError}.
 */
@Injectable({ providedIn: 'root' })
export class SnomedService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get baseUrl(): string {
    return this.config.getCommonBaseURL();
  }

  /**
   * Search SNOMED CT terms matching `term`. Resolves to `[]` when the backend
   * returns no matches. Concept ids are normalised to trimmed strings so large
   * SCTIDs are never truncated by JSON's numeric precision.
   *
   * @param term    the free-text chief complaint the agent typed
   * @param pageNo  zero-based page index (the endpoint is paged; the dropdown
   *                consumes the first page)
   */
  search(term: string, pageNo = 0): Observable<SnomedTerm[]> {
    const body: SnomedSearchRequest = { term, pageNo };
    return this.http.post<ApiResponse<SnomedSearchResponse>>(this.baseUrl + SNOMED_SEARCH_PATH, body).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((res) => this.readTerms(res)),
      catchError((err: unknown) => throwError(() => this.toError(err))),
    );
  }

  /**
   * Read a search envelope: a non-200 status is a hard error; an empty/absent
   * `sctMaster` means "no matches" and resolves to `[]`. Each row is normalised
   * to a {@link SnomedTerm} with trimmed string fields, rows missing an id or
   * term are dropped, and duplicate `conceptID`s are collapsed to the first
   * occurrence so the dropdown's `track conceptID` never sees a repeated key
   * (which would throw NG0955).
   */
  private readTerms(res: ApiResponse<SnomedSearchResponse>): SnomedTerm[] {
    if (res.statusCode && res.statusCode !== 200) {
      throw this.toError(res);
    }
    const rows = res.data?.sctMaster ?? [];
    const seen = new Set<string>();
    const terms: SnomedTerm[] = [];
    for (const row of rows) {
      const conceptID = String(row.conceptID ?? '').trim();
      const term = (row.term ?? '').trim();
      if (conceptID.length === 0 || term.length === 0 || seen.has(conceptID)) {
        continue;
      }
      seen.add(conceptID);
      terms.push({ conceptID, term });
    }
    return terms;
  }

  /**
   * Normalise any failure (in-body error envelope or transport error) into a
   * {@link SnomedError} with the backend message when available.
   */
  private toError(err: unknown): SnomedError {
    if (err instanceof TimeoutError) {
      return { status: 0, errorMessage: TIMEOUT_ERROR };
    }

    if (
      err &&
      typeof (err as SnomedError).status === 'number' &&
      typeof (err as SnomedError).errorMessage === 'string'
    ) {
      return err as SnomedError;
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
