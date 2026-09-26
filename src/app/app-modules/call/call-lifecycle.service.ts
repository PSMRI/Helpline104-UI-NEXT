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
import { Observable, map, timeout } from 'rxjs';

import { ConfigService } from '../core/services/config.service';

import { BeneficiaryRecord } from './beneficiary/beneficiary.models';
import {
  ApiResponse,
  BeneficiaryByCallIdRequest,
  BeneficiaryByCallIdResponse,
  StartCallRequest,
  StartCallResponse,
} from './call-lifecycle.models';

const START_CALL_PATH = 'call/startCall';
const BENEFICIARY_BY_CALL_ID_PATH = 'call/beneficiaryByCallID';
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Registers an inbound call with the backend and resolves the real AMRIT
 * call id (legacy `storeCallID`). Every other call-lifecycle request
 * (`closeCall`, `transferCall`, `saveCaseSheet`) sends this id, falling back
 * to the CTI session id when it hasn't resolved yet.
 */
@Injectable({ providedIn: 'root' })
export class CallLifecycleService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  startCall(request: StartCallRequest): Observable<StartCallResponse> {
    return this.http.post<ApiResponse<StartCallResponse>>(this.config.getCommonBaseURL() + START_CALL_PATH, request).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((res) => res.data ?? { benCallID: '' }),
    );
  }

  /**
   * The beneficiary an earlier leg of this call identified (legacy
   * `getBeneficiaryByCallID`), or `null` when the call has none yet — the
   * backend answers `{ response: "null" }` rather than an empty envelope.
   */
  beneficiaryByCallID(callID: string): Observable<BeneficiaryRecord | null> {
    const request: BeneficiaryByCallIdRequest = { callID, is1097: false };
    return this.http
      .post<ApiResponse<BeneficiaryByCallIdResponse>>(this.config.getCommonBaseURL() + BENEFICIARY_BY_CALL_ID_PATH, request)
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        map((res) => res.data?.i_beneficiary ?? null),
      );
  }
}
