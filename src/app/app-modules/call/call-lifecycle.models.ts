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

import { BeneficiaryRecord } from './beneficiary/beneficiary.models';

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
 * Body of `call/startCall` — legacy `innerpage.component.ts` `storeCallID()`
 * (`callerObj`, lines 263-283): beneficiary, CTI call id, caller number, agent,
 * the receiving role's name and the called service's providerServiceMapID.
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
  /** Legacy `callerObj.receivedRoleName` (`current_roleName`). */
  receivedRoleName?: string | null;
  /** Legacy `callerObj.calledServiceID` (`current_service.serviceID`, i.e. the providerServiceMapID). */
  calledServiceID?: number | null;
}

/**
 * Response of `call/startCall` — `benCallID` is the real AMRIT call id. On a
 * transferred call the backend also returns the beneficiary the previous leg
 * identified (`i_beneficiary`), which legacy stores as
 * `beneficiaryDataAcrossApp.beneficiaryDetails` and the MO/CO case sheet
 * reads (`case-sheet.component.ts` `benDataInboundPopulationg`).
 */
export interface StartCallResponse {
  benCallID: string;
  beneficiaryRegID?: number | null;
  i_beneficiary?: BeneficiaryRecord | null;
  [key: string]: unknown;
}
