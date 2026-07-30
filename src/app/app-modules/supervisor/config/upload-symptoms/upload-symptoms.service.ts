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

/** Legacy `CDSSService.saveSymp` posted to `{104 base}CDSS/saveSymptom`. */
const SAVE_SYMPTOM_PATH = 'CDSS/saveSymptom';

/** Legacy request body: the raw CDSS algorithm text under the `Msg` key. */
export interface SaveSymptomRequest {
  Msg: string | null;
}

/**
 * The envelope `data` carries a status text rather than a record, e.g.
 * `"sucess"` (legacy backend spelling) or `"Data already exist in database"`.
 */
export interface SaveSymptomResult {
  message?: string | null;
}

/**
 * Upload-symptoms API (legacy `CDSSService.saveSymp` used by
 * `InsertComplaintComponent`): submit a CDSS symptom algorithm as plain text.
 * Failures normalise to a {@link SupervisorError}.
 */
@Injectable({ providedIn: 'root' })
export class UploadSymptomsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  saveSymptom(body: SaveSymptomRequest): Observable<SaveSymptomResult | undefined> {
    return this.http
      .post<ApiResponse<SaveSymptomResult>>(this.config.get104BaseURL() + SAVE_SYMPTOM_PATH, body)
      .pipe(
        timeout(SUPERVISOR_TIMEOUT_MS),
        map((res) => readSupervisorData(res)),
        catchError((err: unknown) => throwError(() => toSupervisorError(err))),
      );
  }
}
