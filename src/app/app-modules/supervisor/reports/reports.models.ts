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

/**
 * Shapes for the supervisor report screens, ported from the legacy
 * `ReportService` call sites (supervisor-call-quality-report,
 * supervisor-quality-report, supervisor-call-summary-report,
 * supervisor-calltype-reports, supervisor-complaint-detail-report,
 * supervisor-district-wise-call-volume-report, supervisor-diseases-summary and
 * supervisor-unblock-user-report).
 */

/** A call type option (`call/getCallTypes`). */
export interface CallTypeOption {
  callTypeID?: number;
  callType?: string;
  [key: string]: unknown;
}

/** One call-type group with its sub types (`call/getCallTypesV1`). */
export interface CallTypeGroup {
  callGroupType?: string;
  callTypes?: CallTypeOption[];
  [key: string]: unknown;
}

/** An agent option (`user/getAgentByRoleID`). */
export interface AgentOption {
  agentID?: number | string;
  [key: string]: unknown;
}

/** A work-location option (`user/getLocationsByProviderID`). */
export interface WorkLocationOption {
  pSAddMapID?: number;
  locationName?: string;
  [key: string]: unknown;
}

/** A skillset/role option (`user/getRolesByProviderID`, lowercase casing). */
export interface RoleOption {
  roleID?: number;
  roleName?: string;
  [key: string]: unknown;
}

/** A district (`location/districts/{stateID}`). */
export interface DistrictOption {
  districtID?: number;
  districtName?: string;
  [key: string]: unknown;
}

/** A sub-district / taluk (`location/taluks/{districtID}`). */
export interface SubDistrictOption {
  blockID?: number;
  blockName?: string;
  [key: string]: unknown;
}

/** A village (`location/village/{blockID}`). */
export interface VillageOption {
  districtBranchID?: number;
  villageName?: string;
  [key: string]: unknown;
}

/** A feedback (complaint) type (`feedback/getFeedbackType`). */
export interface FeedbackTypeOption {
  feedbackTypeID?: number;
  feedbackTypeName?: string;
  [key: string]: unknown;
}

/**
 * One nature-of-complaint entry (`beneficiary/get/natureOfComplaintTypes`);
 * the usable id/label sit inside `m_feedbackNature[0]` (legacy shape).
 */
export interface FeedbackNatureOption {
  m_feedbackNature?: { feedbackNatureID?: number; feedbackNature?: string }[];
  [key: string]: unknown;
}

/** One QA report type (`crmReports/getReportTypes/{psmID}`). */
export interface QaReportType {
  QAreportTypeID?: number;
  ReportType?: string;
  [key: string]: unknown;
}

/** One sub-service entry (`beneficiary/get/services`). */
export interface SubServiceOption {
  subServiceName?: string;
  [key: string]: unknown;
}

/** One disease-summary row (`diseaseController/getDisease`). */
export interface DiseaseSummaryItem {
  diseasesummaryID?: number;
  diseaseName?: string;
  summary?: string;
  couldbedangerous?: string;
  causes?: string;
  dos_donts?: string;
  symptoms_Signs?: string;
  medicaladvice?: string;
  riskfactors?: string;
  treatment?: string;
  self_care?: string;
  investigations?: string;
  [key: string]: unknown;
}

/** Envelope of `diseaseController/getDisease`. */
export interface DiseaseSummaryPage {
  DiseaseList?: DiseaseSummaryItem[];
  totalPages?: number;
  [key: string]: unknown;
}

/** One request entry for `crmReports/getComplaintDetailReport` (array body). */
export interface ComplaintDetailRequest {
  startDate: string;
  endDate: string;
  providerServiceMapID: number | null;
  feedbackTypeID: number | null;
  feedbackNatureID: number | null;
  feedbackTypeName: string | null;
  fileName: string;
}
