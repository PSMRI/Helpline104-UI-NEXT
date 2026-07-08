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
 * Types for the Blood-on-Call (blood request) service tab, derived from the
 * legacy `SioBloodOnCallServiceComponent` + `BloodOnCallServices`. Endpoints
 * (all 104 base): `beneficiary/get/bloodComponentTypes`,
 * `beneficiary/get/bloodGroups`, `beneficiary/get/bloodRequestDetails`,
 * `beneficiary/save/bloodRequestDetails`, `beneficiary/get/bloodBankURL`.
 * The outbound dialling / blood-bank contact / SMS flow is a separate outbound
 * concern and is intentionally not part of this inbound capture tab.
 */

/** A blood component type (`beneficiary/get/bloodComponentTypes`). */
export interface BloodComponentType {
  componentTypeID: number;
  componentType: string;
}

/** A blood group (`beneficiary/get/bloodGroups`). */
export interface BloodGroup {
  bloodGroupID: number;
  bloodGroup: string;
}

/** Blood-bank reference URL payload (`beneficiary/get/bloodBankURL`). */
export interface BloodBankUrlData {
  bloodBankURL?: string;
  url?: string;
  [key: string]: unknown;
}

/** Request body for POST beneficiary/save/bloodRequestDetails. */
export interface SaveBloodRequest {
  beneficiaryRegID: number | null;
  benCallID: string | null;
  recipientName: string;
  recipientAge: number | null;
  recipientGenderID: number | null;
  bloodGroupID: number | null;
  componentTypeID: number | null;
  unitRequired: string | null;
  hospitalAdmitted: string;
  districtID: number | null;
  outboundNeeded: string;
  deleted: boolean;
  isSelf: boolean;
  remarks: string | null;
  providerServiceMapID: number | null;
  createdBy: string;
}

/** One row of the blood-request history (`beneficiary/get/bloodRequestDetails`). */
export interface BloodRequestRow {
  requestID?: number | string;
  recipientName?: string;
  recipientAge?: number;
  hospitalAdmitted?: string;
  m_bloodGroup?: { bloodGroup?: string };
  m_componentType?: { componentType?: string };
  [key: string]: unknown;
}
