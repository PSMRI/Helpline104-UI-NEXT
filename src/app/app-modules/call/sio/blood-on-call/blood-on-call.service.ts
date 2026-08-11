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
import {
  BloodBankUrlData,
  BloodComponentType,
  BloodGroup,
  BloodRequestRow,
  SaveBloodRequest,
} from './blood-on-call.models';

const COMPONENT_TYPES_PATH = 'beneficiary/get/bloodComponentTypes';
const BLOOD_GROUPS_PATH = 'beneficiary/get/bloodGroups';
const HISTORY_PATH = 'beneficiary/get/bloodRequestDetails';
const SAVE_PATH = 'beneficiary/save/bloodRequestDetails';
const BANK_URL_PATH = 'beneficiary/get/bloodBankURL';

/**
 * Blood-on-Call API (104 base): component types, blood groups, the blood-bank
 * reference URL, the request history and the save. Failures normalise to a
 * {@link SioError}.
 */
@Injectable({ providedIn: 'root' })
export class BloodOnCallService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  getComponentTypes(): Observable<BloodComponentType[]> {
    return this.http
      .post<ApiResponse<BloodComponentType[]>>(this.config.get104BaseURL() + COMPONENT_TYPES_PATH, {})
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => readSioData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  getBloodGroups(): Observable<BloodGroup[]> {
    return this.http.post<ApiResponse<BloodGroup[]>>(this.config.get104BaseURL() + BLOOD_GROUPS_PATH, {}).pipe(
      timeout(SIO_TIMEOUT_MS),
      map((res) => readSioData(res) ?? []),
      catchError((err: unknown) => throwError(() => toSioError(err))),
    );
  }

  /** Blood-bank reference link for the service, if one is configured. */
  getBloodBankUrl(providerServiceMapID: number | null): Observable<string | null> {
    return this.http
      .post<ApiResponse<BloodBankUrlData>>(this.config.get104BaseURL() + BANK_URL_PATH, {
        providerServiceMapID,
      })
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => {
          const data = readSioData(res);
          return data?.bloodBankURL ?? data?.url ?? null;
        }),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  getHistory(beneficiaryRegID: number | null): Observable<BloodRequestRow[]> {
    return this.http
      .post<ApiResponse<BloodRequestRow[]>>(this.config.get104BaseURL() + HISTORY_PATH, {
        beneficiaryRegID,
        bloodReqID: null,
      })
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => readSioData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  saveRequest(payload: SaveBloodRequest): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(this.config.get104BaseURL() + SAVE_PATH, payload).pipe(
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
