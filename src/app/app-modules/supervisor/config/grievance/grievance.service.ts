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
import {
  Designation,
  EmailStatus,
  FeedbackLog,
  FeedbackNature,
  FeedbackRow,
  FeedbackStatus,
  FeedbackType,
  InstituteName,
  InstituteType,
  NatureOfComplaintRow,
  SaveFeedbackRequest,
  Severity,
} from './grievance.models';

const FEEDBACK_LIST_PATH = 'feedback/getFeedbacksList';
const FEEDBACK_STATUS_PATH = 'feedback/getFeedbackStatus';
const EMAIL_STATUS_PATH = 'feedback/getEmailStatus';
const SAVE_REQUEST_PATH = 'feedback/saveFeedbackRequest';
const UPDATE_RESPONSE_PATH = 'feedback/updateResponse';
const FEEDBACK_TYPE_PATH = 'feedback/getFeedbackType';
const SEVERITY_PATH = 'feedback/getSeverity';
const FEEDBACK_LOGS_PATH = 'feedback/getFeedbackLogs';
const INSTITUTE_TYPES_PATH = 'institute/getInstituteTypes';
const INSTITUTE_NAME_PATH = 'institute/getInstituteName/';
const DESIGNATIONS_PATH = 'institute/getDesignations';
const AUTHORITY_EMAILS_PATH = 'emailController/getAuthorityEmailID';
const SEND_EMAIL_PATH = 'emailController/SendEmail';
const NATURE_PATH = 'beneficiary/get/natureOfComplaintTypes';

/** `institute/getDesignations` nests its list one level deeper (`data.data`). */
interface DesignationEnvelope {
  data?: Designation[];
}

/** Search criteria for the grievance list (`feedback/getFeedbacksList`). */
export interface FeedbackListCriteria {
  serviceID: number | null;
  /** Offset-adjusted ISO strings (legacy `updateTimeOffset`). */
  startDate?: string;
  endDate?: string;
  requestID?: string;
  feedbackTypeID?: number;
}

/**
 * Supervisor grievance-tracking API, ported from the legacy `FeedbackService`
 * (supervisorServices), `FeedbackTypes`, `LocationService` (institute lookups)
 * and `CoFeedbackService` (designations). Failures normalise to a
 * {@link SupervisorError}.
 */
