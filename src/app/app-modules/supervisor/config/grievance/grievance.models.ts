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
 * Types for the supervisor grievance-tracking screen, derived from the legacy
 * `grievanceComponent` + `FeedbackService` + `FeedbackTypes` + `LocationService`
 * + `CoFeedbackService`. Endpoints:
 *   common (POST unless noted):
 *   - feedback/getFeedbacksList          { serviceID, startDate, endDate, requestID?, feedbackTypeID? }
 *   - feedback/getFeedbackStatus         {}
 *   - feedback/getEmailStatus            {}
 *   - feedback/saveFeedbackRequest       SaveFeedbackRequest        (edit → forward via email)
 *   - feedback/updateResponse            SaveFeedbackRequest        (update → record response)
 *   - feedback/getFeedbackType           { providerServiceMapID }
 *   - feedback/getSeverity               { providerServiceMapID }
 *   - feedback/getFeedbackLogs           feedbackID (raw number body)
 *   - institute/getInstituteTypes        { providerServiceMapID }
 *   - institute/getInstituteName/{institutionTypeID}   (GET)
 *   - institute/getDesignations          (GET)
 *   - emailController/getAuthorityEmailID { districtID }
 *   - emailController/SendEmail          { FeedbackID, emailID, is1097: false }
 *   104 base:
 *   - beneficiary/get/natureOfComplaintTypes { providerServiceMapID, feedbackTypeID }
 */

/** Grievance / feedback type master (`feedback/getFeedbackType`). */
export interface FeedbackType {
  feedbackTypeID: number;
  feedbackTypeName: string;
}

/** Grievance status master (`feedback/getFeedbackStatus`). */
export interface FeedbackStatus {
  feedbackStatusID: number;
  feedbackStatus: string;
}

/** Email status master (`feedback/getEmailStatus`). */
export interface EmailStatus {
  emailStatusID: number;
  emailStatus: string;
}

/** Severity master (`feedback/getSeverity`). */
export interface Severity {
  severityID: number;
  severityTypeName: string;
}

/** Designation master (`institute/getDesignations`). */
export interface Designation {
  designationID: number;
  designationName: string;
}

/** Institution type master (`institute/getInstituteTypes`). */
export interface InstituteType {
  institutionTypeID: number;
  institutionType: string;
}

/** Institution name row (`institute/getInstituteName/{typeID}`). */
export interface InstituteName {
  institutionID?: number;
  institutionName: string;
}

/** One nature-of-complaint option, flattened from `m_feedbackNature`. */
export interface FeedbackNature {
  feedbackNatureID: number;
  feedbackNature: string;
}

/** Raw row from `beneficiary/get/natureOfComplaintTypes`. */
export interface NatureOfComplaintRow {
  m_feedbackNature?: FeedbackNature[];
}

/** One forwarded-request row on a grievance (`feedbackRequests`). */
export interface FeedbackRequest {
  feedbackRequestID?: number;
  feedbackSupSummary?: string;
  comments?: string;
  responseComments?: string;
  attachmentPath?: string;
  kmFileManager?: { fileName?: string };
  emailStatus?: EmailStatus;
  createdBy?: string;
  /** Epoch ms. */
  createdDate?: number;
  responseUpdatedBy?: string;
  /** Epoch ms. */
  responseDate?: number;
}

/** One grievance row from `feedback/getFeedbacksList`. */
export interface FeedbackRow {
  feedbackID: number;
  requestID?: string;
  feedback?: string;
  feedbackAgainst?: string;
  createdBy?: string;
  modifiedBy?: string;
  /** Epoch ms or ISO string. */
  createdDate?: number | string;
  feedbackStatusID?: number;
  emailStatusID?: number;
  instiName?: string;
  beneficiary?: {
    firstName?: string;
    lastName?: string;
    i_bendemographics?: { districtID?: number };
  };
  feedbackType?: FeedbackType;
  feedbackStatus?: FeedbackStatus;
  emailStatus?: EmailStatus;
  instituteType?: InstituteType;
  designation?: Designation;
  severity?: Severity;
  feedbackNatureDetail?: FeedbackNature;
  feedbackRequests?: FeedbackRequest[];
  feedbackResponses?: unknown[];
  consolidatedRequests?: { responseUpdatedBy?: string }[];
}

/**
 * Body for `feedback/saveFeedbackRequest` (edit) and `feedback/updateResponse`
 * (update) — the legacy screen POSTs the whole form value with `feedbackStatus`
 * / `emailStatus` blanked and `feedbackID` swapped back from the display
 * `requestID` to the real numeric id.
 */
export interface SaveFeedbackRequest {
  feedbackID: number;
  feedbackSupSummary: string | null;
  beneficiaryName: string | null;
  comments: string | null;
  createdBy: string | null;
  createdDate: string | null;
  supUserID: string | null;
  feedbackDate: string | null;
  feedbackTypeID: number | null;
  feedbackStatus: undefined;
  emailStatus: undefined;
  instituteTypeID: number | null;
  instiName: string | null;
  designationID: number | null;
  severityID: number | null;
  feedbackAgainst: string | null;
  feedbackNatureID: number | null;
  modifiedBy: string | null;
  updateResponse: string | null;
  emailStatusID: number | null;
  feedbackStatusID: number | null;
  feedbackRequestID: number | undefined;
  serviceID: number | null;
}

/** One change-log row (`feedback/getFeedbackLogs`). */
export interface FeedbackLog {
  feedbackLogs?: string;
  createdBy?: string;
  /** Epoch ms. */
  createdDate?: number;
}
