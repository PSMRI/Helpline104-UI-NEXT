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
import { DiseaseSummaryItem, DiseaseSummaryPage } from '../../reports/reports.models';

const DISEASE_LIST_PATH = 'diseaseController/getDisease';
const DISEASE_SAVE_PATH = 'diseaseController/saveDisease';
const DISEASE_UPDATE_PATH = 'diseaseController/updateDisease';
const DISEASE_DELETE_PATH = 'diseaseController/deleteDisease';

/**
 * One new disease entry for `diseaseController/saveDisease` (array body).
 * The ten content fields use the legacy `$`-separated line encoding with a
 * leading `$` (empty string when the section has no content).
 */
export interface DiseaseSaveRequest {
  diseaseName: string;
  summary: string;
  couldbedangerous: string;
  causes: string;
  dos_donts: string;
  symptoms_Signs: string;
  medicaladvice: string;
  riskfactors: string;
  treatment: string;
  self_care: string;
  investigations: string;
  providerServiceMapID: number | null;
  createdBy: string | null;
}

/** Body of `diseaseController/updateDisease` — a save entry plus the row ID. */
export interface DiseaseUpdateRequest extends DiseaseSaveRequest {
  diseasesummaryID: number;
}

/**
 * Diseases Summary configuration API (legacy
 * `SupervisorDiseaseSummaryService`, 104 base URL): paged disease-summary
 * catalogue plus save / update / activate-deactivate of entries. Failures
 * normalise to a {@link SupervisorError}.
 */
@Injectable({ providedIn: 'root' })
export class DiseasesSummaryConfigService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** One page of the disease-summary catalogue (`diseaseController/getDisease`). */
  getDiseaseSummaryList(pageNo: number, pageSize: number): Observable<DiseaseSummaryPage> {
    return this.post<DiseaseSummaryPage>(DISEASE_LIST_PATH, { pageNo, pageSize }).pipe(
      map((data) => data ?? {}),
    );
  }

  /** Create disease-summary entries (`diseaseController/saveDisease`, array body). */
  saveDiseaseSummary(body: DiseaseSaveRequest[]): Observable<unknown> {
    return this.post<unknown>(DISEASE_SAVE_PATH, body);
  }

  /** Update one disease-summary entry (`diseaseController/updateDisease`). */
  updateDiseaseSummary(body: DiseaseUpdateRequest): Observable<unknown> {
    return this.post<unknown>(DISEASE_UPDATE_PATH, body);
  }

  /**
   * Activate / deactivate an entry (`diseaseController/deleteDisease`): the
   * legacy screen POSTs the row object with a `deleted` flag merged in.
   */
  setDeleted(item: DiseaseSummaryItem, deleted: boolean): Observable<unknown> {
    return this.post<unknown>(DISEASE_DELETE_PATH, { ...item, deleted });
  }

  private post<T>(path: string, body: unknown): Observable<T | undefined> {
    return this.http.post<ApiResponse<T>>(this.config.get104BaseURL() + path, body).pipe(
      timeout(SUPERVISOR_TIMEOUT_MS),
      map((res) => readSupervisorData(res)),
      catchError((err: unknown) => throwError(() => toSupervisorError(err))),
    );
  }
}