@Injectable({ providedIn: 'root' })
export class SupervisorGrievanceService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** Grievances for the service within a date range (common base). */
  getFeedbackList(criteria: FeedbackListCriteria): Observable<FeedbackRow[]> {
    return this.post<FeedbackRow[]>(this.config.getCommonBaseURL() + FEEDBACK_LIST_PATH, {
      serviceID: criteria.serviceID,
      startDate: criteria.startDate,
      endDate: criteria.endDate,
      requestID: criteria.requestID,
      feedbackTypeID: criteria.feedbackTypeID,
    }).pipe(map((data) => data ?? []));
  }

  getFeedbackStatuses(): Observable<FeedbackStatus[]> {
    return this.post<FeedbackStatus[]>(
      this.config.getCommonBaseURL() + FEEDBACK_STATUS_PATH,
      {},
    ).pipe(map((data) => data ?? []));
  }

  getEmailStatuses(): Observable<EmailStatus[]> {
    return this.post<EmailStatus[]>(this.config.getCommonBaseURL() + EMAIL_STATUS_PATH, {}).pipe(
      map((data) => data ?? []),
    );
  }

  /** Forward a grievance (edit flow) — `feedback/saveFeedbackRequest`. */
  saveFeedbackRequest(body: SaveFeedbackRequest): Observable<unknown> {
    return this.post<unknown>(this.config.getCommonBaseURL() + SAVE_REQUEST_PATH, body);
  }

  /** Record a response against a grievance (update flow) — `feedback/updateResponse`. */
  updateResponse(body: SaveFeedbackRequest): Observable<unknown> {
    return this.post<unknown>(this.config.getCommonBaseURL() + UPDATE_RESPONSE_PATH, body);
  }

  /** Grievance type master for the service. */
  getFeedbackTypes(providerServiceMapID: number | null): Observable<FeedbackType[]> {
    return this.post<FeedbackType[]>(this.config.getCommonBaseURL() + FEEDBACK_TYPE_PATH, {
      providerServiceMapID,
    }).pipe(map((data) => data ?? []));
  }

  getSeverities(providerServiceMapID: number | null): Observable<Severity[]> {
    return this.post<Severity[]>(this.config.getCommonBaseURL() + SEVERITY_PATH, {
      providerServiceMapID,
    }).pipe(map((data) => data ?? []));
  }

  /** Change log for a grievance. The API takes the raw feedbackID as the body. */
  getFeedbackLogs(feedbackID: number): Observable<FeedbackLog[]> {
    return this.post<FeedbackLog[]>(
      this.config.getCommonBaseURL() + FEEDBACK_LOGS_PATH,
      feedbackID,
    ).pipe(map((data) => data ?? []));
  }

  getInstituteTypes(providerServiceMapID: number | null): Observable<InstituteType[]> {
    return this.post<InstituteType[]>(this.config.getCommonBaseURL() + INSTITUTE_TYPES_PATH, {
      providerServiceMapID,
    }).pipe(map((data) => data ?? []));
  }

  /** Institution names for a type (common base, GET with the id on the path). */
  getInstituteNames(institutionTypeID: number): Observable<InstituteName[]> {
    return this.http
      .get<ApiResponse<InstituteName[]>>(
        this.config.getCommonBaseURL() + INSTITUTE_NAME_PATH + institutionTypeID,
      )
      .pipe(
        timeout(SUPERVISOR_TIMEOUT_MS),
        map((res) => readSupervisorData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSupervisorError(err))),
      );
  }

  /**
   * Designation master (common base, GET). The legacy screen read the list from
   * `data.data`, so unwrap the inner envelope when present.
   */
  getDesignations(): Observable<Designation[]> {
    return this.http
      .get<ApiResponse<DesignationEnvelope | Designation[]>>(
        this.config.getCommonBaseURL() + DESIGNATIONS_PATH,
      )
      .pipe(
        timeout(SUPERVISOR_TIMEOUT_MS),
        map((res) => {
          const data = readSupervisorData(res);
          if (Array.isArray(data)) {
            return data;
          }
          return data?.data ?? [];
        }),
        catchError((err: unknown) => throwError(() => toSupervisorError(err))),
      );
  }

  /** Authority email ids for the beneficiary's district. */
  getAuthorityEmails(districtID: number | null): Observable<string[]> {
    return this.post<string[]>(this.config.getCommonBaseURL() + AUTHORITY_EMAILS_PATH, {
      districtID,
    }).pipe(map((data) => data ?? []));
  }

  /** Send the grievance email to the selected addresses (comma-joined). */
  sendEmail(feedbackID: number, emailID: string): Observable<unknown> {
    return this.post<unknown>(this.config.getCommonBaseURL() + SEND_EMAIL_PATH, {
      FeedbackID: feedbackID,
      emailID,
      is1097: false,
    });
  }

  /** Nature-of-complaint options for a grievance type (104 base), flattened. */
  getNatureOfComplaints(
    providerServiceMapID: number | null,
    feedbackTypeID: number,
  ): Observable<FeedbackNature[]> {
    return this.http
      .post<ApiResponse<NatureOfComplaintRow[]>>(this.config.get104BaseURL() + NATURE_PATH, {
        providerServiceMapID,
        feedbackTypeID,
      })
      .pipe(
        timeout(SUPERVISOR_TIMEOUT_MS),
        map((res) => {
          const rows = readSupervisorData(res) ?? [];
          return rows.flatMap((row) => row.m_feedbackNature ?? []);
        }),
        catchError((err: unknown) => throwError(() => toSupervisorError(err))),
      );
  }

  private post<T>(url: string, body: unknown): Observable<T | undefined> {
    return this.http.post<ApiResponse<T>>(url, body).pipe(
      timeout(SUPERVISOR_TIMEOUT_MS),
      map((res) => readSupervisorData(res)),
      catchError((err: unknown) => throwError(() => toSupervisorError(err))),
    );
  }
}
