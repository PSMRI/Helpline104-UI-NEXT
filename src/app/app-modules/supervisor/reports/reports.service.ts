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

import { ConfigService } from '../../core/services/config.service';
import { ApiResponse, readSupervisorData, toSupervisorError } from '../shared/supervisor-api';
import {
  AgentOption,
  CallTypeGroup,
  CallTypeOption,
  ComplaintDetailRequest,
  DiseaseSummaryPage,
  DistrictOption,
  FeedbackNatureOption,
  FeedbackTypeOption,
  QaReportType,
  RoleOption,
  SubDistrictOption,
  SubServiceOption,
  VillageOption,
  WorkLocationOption,
} from './reports.models';

/**
 * Report generation is slow on the server (it builds the whole workbook), so
 * these downloads get a longer timeout than the 20s lookup calls.
 */
const REPORT_TIMEOUT_MS = 120_000;
const LOOKUP_TIMEOUT_MS = 20_000;

// --- Common-API paths (legacy `ReportService`, `_commonBaseUrl`) ------------
const CALL_QUALITY_REPORT_PATH = 'crmReports/getCallQualityReport';
const QUALITY_REPORT_PATH = 'crmReports/getQualityReport';
const CALL_SUMMARY_REPORT_PATH = 'crmReports/getCallSummaryReport';
const COMPLAINT_DETAIL_REPORT_PATH = 'crmReports/getComplaintDetailReport';
const DISTRICT_WISE_CALL_REPORT_PATH = 'crmReports/getDistrictWiseCallReport';
const UNBLOCKED_USER_REPORT_PATH = 'crmReports/getUnblockedUserReport';
const REPORT_TYPES_PATH = 'crmReports/getReportTypes/';
const FEEDBACK_TYPES_PATH = 'feedback/getFeedbackType';
const CALL_TYPES_PATH = 'call/getCallTypes';
const CALL_TYPES_V1_PATH = 'call/getCallTypesV1';
const AGENTS_PATH = 'user/getAgentByRoleID';
const WORK_LOCATIONS_PATH = 'user/getLocationsByProviderID';
const ROLES_PATH = 'user/getRolesByProviderID';
const DISTRICTS_PATH = 'location/districts/';
const SUB_DISTRICTS_PATH = 'location/taluks/';
const VILLAGES_PATH = 'location/village/';

// --- 104-API paths (legacy `ReportService`, `_104baseUrl`) ------------------
const SERVICES_PATH = 'beneficiary/get/services';
const FEEDBACK_NATURE_PATH = 'beneficiary/get/natureOfComplaintTypes';
const DISEASE_LIST_PATH = 'diseaseController/getDisease';

/** Per-service call-type report endpoints (legacy `searchReports` switch). */
const CRM_104_REPORT_PATHS = {
  registration: 'crmReports/getROSummaryReportByDate',
  healthAdvisory: 'crmReports/getHAOSummaryReportByDate',
  medicalServices: 'crmReports/getMOSummaryReportByDate',
  counselling: 'crmReports/getCOSummaryReportByDate',
  psychiatrist: 'crmReports/getPDSummaryReportByDate',
  epidemic: 'crmReports/getEpidemicReportByDate',
  foodSafety: 'crmReports/getFoodSafetyReportByDate',
  bloodRequest: 'crmReports/getBloodOnCallReportByDate',
  bloodRequestDetail: 'crmReports/getBloodOnCallCountReportByDate',
  organDonation: 'crmReports/getOrganDonationReportByDate',
  grievance: 'crmReports/getGrievanceReportByDate',
  directoryServices: 'crmReports/getDirectoryServiceReportByDate',
  healthSchemes: 'crmReports/getSchemesReportByDate',
  prescription: 'crmReports/getPrescriptionReportByDate',
  mentalHealth: 'crmReports/getMentalHealthReport',
  medicalAdvise: 'crmReports/getMedicalAdviseReport',
  surveyor: 'crmReports/getCDIResponseReport',
} as const;

export type Crm104ReportKey = keyof typeof CRM_104_REPORT_PATHS;

/**
 * Supervisor reports API. Ported from the legacy `ReportService` (and the
 * disease-summary list from `SupervisorDiseaseSummaryService`): the report
 * endpoints stream a generated `.xlsx` workbook (Blob); the lookup endpoints
 * return the standard AMRIT envelope. Failures normalise to a
 * {@link import('../shared/supervisor-api').SupervisorError}.
 */
