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
 * Types for the outbound call-management screens (worklist, search, allocate,
 * reallocate), derived from the legacy `outboundServices/*` services and the
 * `outbond-worklist` / `outbound-*-records` / `reallocate-calls` components.
 *
 * Endpoints (all on the common API, all POST):
 *   - call/outboundCallList              — worklist / unallocated / per-agent list
 *   - call/outboundAllocation            — allocate records to agents
 *   - call/resetOutboundCall             — move records to the reallocation bin
 *   - user/getUsersByProviderID          — agents for a role
 *   - user/getRolesByProviderID          — roles for the service
 *   - user/getRoleScreenMappingByProviderID — feature → role screen mapping
 */

/** Standard AMRIT API envelope. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised outbound error the components can display. */
export interface OutboundError {
  status: number;
  errorMessage: string;
}

/** A phone-number map entry on a beneficiary. */
export interface BenPhoneMap {
  phoneNo?: string;
}

/** The beneficiary attached to an outbound call request. */
export interface OutboundBeneficiary {
  beneficiaryID?: number;
  beneficiaryRegID?: number;
  firstName?: string;
  lastName?: string;
  benPhoneMaps?: BenPhoneMap[];
}

/** The non-empty alternate phone numbers on a beneficiary (all but index 0). */
export function alternatePhoneNumbers(ben: OutboundBeneficiary | undefined): string[] {
  return (ben?.benPhoneMaps ?? [])
    .slice(1)
    .map((p) => p.phoneNo?.trim() ?? '')
    .filter((phoneNo) => phoneNo.length > 0);
}

/** One outbound call request row (worklist / unallocated / per-agent). */
export interface OutboundCallRecord {
  outboundCallReqID?: number;
  requestNo?: string;
  requestedFeature?: string;
  requestedFor?: string;
  prefferedDateTime?: string;
  noOfTrials?: number;
  isSelf?: boolean;
  beneficiary?: OutboundBeneficiary;
}

/** Filter body for `call/outboundCallList`. */
export interface OutboundCallListRequest {
  providerServiceMapID: number | null;
  assignedUserID?: number | null;
  filterStartDate?: string;
  filterEndDate?: string;
}

/** An agent selectable for allocation (from `user/getUsersByProviderID`). */
export interface AgentUser {
  userID?: number;
  firstName?: string;
  lastName?: string;
}

/** A role (from `user/getRolesByProviderID`) with its mapped feature screens. */
export interface RoleOption {
  roleID?: number;
  roleName?: string;
  featureName?: FeatureScreen[];
}

/** One feature → screen mapping entry. */
export interface FeatureScreen {
  roleID?: number;
  screen?: { screenName?: string };
}

/** Request body for `call/outboundAllocation`. */
export interface AllocateRequest {
  userID: number[];
  allocateNo: number;
  outboundCallRequests: { outboundCallReqID: number }[];
}

/** Screen names used to bucket a requested feature into a role worklist. */
export const FEATURE_SCREEN_NAMES = {
  health: 'Health_Advice',
  medical: 'Medical_Advice',
  counselling: 'Counselling',
  psychiatrist: 'Psychiatrist',
  serviceImprovements: 'Service_Improvements',
} as const;
