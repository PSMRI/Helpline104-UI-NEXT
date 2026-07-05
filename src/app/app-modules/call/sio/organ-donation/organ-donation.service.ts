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
  DonatableOrgan,
  DonationType,
  OrganDonationRow,
  SaveOrganDonationRequest,
} from './organ-donation.models';

const DONATION_TYPES_PATH = 'beneficiary/get/organDonationTypes';
const DONATABLE_ORGANS_PATH = 'beneficiary/get/DonatableOrgans';
const HISTORY_PATH = 'beneficiary/get/organDonationRequestDetails';
const SAVE_PATH = 'beneficiary/save/organDonationRequestDetails';

/**
 * Organ Donation API (104 base): donation types, donatable organs, the request
 * history and the save. Failures normalise to a {@link SioError}.
 */
@Injectable({ providedIn: 'root' })
export class OrganDonationService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  getDonationTypes(): Observable<DonationType[]> {
    return this.http
      .post<ApiResponse<DonationType[]>>(this.config.get104BaseURL() + DONATION_TYPES_PATH, {})
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => readSioData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  getDonatableOrgans(): Observable<DonatableOrgan[]> {
    return this.http
      .post<ApiResponse<DonatableOrgan[]>>(this.config.get104BaseURL() + DONATABLE_ORGANS_PATH, {})
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => readSioData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  getHistory(beneficiaryRegID: number | null): Observable<OrganDonationRow[]> {
    return this.http
      .post<ApiResponse<OrganDonationRow[]>>(this.config.get104BaseURL() + HISTORY_PATH, {
        beneficiaryRegID: String(beneficiaryRegID),
      })
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => readSioData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  saveRequest(payload: SaveOrganDonationRequest): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(this.config.get104BaseURL() + SAVE_PATH, payload)
      .pipe(
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
