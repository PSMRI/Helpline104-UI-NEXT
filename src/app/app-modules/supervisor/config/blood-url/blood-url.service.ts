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

const GET_URL_PATH = 'beneficiary/get/bloodBankURL';
const SAVE_URL_PATH = 'beneficiary/save/bloodBankURL';

/** Configured blood-bank URL for the service (`beneficiary/get/bloodBankURL`). */
export interface BloodBankUrl {
  institutionID?: number;
  website?: string;
}

/** Body for `beneficiary/save/bloodBankURL`. */
export interface SaveBloodBankUrlRequest {
  institutionID: number | null;
  providerServiceMapID: number | null;
  website: string | null;
  createdBy: string | null;
}

/**
 * Blood-bank URL API (legacy `BloodOnCallServices` subset, 104 base): fetch
 * and save the configured website. Failures normalise to a
 * {@link SupervisorError}.
 */
@Injectable({ providedIn: 'root' })
export class BloodUrlService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  getBloodBankUrl(providerServiceMapID: number | null): Observable<BloodBankUrl | undefined> {
    return this.post<BloodBankUrl>(GET_URL_PATH, { providerServiceMapID });
  }

  saveBloodBankUrl(body: SaveBloodBankUrlRequest): Observable<unknown> {
    return this.post<unknown>(SAVE_URL_PATH, body);
  }

  private post<T>(path: string, body: unknown): Observable<T | undefined> {
    return this.http.post<ApiResponse<T>>(this.config.get104BaseURL() + path, body).pipe(
      timeout(SUPERVISOR_TIMEOUT_MS),
      map((res) => readSupervisorData(res)),
      catchError((err: unknown) => throwError(() => toSupervisorError(err))),
    );
  }
}
