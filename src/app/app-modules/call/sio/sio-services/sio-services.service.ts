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
import { SioHistoryData } from './sio-services.models';

const SIO_HISTORY_PATH = 'beneficiary/getSioHistory';

/**
 * Consolidated SIO services history API (104 base). Returns the beneficiary's
 * prior blood / epidemic / food-safety / organ-donation records in one call.
 * Failures normalise to a {@link SioError}.
 */
@Injectable({ providedIn: 'root' })
export class SioServicesHistoryService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /**
   * SIO history for a beneficiary. The legacy contract misspells the request key
   * as `benificiaryRegID`; it is preserved so the backend matches.
   */
  getHistory(beneficiaryRegID: number | null): Observable<SioHistoryData> {
    return this.http
      .post<ApiResponse<SioHistoryData>>(this.config.get104BaseURL() + SIO_HISTORY_PATH, {
        benificiaryRegID: beneficiaryRegID,
      })
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => readSioData(res) ?? {}),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }
}
