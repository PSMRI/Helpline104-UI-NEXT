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
 * Types for the Epidemic Outbreak service tab, derived from the legacy
 * `SioEpidemicOutbreakServiceComponent`. Endpoints (all 104 base):
 * `beneficiary/get/natureOfComplaintTypes`,
 * `beneficiary/get/epidemicOutbreakComplaint`,
 * `beneficiary/save/epidemicOutbreakComplaint`.
 * The outbound dialling / SMS / follow-up flow is a separate outbound concern
 * and is intentionally not part of this inbound capture tab.
 */

/**
 * One "nature of complaint" option. The raw endpoint returns rows that wrap the
 * option inside `m_feedbackNature[0]`; the service flattens each to this shape.
 */
export interface NatureOfComplaint {
  feedbackNatureID: number;
  feedbackNature: string;
}

/** A raw row from `beneficiary/get/natureOfComplaintTypes`. */
export interface NatureOfComplaintRow {
  m_feedbackNature?: NatureOfComplaint[];
  [key: string]: unknown;
}

/** Request body for POST beneficiary/save/epidemicOutbreakComplaint. */
export interface SaveEpidemicComplaint {
  affectedDistrictBlockID: number | null;
  affectedDistrictID: number | null;
  affectedVillageID: number | null;
  beneficiaryRegID: number | null;
  natureOfComplaint: string;
  totalPeopleAffected: string;
  deleted: boolean;
  remarks: string | null;
  createdBy: string;
  serviceID: number | null;
  benCallID: string | null;
}

/** One row of the epidemic-outbreak history (`beneficiary/get/epidemicOutbreakComplaint`). */
export interface EpidemicComplaintRow {
  requestID?: number | string;
  natureOfComplaint?: string;
  totalPeopleAffected?: number | string;
  m_district?: { districtName?: string };
  m_districtblock?: { blockName?: string };
  remarks?: string;
  createdDate?: string;
  [key: string]: unknown;
}
