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

import { ApiResponse, StartCallRequest, StartCallResponse } from './call-lifecycle.models';

const START_CALL_PATH = 'call/startCall';
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
}
