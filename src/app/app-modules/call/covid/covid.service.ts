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
  CovidError,
  CovidMasterData,
  SaveCovidRequest,
} from './covid.models';

const MASTER_PATH = 'master/patient/covidDetails/';
const SAVE_PATH = 'master/save/covidScreeningData';

const GENERIC_ERROR = 'Internal issue, please try again later.';
const TIMEOUT_ERROR =
  'The request timed out. Please check your connection and try again.';
const COVID_TIMEOUT_MS = 20_000;

/**
 * COVID-19 screening API (104 base): master data + save. Failures normalise to
 * a {@link CovidError}.
 */
@Injectable({ providedIn: 'root' })
export class CovidService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** COVID master data for the service (categories, symptoms, conditions…). */
  getCovidMasterData(providerServiceMapID: number | null): Observable<CovidMasterData> {
    return this.http
      .get<ApiResponse<CovidMasterData>>(
        this.config.get104BaseURL() + MASTER_PATH + providerServiceMapID,
      )
      .pipe(
        timeout(COVID_TIMEOUT_MS),
        map((res) => this.readData(res) ?? {}),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Save a COVID screening; resolves to the backend payload (truthy on success). */
  saveCovidData(payload: SaveCovidRequest): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(this.config.get104BaseURL() + SAVE_PATH, payload)
      .pipe(
        timeout(COVID_TIMEOUT_MS),
        map((res) => {
          if (res.statusCode && res.statusCode !== 200) {
            throw this.toError(res);
          }
          return res.data ?? res;
        }),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  private readData<T>(res: ApiResponse<T>): T | undefined {
    if (res.statusCode && res.statusCode !== 200) {
      throw this.toError(res);
    }
    return res.data;
  }

  private toError(err: unknown): CovidError {
    if (err instanceof TimeoutError) {
      return { status: 0, errorMessage: TIMEOUT_ERROR };
    }

    if (
      err &&
      typeof (err as CovidError).status === 'number' &&
      typeof (err as CovidError).errorMessage === 'string'
    ) {
      return err as CovidError;
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