@Injectable({ providedIn: 'root' })
export class SupervisorReportsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  // --- Report downloads (xlsx blobs) --------------------------------------

  /** Call quality report (`crmReports/getCallQualityReport`, common API). */
  getCallQualityReport(body: Record<string, unknown>): Observable<Blob> {
    return this.blob(this.config.getCommonBaseURL() + CALL_QUALITY_REPORT_PATH, body);
  }

  /** QA / audit report (`crmReports/getQualityReport`, common API). */
  getQualityReport(body: Record<string, unknown>): Observable<Blob> {
    return this.blob(this.config.getCommonBaseURL() + QUALITY_REPORT_PATH, body);
  }

  /** Call summary report (`crmReports/getCallSummaryReport`, common API). */
  getCallSummaryReport(body: Record<string, unknown>): Observable<Blob> {
    return this.blob(this.config.getCommonBaseURL() + CALL_SUMMARY_REPORT_PATH, body);
  }

  /** Complaint detail report — the body is an ARRAY of requests (legacy). */
  getComplaintDetailReport(body: ComplaintDetailRequest[]): Observable<Blob> {
    return this.blob(this.config.getCommonBaseURL() + COMPLAINT_DETAIL_REPORT_PATH, body);
  }

  /** District-wise call volume report (`crmReports/getDistrictWiseCallReport`). */
  getDistrictWiseCallReport(body: Record<string, unknown>): Observable<Blob> {
    return this.blob(this.config.getCommonBaseURL() + DISTRICT_WISE_CALL_REPORT_PATH, body);
  }

  /** Unblock-user report (`crmReports/getUnblockedUserReport`, common API). */
  getUnblockedUserReport(body: Record<string, unknown>): Observable<Blob> {
    return this.blob(this.config.getCommonBaseURL() + UNBLOCKED_USER_REPORT_PATH, body);
  }

  /** One of the per-service CRM call-type reports (104 API). */
  getCrm104Report(key: Crm104ReportKey, body: unknown): Observable<Blob> {
    return this.blob(this.config.get104BaseURL() + CRM_104_REPORT_PATHS[key], body);
  }

  // --- Lookups (JSON envelopes) --------------------------------------------

  /** QA report types for the service (`crmReports/getReportTypes/{psmID}`). */
  getQaReportTypes(providerServiceMapID: number | null): Observable<QaReportType[]> {
    return this.http
      .get<
        ApiResponse<{ qaReportTypes?: QaReportType[] }>
      >(this.config.getCommonBaseURL() + REPORT_TYPES_PATH + providerServiceMapID)
      .pipe(
        timeout(LOOKUP_TIMEOUT_MS),
        map((res) => readSupervisorData(res)?.qaReportTypes ?? []),
        catchError((err: unknown) => throwError(() => toSupervisorError(err))),
      );
  }

  /** Feedback (complaint) types for the service. */
  getFeedbackTypes(providerServiceMapID: number | null): Observable<FeedbackTypeOption[]> {
    return this.lookup<FeedbackTypeOption[]>(
      this.config.getCommonBaseURL() + FEEDBACK_TYPES_PATH,
      { providerServiceMapID },
    ).pipe(map((data) => data ?? []));
  }

  /** Nature-of-complaint types for a feedback type (104 API). */
  getFeedbackNatureTypes(
    providerServiceMapID: number | null,
    feedbackTypeID: number | null | undefined,
  ): Observable<FeedbackNatureOption[]> {
    return this.lookup<FeedbackNatureOption[]>(
      this.config.get104BaseURL() + FEEDBACK_NATURE_PATH,
      { providerServiceMapID, feedbackTypeID },
    ).pipe(map((data) => data ?? []));
  }

  /** Flat call types for the service (`call/getCallTypes`). */
  getCallTypes(providerServiceMapID: number | null): Observable<CallTypeOption[]> {
    return this.lookup<CallTypeOption[]>(this.config.getCommonBaseURL() + CALL_TYPES_PATH, {
      providerServiceMapID,
    }).pipe(map((data) => data ?? []));
  }

  /** Grouped call types (`call/getCallTypesV1`), for type → sub-type pickers. */
  getCallTypeGroups(providerServiceMapID: number | null): Observable<CallTypeGroup[]> {
    return this.lookup<CallTypeGroup[]>(this.config.getCommonBaseURL() + CALL_TYPES_V1_PATH, {
      providerServiceMapID,
    }).pipe(map((data) => data ?? []));
  }

  /** Agents of the service (`user/getAgentByRoleID`). */
  getAgents(providerServiceMapID: number | null): Observable<AgentOption[]> {
    return this.lookup<AgentOption[]>(this.config.getCommonBaseURL() + AGENTS_PATH, {
      providerServiceMapID,
    }).pipe(map((data) => data ?? []));
  }

  /** Work locations of the provider (`user/getLocationsByProviderID`). */
  getWorkLocations(providerServiceMapID: number | null): Observable<WorkLocationOption[]> {
    return this.lookup<WorkLocationOption[]>(
      this.config.getCommonBaseURL() + WORK_LOCATIONS_PATH,
      { providerServiceMapID },
    ).pipe(map((data) => data ?? []));
  }

  /** Skillsets/roles of the provider (`user/getRolesByProviderID`). */
  getRoles(providerServiceMapID: number | null): Observable<RoleOption[]> {
    return this.lookup<RoleOption[]>(this.config.getCommonBaseURL() + ROLES_PATH, {
      providerServiceMapID,
    }).pipe(map((data) => data ?? []));
  }

  /** Districts of a state (`location/districts/{stateID}`). */
  getDistricts(stateID: number): Observable<DistrictOption[]> {
    return this.http
      .get<ApiResponse<DistrictOption[]>>(this.config.getCommonBaseURL() + DISTRICTS_PATH + stateID)
      .pipe(
        timeout(LOOKUP_TIMEOUT_MS),
        map((res) => readSupervisorData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSupervisorError(err))),
      );
  }

  /** Sub-districts / taluks of a district (`location/taluks/{districtID}`). */
  getSubDistricts(districtID: number): Observable<SubDistrictOption[]> {
    return this.http
      .get<
        ApiResponse<SubDistrictOption[]>
      >(this.config.getCommonBaseURL() + SUB_DISTRICTS_PATH + districtID)
      .pipe(
        timeout(LOOKUP_TIMEOUT_MS),
        map((res) => readSupervisorData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSupervisorError(err))),
      );
  }

  /** Villages of a sub-district (`location/village/{blockID}`). */
  getVillages(blockID: number): Observable<VillageOption[]> {
    return this.http
      .get<ApiResponse<VillageOption[]>>(this.config.getCommonBaseURL() + VILLAGES_PATH + blockID)
      .pipe(
        timeout(LOOKUP_TIMEOUT_MS),
        map((res) => readSupervisorData(res) ?? []),
        catchError((err: unknown) => throwError(() => toSupervisorError(err))),
      );
  }

  /**
   * Sub-services of the provider (`beneficiary/get/services`, 104 API). The
   * legacy endpoint returns the array at the response root (no envelope), so
   * both shapes are accepted.
   */
  getServices(providerServiceMapID: number | null): Observable<SubServiceOption[]> {
    return this.http
      .post<
        ApiResponse<SubServiceOption[]> | SubServiceOption[]
      >(this.config.get104BaseURL() + SERVICES_PATH, { providerServiceMapID })
      .pipe(
        timeout(LOOKUP_TIMEOUT_MS),
        map((res) => (Array.isArray(res) ? res : (readSupervisorData(res) ?? []))),
        catchError((err: unknown) => throwError(() => toSupervisorError(err))),
      );
  }

  /** One page of the disease-summary catalogue (`diseaseController/getDisease`). */
  getDiseaseSummaryList(pageNo: number, pageSize: number): Observable<DiseaseSummaryPage> {
    return this.lookup<DiseaseSummaryPage>(this.config.get104BaseURL() + DISEASE_LIST_PATH, {
      pageNo,
      pageSize,
    }).pipe(map((data) => data ?? {}));
  }

  // --- helpers --------------------------------------------------------------

  private lookup<T>(url: string, body: unknown): Observable<T | undefined> {
    return this.http.post<ApiResponse<T>>(url, body).pipe(
      timeout(LOOKUP_TIMEOUT_MS),
      map((res) => readSupervisorData(res)),
      catchError((err: unknown) => throwError(() => toSupervisorError(err))),
    );
  }

  private blob(url: string, body: unknown): Observable<Blob> {
    return this.http.post(url, body, { responseType: 'blob' }).pipe(
      timeout(REPORT_TIMEOUT_MS),
      catchError((err: unknown) => throwError(() => toSupervisorError(err))),
    );
  }
}
