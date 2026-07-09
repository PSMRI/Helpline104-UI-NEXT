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
import { SaveSchemeRequest, SchemeRow } from './upload-schemes.models';

const SCHEME_LIST_PATH = 'beneficiary/get/schemeList';
const SAVE_SCHEME_PATH = 'beneficiary/save/schemeDetails';
const DELETE_SCHEME_PATH = 'beneficiary/scheme/deleteScheme';

/**
 * Upload-schemes API (legacy `SchemeService`, common base): scheme list, save
 * (create/modify with an inline base64 attachment) and activate/deactivate.
 * Failures normalise to a {@link SupervisorError}.
 */
@Injectable({ providedIn: 'root' })
export class UploadSchemesService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  getSchemeList(providerServiceMapID: number | null): Observable<SchemeRow[]> {
    return this.post<SchemeRow[]>(SCHEME_LIST_PATH, { providerServiceMapID }).pipe(
      map((data) => data ?? []),
    );
  }

  saveScheme(body: SaveSchemeRequest): Observable<unknown> {
    return this.post<unknown>(SAVE_SCHEME_PATH, body);
  }

  /** Activate / deactivate a scheme via its `deleted` flag. */
  setDeleted(schemeID: number, deleted: boolean): Observable<unknown> {
    return this.post<unknown>(DELETE_SCHEME_PATH, { schemeID, deleted });
  }

  private post<T>(path: string, body: unknown): Observable<T | undefined> {
    return this.http.post<ApiResponse<T>>(this.config.getCommonBaseURL() + path, body).pipe(
      timeout(SUPERVISOR_TIMEOUT_MS),
      map((res) => readSupervisorData(res)),
      catchError((err: unknown) => throwError(() => toSupervisorError(err))),
    );
  }
}
