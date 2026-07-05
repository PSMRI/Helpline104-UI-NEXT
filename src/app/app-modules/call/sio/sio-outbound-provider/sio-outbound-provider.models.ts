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
 * Types for the SIO outbound (blood-bank) provider management screen, derived
 * from the legacy `SioOutboundProviderComponent` + `OutboundWorklistService`.
 * The agent opens a specific blood request from the outbound worklist, reviews
 * the requirement, then records the blood-bank provider contact and marks the
 * request fulfilled. Endpoints (104 base):
 *   - POST beneficiary/get/bloodRequestDetails   — the blood request to fulfil
 *   - POST beneficiary/save/bloodBankDetails      — save the provider contact
 */

/** The worklist item passed in when the agent opens an outbound blood request. */
export interface OutboundProviderInput {
  beneficiaryRegID: number | null;
  /** Request number / blood-request id identifying the specific request. */
  bloodReqID: number | string | null;
  /** Beneficiary display name, if the worklist provided one. */
  beneficiaryName?: string | null;
}

/** The blood request under fulfilment (`beneficiary/get/bloodRequestDetails`). */
export interface BloodRequestDetail {
  bloodReqID?: number | string;
  recipientName?: string;
  recipientAge?: number;
  unitRequired?: number | string;
  m_componentType?: { componentType?: string };
  m_bloodGroup?: { bloodGroup?: string };
  [key: string]: unknown;
}

/** Request body for POST beneficiary/save/bloodBankDetails. */
export interface SaveBloodBankRequest {
  bloodReqID: number | string | null;
  bloodBankPersonName: string;
  bBPersonDesignation: string;
  bloodBankMobileNo: string;
  bloodBankAddress: string;
  feedback: string | null;
  remarks: string | null;
  isRequestFulfilled: boolean;
  sendSMS: boolean;
  deleted: boolean;
  createdBy: string;
}
