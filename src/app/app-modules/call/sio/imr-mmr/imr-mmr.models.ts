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
 * Types for the IMR/MMR (Infant / Maternal Mortality) information service tab,
 * derived from the legacy IMR-MMR capture flow. Endpoints (all 104 base):
 * `beneficiary/saveIMRMMR`, `beneficiary/getIMRMMRList`. This inbound tab
 * captures the informer, the victim and the reason of death; the legacy
 * support-services / stages-of-death / death-confirmation update flow is a
 * separate concern and is intentionally not part of this capture tab.
 */

/** The kind of death being reported. */
export type ImrMmrInfoType = 'CDR' | 'MDSR';

/**
 * Request body for POST beneficiary/saveIMRMMR. Note the legacy API key
 * `typeOfInfromation` is misspelled server-side and is preserved verbatim.
 */
export interface SaveImrMmrRequest {
  victimName: string;
  victimAge: number | null;
  victimDistrict: number | null;
  victimTaluk: number | null;
  victimVillage: number | null;
  victimAddress: string | null;
  victimGuardian: string;
  referenceDate: string;
  reasonOfDeath: string;
  informerName: string;
  informerMobileNumber: number;
  informerAddress: string;
  typeOfInfromation: ImrMmrInfoType;
  createdBy: string;
  modifiedBy: string;
  providerServiceMapID: number | null;
  beneficiaryRegID: number | null;
  benCallID: string | null;
}

/** One row of the IMR/MMR history (`beneficiary/getIMRMMRList`). */
export interface ImrMmrRow {
  requestID?: number | string;
  victimName?: string;
  victimAge?: number;
  victimDistrictName?: { districtName?: string };
  informerName?: string;
  informerMobileNumber?: number | string;
  referenceDate?: string;
  [key: string]: unknown;
}
