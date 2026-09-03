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
 * Shapes for `call/startCall` (legacy `callservice.service.ts#storeCallID`,
 * called from `beneficiary-registration-104.component.ts` right when an
 * inbound call is delivered — before a beneficiary is identified, which is
 * why `beneficiaryRegID` is `null` here).
 */

/** Common envelope returned by the 104 common-api endpoints. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/**
 * Request for `call/startCall`. Legacy's request object carries several more
 * fields (`remarks`, `servicesProvided`, `callClosureType`, `category`,
 * `subCategory`, `receivedRoleName`, `calledServiceID`) — those are closure-
 * time concerns on a shared mutable object reused across the legacy
 * component's whole lifecycle, and are still unset at the point legacy
 * itself calls this endpoint. Only the fields genuinely meaningful when a
 * call starts are sent here.
 */
export interface StartCallRequest {
  /** Null: no beneficiary is identified yet when the call starts. */
  beneficiaryRegID: number | null;
  /** CTI session/call id (legacy `callerObj.callID`). */
  callID: string;
  phoneNo: string;
  agentID: number | null;
  createdBy: string;
  /** Legacy `callerObj.callReceivedUserID` (`getCommonData.uid`). */
  callReceivedUserID: number | null;
  isOutbound: boolean;
}

/** Response of `call/startCall` — `benCallID` is the real AMRIT call id. */
export interface StartCallResponse {
  benCallID: string;
  [key: string]: unknown;
}
