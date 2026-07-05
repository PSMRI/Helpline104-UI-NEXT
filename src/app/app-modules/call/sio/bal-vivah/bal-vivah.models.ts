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
 * Types for the Bal Vivah (child-marriage reporting) service tab, derived from
 * the legacy SIO bal-vivah complaint flow. Endpoints (all 104 base):
 * `beneficiary/saveBalVivahComplaint`, `beneficiary/getBalVivahList`.
 * The complaint captures the child, the child's father, both of their
 * (independent) location cascades and the intended marriage date; prior
 * complaints for the beneficiary are listed below. The legacy outbound dialling
 * / follow-up flow is a separate outbound concern and is intentionally not part
 * of this inbound capture tab.
 */

/** Request body for POST beneficiary/saveBalVivahComplaint. */
export interface SaveBalVivahComplaint {
  beneficiaryRegID: number | null;
  benCallID: string | null;
  subjectOfComplaint: string | null;
  childName: string;
  childFatherName: string;
  childAge: number | null;
  childGender: number | null;
  childState: number | null;
  childFatherState: number | null;
  childDistrict: number | null;
  childFatherDistrict: number | null;
  childSubDistrict: number | null;
  childFatherSubDistrict: number | null;
  childVillage: number | null;
  childFatherVillage: number | null;
  marriageDate: string | null;
  ComplaintDate: string;
  providerServiceMapID: number | null;
  createdBy: string;
}

/** One row of the bal-vivah complaint history (`beneficiary/getBalVivahList`). */
export interface BalVivahRow {
  requestID?: number | string;
  childName?: string;
  childFatherName?: string;
  subjectOfComplaint?: string;
  district?: { districtName?: string };
  ComplaintDate?: string;
  marriageDate?: string;
  [key: string]: unknown;
}
