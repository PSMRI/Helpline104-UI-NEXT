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
import { Observable, catchError, map, throwError } from 'rxjs';

import { ConfigService } from '../../core/services/config.service';
import { ApiResponse, HihlError, HihlHistoryRow, HihlMasterData, HihlSaveRequest } from './hihl-case-sheet.models';

const MASTERS_PATH = 'hihl/get/masters';
const SAVE_PATH = 'hihl/save/casesheet';
const HISTORY_PATH = 'hihl/getHihlCasesheetHistoryInfo/';

const GENERIC_ERROR = 'Internal issue, please try again later.';

@Injectable({ providedIn: 'root' })
export class HihlCaseSheetService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get baseUrl(): string {
    return this.config.get104BaseURL();
  }

  getMasterData(): Observable<HihlMasterData> {
    return this.http.get<ApiResponse<HihlMasterData>>(this.baseUrl + MASTERS_PATH).pipe(
      map((res) => res.data ?? {}),
      catchError((err: unknown) => throwError(() => this.toError(err))),
    );
  }

  saveCaseSheet(request: HihlSaveRequest): Observable<void> {
    return this.http.post<ApiResponse<unknown>>(this.baseUrl + SAVE_PATH, request).pipe(
      map(() => undefined),
      catchError((err: unknown) => throwError(() => this.toError(err))),
    );
  }

  getHistory(beneficiaryRegID: number): Observable<HihlHistoryRow[]> {
    return this.http.get<ApiResponse<HihlHistoryRow[]>>(this.baseUrl + HISTORY_PATH + beneficiaryRegID).pipe(
      map((res) => res.data ?? []),
      catchError((err: unknown) => throwError(() => this.toError(err))),
    );
  }

  private toError(err: unknown): HihlError {
    if (
      err &&
      typeof (err as HihlError).status === 'number' &&
      typeof (err as HihlError).errorMessage === 'string'
    ) {
      return err as HihlError;
    }

    if (err instanceof HttpErrorResponse) {
      const body = err.error as { errorMessage?: string } | string | null;
      const fromBody = body && typeof body === 'object' && typeof body.errorMessage === 'string' ? body.errorMessage : null;
      return { status: err.status, errorMessage: fromBody?.trim() || GENERIC_ERROR };
    }

    return { status: 0, errorMessage: GENERIC_ERROR };
  }
}
