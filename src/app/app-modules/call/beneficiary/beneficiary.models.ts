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
 * Types for the inbound caller-identification flow, derived from the legacy
 * `beneficiary-registration-104` component and `SearchService`:
 *   - POST beneficiary/searchUserByPhone  (reg history by CLI)
 *   - POST beneficiary/searchBeneficiary  (name / ID search)
 *   - POST beneficiary/create             (register a new beneficiary)
 *
 * Only the fields the rebuilt UI consumes are typed strictly; the rest of the
 * large beneficiary tree is preserved via index signatures.
 */

/** Standard 104 API envelope (shared shape used across the app's services). */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised beneficiary-API error the component can display. */
export interface BeneficiaryError {
  status: number;
  errorMessage: string;
}

/** Gender master entry (subset of the legacy `m_genders`). */
export interface GenderOption {
  genderID: number;
  genderName: string;
}

/**
 * Static gender choices for the basic registration form. Mirrors the AMRIT
 * `m_genders` master; full master-data loading (getRegistrationDataV1) is wired
 * in a later step.
 */
export const GENDER_OPTIONS: readonly GenderOption[] = [
  { genderID: 1, genderName: 'Male' },
  { genderID: 2, genderName: 'Female' },
  { genderID: 3, genderName: 'Transgender' },
];

/**
 * One registration record returned by searchUserByPhone / searchBeneficiary.
 * `beneficiaryRegID` is the internal id used to link the call; `beneficiaryID`
 * is the human-facing registration number shown to the agent.
 */
export interface BeneficiaryRecord {
  beneficiaryRegID: number;
  beneficiaryID?: string | number;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  actualAge?: number;
  ageUnits?: string;
  m_gender?: { genderName?: string };
  benPhoneMaps?: Array<{
    phoneNo?: string;
    benRelationshipType?: { benRelationshipType?: string };
    [key: string]: unknown;
  }>;
  i_bendemographics?: {
    m_district?: { districtName?: string };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Request body for POST beneficiary/searchUserByPhone. */
export interface PhoneSearchRequest {
  phoneNo: string;
  pageNo: number;
  rowsPerPage: number;
}

/** Request body for POST beneficiary/searchBeneficiary (name / ID search). */
export interface BeneficiarySearchRequest {
  firstName?: string;
  lastName?: string;
  genderID?: number | null;
  beneficiaryID?: string;
}

/** One phone mapping sent when registering a beneficiary. */
export interface BenPhoneMap {
  phoneNo: string;
  phoneTypeID: number;
  createdBy: string;
}

/**
 * Request body for POST beneficiary/create. A focused subset of the legacy
 * `registerObj` — the basic identity the inbound flow needs to identify a
 * caller; the full demographic/identity payload is added with the master-data
 * step.
 */
export interface RegisterBeneficiaryRequest {
  firstName: string;
  lastName: string;
  genderID: number;
  genderName: string;
  age: number;
  ageUnits: string;
  createdBy: string;
  providerServiceMapID?: number | null;
  benPhoneMaps: BenPhoneMap[];
  i_bendemographics: { createdBy: string };
}

/** Newly-created beneficiary returned by beneficiary/create. */
export interface RegisterBeneficiaryResponse {
  beneficiaryRegID: number;
  beneficiaryID?: string | number;
  [key: string]: unknown;
}
