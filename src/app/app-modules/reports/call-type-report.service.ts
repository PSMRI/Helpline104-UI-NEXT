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

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, catchError, map, throwError } from 'rxjs';

import { ConfigService } from '../core/services/config.service';
import {
  ApiResponse,
  CallTypeGroup,
  CdiQaMapping,
  FilterCallListRequest,
  FilterCallListResponse,
  ReportError,
} from './call-type-report.models';

const GET_CALL_TYPES_PATH = 'call/getCallTypesV1';
const FILTER_CALL_LIST_PATH = 'call/filterCallListPage';
/** Legacy path verbatim, double slash included (`getCallReportsUrl`). */
const CDI_QA_MAPPING_PATH = 'beneficiary//get/CDIqamapping';

const GENERIC_ERROR = 'Internal issue, please try again later.';

/**
 * Agent Call Type (Customer Delight Index) report API. Ported from the legacy
 * `SupervisorCallTypeReportService.filterCallList/getCallTypes` and
 * `SurveyorReportsService.getCallReports`.
 */
@Injectable({ providedIn: 'root' })
export class CallTypeReportService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** Call-type groups for the service (to resolve the "valid" call type). */
  getCallTypes(providerServiceMapID: number | null): Observable<CallTypeGroup[]> {
    return this.post<CallTypeGroup[]>(this.config.getCommonBaseURL() + GET_CALL_TYPES_PATH, {
      providerServiceMapID,
    });
  }

  /** One page of the CDI worklist. */
  filterCallList(req: FilterCallListRequest): Observable<FilterCallListResponse> {
    return this.post<FilterCallListResponse>(
      this.config.getCommonBaseURL() + FILTER_CALL_LIST_PATH,
      req,
    );
  }

  /** The answered CDI questionnaire for one closed call. */
  getCallReports(
    beneficiaryRegID: number | null,
    benCallID: number | null,
  ): Observable<CdiQaMapping[]> {
    return this.post<CdiQaMapping[]>(this.config.get104BaseURL() + CDI_QA_MAPPING_PATH, {
      beneficiaryRegID,
      benCallID,
    });
  }

  private post<T>(url: string, body: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(url, body).pipe(
      map((res) => {
        if (res.statusCode && res.statusCode !== 200) {
          throw this.toError(res);
        }
        return res.data ?? ([] as unknown as T);
      }),
      catchError((err: unknown) => throwError(() => this.toError(err))),
    );
  }

  private toError(err: unknown): ReportError {
    if (
      err &&
      typeof (err as ReportError).status === 'number' &&
      typeof (err as ReportError).errorMessage === 'string'
    ) {
      return err as ReportError;
    }
    const envelope = err as ApiResponse<unknown> | undefined;
    if (envelope && typeof envelope.statusCode === 'number') {
      return {
        status: envelope.statusCode,
        errorMessage: envelope.errorMessage?.trim() || GENERIC_ERROR,
      };
    }
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { errorMessage?: string } | null;
      const message =
        body && typeof body === 'object' && typeof body.errorMessage === 'string'
          ? body.errorMessage
          : '';
      return { status: err.status, errorMessage: message.trim() || GENERIC_ERROR };
    }
    return { status: 0, errorMessage: GENERIC_ERROR };
  }
}
