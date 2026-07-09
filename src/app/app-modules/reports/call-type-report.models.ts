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
 * Types for the agent-facing Call Type (Customer Delight Index) report, ported
 * from the legacy `surveyor-calltype-reports` component and its services.
 *
 * Endpoints (all POST):
 *   - {common} call/getCallTypesV1        — call-type groups (resolve the "valid" type)
 *   - {common} call/filterCallListPage    — server-paged CDI worklist
 *   - {104}    beneficiary//get/CDIqamapping — per-call questionnaire report
 */

/** Standard AMRIT API envelope. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised report error the components can display. */
export interface ReportError {
  status: number;
  errorMessage: string;
}

/** One call type within a group (`call/getCallTypesV1`). */
export interface CallType {
  callTypeID?: number;
  callType?: string;
}

/** One call-type group (`call/getCallTypesV1`). */
export interface CallTypeGroup {
  callGroupType?: string;
  callTypes?: CallType[];
}

/** Filter body for `call/filterCallListPage` (legacy `get_filterCallList`). */
export interface FilterCallListRequest {
  calledServiceID: number | null;
  callTypeID: number | null;
  filterStartDate?: string;
  filterEndDate?: string;
  receivedRoleName: string | null;
  pageNo: number;
  pageSize: number;
  cDICallStatus: string;
}

/** One row of the CDI worklist (`filterCallListPage` → `workList`). */
export interface CdiCallRecord {
  benCallID?: number;
  beneficiaryRegID?: number;
  beneficiaryID?: number;
  name?: string;
  phoneNo?: string;
  callType?: string;
  remarks?: string;
  cDICallStatus?: string;
  callTime?: string;
  lastCalledOn?: string;
}

/** Paged response of `call/filterCallListPage`. */
export interface FilterCallListResponse {
  workList?: CdiCallRecord[];
  totalPages?: number;
}

/** One answered question of a CDI call report (`beneficiary//get/CDIqamapping`). */
export interface CdiQaMapping {
  answer?: string;
  score?: number;
  m_questionnaire?: {
    question?: string;
    answerType?: string;
  };
}

/** CDI call statuses offered by the worklist filter (sent verbatim). */
export const CDI_CALL_STATUSES = [
  'All',
  'New',
  'Attempted',
  'Closed',
  'Not Interested',
] as const;
