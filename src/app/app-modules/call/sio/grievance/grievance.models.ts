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
 * Types for the Grievance / Feedback service tab, derived from the legacy SIO
 * grievance capture flow. Endpoints:
 * `beneficiary/get/natureOfComplaintTypes` (104), `category/categories` (common),
 * `service/subcategory` (common), `feedback/getSeverity` (common),
 * `institute/getDesignations` (common, GET), `beneficiary/saveBenFeedback` (104),
 * `feedback/getFeedbacksList` (common). The legacy outbound dialling, SMS,
 * institution-type/name lookup, healthcare-worker toggle and response modal are
 * separate concerns and are intentionally not part of this inbound capture tab.
 */

/** A nature-of-complaint option (flattened from `m_feedbackNature`). */
export interface FeedbackNature {
  feedbackNatureID: number;
  feedbackNature: string;
}

/** A grievance category (`category/categories`). */
export interface GrievanceCategory {
  categoryID: number;
  categoryName: string;
}

/** A grievance sub-category (`service/subcategory`). */
export interface GrievanceSubCategory {
  subCategoryID: number;
  subCategoryName: string;
}

/** A severity option (`feedback/getSeverity`). */
export interface Severity {
  severityID: number;
  severityTypeName: string;
}

/** A designation option (`institute/getDesignations`). */
export interface Designation {
  designationID: number;
  designationName: string;
}

/** One raw item of the nature-of-complaint response (before flattening). */
export interface NatureOfComplaintRow {
  m_feedbackNature?: FeedbackNature[];
  [key: string]: unknown;
}

/** Request body for POST beneficiary/saveBenFeedback (sent as a one-element array). */
export interface SaveGrievanceRequest {
  feedbackNatureID: number | null;
  categoryID: number | null;
  subCategoryID: number | null;
  severityID: number | null;
  designationID: number | null;
  stateID: number | null;
  districtID: number | null;
  blockID: number | null;
  districtBranchID: number | null;
  feedback: string | null;
  feedbackAgainst: string;
  beneficiaryRegID: number | null;
  serviceID: number | null;
  createdBy: string;
  benCallID: string | null;
  serviceAvailDate: string | null;
}

/** One row of the grievance history (`feedback/getFeedbacksList`). */
export interface GrievanceRow {
  requestID?: number | string;
  feedbackID?: number | string;
  feedback?: string;
  severity?: { severityTypeName?: string };
  createdBy?: string;
  feedbackStatus?: { feedbackStatus?: string };
  [key: string]: unknown;
}
