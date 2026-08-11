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

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError, timeout } from 'rxjs';

import { ConfigService } from '../../../core/services/config.service';
import { ApiResponse, SIO_TIMEOUT_MS, readSioData, toSioError } from '../shared/sio-api';
import { SaveSchemeSearch, Scheme, SchemeSearchRow } from './scheme.models';

const SCHEME_LIST_PATH = 'beneficiary/get/schemeList';
const SAVE_HISTORY_PATH = 'beneficiary/save/schemeSearchHistory';
const HISTORY_PATH = 'beneficiary/getSchemeSearchHistory';

/**
 * Health Scheme lookup API: the scheme list lives on the COMMON base, while the
 * per-beneficiary search history (save + read) lives on the 104 base. Failures
 * normalise to a {@link SioError}.
 */
@Injectable({ providedIn: 'root' })
export class SchemeService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  getSchemes(providerServiceMapID: number | null): Observable<Scheme[]> {
    return this.http
      .post<ApiResponse<Scheme[]>>(this.config.getCommonBaseURL() + SCHEME_LIST_PATH, {
        providerServiceMapID,
      })
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => readSioData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  getHistory(beneficiaryRegID: number | null): Observable<SchemeSearchRow[]> {
    return this.http
      .post<ApiResponse<SchemeSearchRow[]>>(this.config.get104BaseURL() + HISTORY_PATH, {
        beneficiaryRegID,
      })
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => readSioData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  /** Records that the beneficiary availed a scheme (body is an array of one entry). */
  saveSearch(payload: SaveSchemeSearch): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(this.config.get104BaseURL() + SAVE_HISTORY_PATH, [payload]).pipe(
      timeout(SIO_TIMEOUT_MS),
      map((res) => {
        if (res.statusCode && res.statusCode !== 200) {
          throw toSioError(res);
        }
        return res.data ?? res;
      }),
      catchError((err: unknown) => throwError(() => toSioError(err))),
    );
  }
}
