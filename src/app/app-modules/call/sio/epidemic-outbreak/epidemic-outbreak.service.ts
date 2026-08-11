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
  EpidemicComplaintRow,
  NatureOfComplaint,
  NatureOfComplaintRow,
  SaveEpidemicComplaint,
} from './epidemic-outbreak.models';

const NATURE_TYPES_PATH = 'beneficiary/get/natureOfComplaintTypes';
const HISTORY_PATH = 'beneficiary/get/epidemicOutbreakComplaint';
const SAVE_PATH = 'beneficiary/save/epidemicOutbreakComplaint';

/**
 * Epidemic-Outbreak API (104 base): the nature-of-complaint master, the
 * complaint history and the save. Failures normalise to a {@link SioError}.
 */
@Injectable({ providedIn: 'root' })
export class EpidemicOutbreakService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /**
   * Nature-of-complaint options. Each raw row wraps the option in
   * `m_feedbackNature[0]`, so the list is flattened to `{feedbackNatureID, feedbackNature}`.
   */
  getNatureOfComplaints(providerServiceMapID: number | null): Observable<NatureOfComplaint[]> {
    return this.http
      .post<ApiResponse<NatureOfComplaintRow[]>>(this.config.get104BaseURL() + NATURE_TYPES_PATH, {
        providerServiceMapID,
      })
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => {
          const rows = readSioData(res) ?? [];
          return rows.map((row) => row.m_feedbackNature?.[0]).filter((n): n is NatureOfComplaint => n != null);
        }),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  getHistory(beneficiaryRegID: number | null): Observable<EpidemicComplaintRow[]> {
    return this.http
      .post<ApiResponse<EpidemicComplaintRow[]>>(this.config.get104BaseURL() + HISTORY_PATH, {
        beneficiaryRegID,
      })
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => readSioData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  saveComplaint(payload: SaveEpidemicComplaint): Observable<unknown> {
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
