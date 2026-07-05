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
  Designation,
  FeedbackNature,
  GrievanceCategory,
  GrievanceRow,
  GrievanceSubCategory,
  NatureOfComplaintRow,
  SaveGrievanceRequest,
  Severity,
} from './grievance.models';

const NATURE_PATH = 'beneficiary/get/natureOfComplaintTypes';
const CATEGORIES_PATH = 'category/categories';
const SUB_CATEGORIES_PATH = 'service/subcategory';
const SEVERITY_PATH = 'feedback/getSeverity';
const DESIGNATIONS_PATH = 'institute/getDesignations';
const SAVE_PATH = 'beneficiary/saveBenFeedback';
const HISTORY_PATH = 'feedback/getFeedbacksList';

/**
 * Grievance / Feedback API: nature-of-complaint (104 base), the
 * category / sub-category / severity / designation masters (common base), the
 * grievance history (common base) and the save (104 base). Failures normalise
 * to a {@link SioError}.
 */
@Injectable({ providedIn: 'root' })
export class GrievanceService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** Nature-of-complaint options, flattened from each item's `m_feedbackNature`. */
  getNatureOfComplaints(providerServiceMapID: number | null): Observable<FeedbackNature[]> {
    return this.http
      .post<ApiResponse<NatureOfComplaintRow[]>>(this.config.get104BaseURL() + NATURE_PATH, {
        providerServiceMapID,
      })
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => {
          const rows = readSioData(res) ?? [];
          return rows.flatMap((row) => row.m_feedbackNature ?? []);
        }),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  getCategories(
    providerServiceMapID: number | null,
    feedbackNatureID: number,
  ): Observable<GrievanceCategory[]> {
    return this.http
      .post<ApiResponse<GrievanceCategory[]>>(this.config.getCommonBaseURL() + CATEGORIES_PATH, {
        providerServiceMapID,
        feedbackNatureID,
      })
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => readSioData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  getSubCategories(categoryID: number): Observable<GrievanceSubCategory[]> {
    return this.http
      .post<ApiResponse<GrievanceSubCategory[]>>(
        this.config.getCommonBaseURL() + SUB_CATEGORIES_PATH,
        { categoryID },
      )
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => readSioData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  getSeverity(): Observable<Severity[]> {
    return this.http
      .post<ApiResponse<Severity[]>>(this.config.getCommonBaseURL() + SEVERITY_PATH, {})
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => readSioData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  /** Designation master (common base, GET, no body). */
  getDesignations(): Observable<Designation[]> {
    return this.http
      .get<ApiResponse<Designation[]>>(this.config.getCommonBaseURL() + DESIGNATIONS_PATH)
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => readSioData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  getHistory(
    beneficiaryRegID: number | null,
    serviceID: number | null,
  ): Observable<GrievanceRow[]> {
    return this.http
      .post<ApiResponse<GrievanceRow[]>>(this.config.getCommonBaseURL() + HISTORY_PATH, {
        beneficiaryRegID,
        serviceID,
      })
      .pipe(
        timeout(SIO_TIMEOUT_MS),
        map((res) => readSioData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSioError(err))),
      );
  }

  /** Persist a grievance. The API expects a one-element array of the feedback object. */
  saveGrievance(payload: SaveGrievanceRequest): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(this.config.get104BaseURL() + SAVE_PATH, [payload])
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
