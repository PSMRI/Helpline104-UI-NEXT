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
 * Shapes for the supervisor Quality Audit (call auditing) screen, ported from
 * the legacy `QualityAuditComponent` / `QualityAuditService`
 * (`call/filterCallList`, common API).
 */

/** Body of `call/filterCallList` (legacy `callRecordingRequestFordate`). */
export interface WorklistRequest {
  calledServiceID: number | null;
  /** The selected call sub-type id; omitted for the "All" call-type group. */
  callTypeID?: number;
  filterStartDate: string;
  filterEndDate: string;
  receivedRoleName: string | null;
  phoneNo: string | null;
  agentID: string | number | null;
  inboundOutbound: string | null;
  is1097: false;
  pageNo: number;
}

/** One call-recording row of the audit worklist (`data.workList[]`). */
export interface CallRecordingRow {
  benCallID?: number;
  /** CTI session id used with `agentID` to resolve the voice file. */
  callID?: number;
  agentID?: number;
  callTime?: string;
  beneficiaryID?: number | string;
  name?: string;
  phoneNo?: string;
  remarks?: string;
  callType?: string;
  [key: string]: unknown;
}

/** Envelope `data` of `call/filterCallList`. */
export interface WorklistPage {
  workList?: CallRecordingRow[];
  totalPages?: number;
  [key: string]: unknown;
}
