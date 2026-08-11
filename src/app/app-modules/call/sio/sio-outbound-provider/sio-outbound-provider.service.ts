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
import { BloodRequestDetail, SaveBloodBankRequest } from './sio-outbound-provider.models';

const REQUEST_DETAIL_PATH = 'beneficiary/get/bloodRequestDetails';
const SAVE_BANK_PATH = 'beneficiary/save/bloodBankDetails';

/**
 * SIO outbound blood-bank provider API (104 base): fetch the blood request under
 * fulfilment and save the blood-bank provider contact. Failures normalise to a
 * {@link SioError}.
 */
@Injectable({ providedIn: 'root' })
export class SioOutboundProviderService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** The blood request to fulfil (first row for the beneficiary + request id). */
  getBloodRequest(
    beneficiaryRegID: number | null,
    bloodReqID: number | string | null,
  ): Observable<BloodRequestDetail | null> {
    return this.http
      .post<ApiResponse<BloodRequestDetail[]>>(this.config.get104BaseURL() + REQUEST_DETAIL_PATH, {
        beneficiaryRegID,
        bloodReqID,
      })
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => readSioData(res)?.[0] ?? null),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  /** Save the blood-bank provider contact for the request. */
  saveBloodBankDetails(payload: SaveBloodBankRequest): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(this.config.get104BaseURL() + SAVE_BANK_PATH, payload).pipe(
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
