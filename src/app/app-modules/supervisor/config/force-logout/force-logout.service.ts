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
import {
  ApiResponse,
  SUPERVISOR_TIMEOUT_MS,
  readSupervisorData,
  toSupervisorError,
} from '../../shared/supervisor-api';

const FORCE_LOGOUT_PATH = 'user/forceLogout';

/** Result payload of `user/forceLogout` (the legacy checked `response`). */
export interface ForceLogoutResult {
  response?: string;
  errorMessage?: string;
}

/**
 * Force-logout API (legacy `ForceLogoutService`, common base): kick an agent
 * out by username. Failures normalise to a {@link SupervisorError}.
 */
@Injectable({ providedIn: 'root' })
export class ForceLogoutService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  forceLogout(
    userName: string,
    providerServiceMapID: number | null,
  ): Observable<ForceLogoutResult | undefined> {
    return this.http
      .post<ApiResponse<ForceLogoutResult>>(this.config.getCommonBaseURL() + FORCE_LOGOUT_PATH, {
        userName,
        providerServiceMapID,
      })
      .pipe(
        timeout(SUPERVISOR_TIMEOUT_MS),
        map((res) => readSupervisorData(res)),
        catchError((err: unknown) => throwError(() => toSupervisorError(err))),
      );
  }
}
