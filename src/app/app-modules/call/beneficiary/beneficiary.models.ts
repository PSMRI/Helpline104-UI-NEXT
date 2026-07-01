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

import { TranslationKey } from '../../core/i18n/locales';

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
  /** API value (`m_genders` id) — sent unchanged in requests. */
  genderID: number;
  /** Canonical English name sent to the API as `genderName`. */
  genderName: string;
  /** i18n key for the user-facing label (display only). */
  labelKey: TranslationKey;
}

/**
 * Static gender choices for the basic registration form. Mirrors the AMRIT
 * `m_genders` master; full master-data loading (getRegistrationDataV1) is wired
 * in a later step. `genderID`/`genderName` are the API contract; `labelKey` is
 * the localized label shown to the agent.
 */
export const GENDER_OPTIONS: readonly GenderOption[] = [
  { genderID: 1, genderName: 'Male', labelKey: 'registration.gender.male' },
  { genderID: 2, genderName: 'Female', labelKey: 'registration.gender.female' },
  {
    genderID: 3,
    genderName: 'Transgender',
    labelKey: 'registration.gender.transgender',
  },
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
  m_gender?: { genderID?: number; genderName?: string };
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

/** One phone mapping sent when registering a beneficiary (legacy `benPhoneMaps`). */
export interface BenPhoneMap {
  /** Links a non-self caller's number to the existing "Self" beneficiary. */
  parentBenRegID?: number | null;
  phoneNo: string;
  /** Set on the primary number (legacy default 1); omitted on alternates. */
  phoneTypeID?: number;
  /** Relationship of this number's owner to the parent beneficiary. */
  benRelationshipID?: number | null;
  createdBy: string;
  /** Set on alternate numbers (legacy stamps `deleted: false`). */
  deleted?: boolean;
}

/** Demographic block sent on create (legacy `i_bendemographics`). */
export interface BenDemographics {
  educationID?: number | null;
  occupationID?: number | null;
  healthCareWorkerID?: number | null;
  communityID?: number | null;
  districtID?: number | null;
  stateID?: number | null;
  pinCode?: string | null;
  blockID?: number | null;
  districtBranchID?: number | null;
  addressLine1?: string | null;
  createdBy: string;
}

/** One government identity entry sent on create (legacy `beneficiaryIdentities`). */
export interface BeneficiaryIdentity {
  govtIdentityNo?: string | null;
  govtIdentityTypeID?: number | null;
}

/**
 * Request body for POST beneficiary/create, mirroring the legacy `registerObj`
 * exactly (field names and structure) so the backend contract is unchanged.
 * `dOB` is the ISO date string; the agent enters age + age-unit and the form
 * derives the DOB.
 */
export interface RegisterBeneficiaryRequest {
  providerServiceMapID?: number | null;
  firstName: string;
  lastName: string;
  dOB?: string;
  ageUnits: string;
  fatherName?: string | null;
  spouseName?: string | null;
  beneficiaryIdentities: BeneficiaryIdentity[];
  emergencyRegistration: boolean;
  createdBy: string;
  titleId?: number | string | null;
  statusID?: number | null;
  registeredServiceID?: number | null;
  maritalStatusID?: number | null;
  genderID: number;
  genderName: string;
  vanID?: number | null;
  i_bendemographics: BenDemographics;
  benPhoneMaps: BenPhoneMap[];
}

/** Newly-created beneficiary returned by beneficiary/create. */
export interface RegisterBeneficiaryResponse {
  beneficiaryRegID: number;
  beneficiaryID?: string | number;
  [key: string]: unknown;
}

// --- Master data (POST beneficiary/getRegistrationDataV1) --------------------

/** Gender master row. */
export interface Gender {
  genderID: number;
  genderName: string;
}

/** Title master row (`m_Title`). */
export interface Title {
  titleID: number;
  titleName: string;
}

/** Community / caste master row (`m_communities`). */
export interface Community {
  communityID: number;
  communityType: string;
}

/** Marital-status master row (`m_maritalStatuses`). */
export interface MaritalStatus {
  maritalStatusID: number;
  status: string;
}

/** Education master row (`i_BeneficiaryEducation`). */
export interface Education {
  educationID: number;
  educationType: string;
}

/** Government identity type master row (`govtIdentityTypes`). */
export interface GovtIdentityType {
  govtIdentityTypeID: number;
  identityType: string;
  isGovtID?: boolean;
}

/** Relationship master row (`benRelationshipTypes`). */
export interface Relationship {
  benRelationshipID: number;
  benRelationshipType: string;
}

/** Healthcare-worker type (POST beneficiary/get/healthCareWorkerTypes). */
export interface HealthCareWorkerType {
  healthCareWorkerID: number;
  healthCareWorkerType: string;
}

/**
 * The registration master-data envelope payload. Only the arrays the form
 * consumes are typed; the rest is preserved.
 */
export interface RegistrationMasterData {
  m_genders?: Gender[];
  m_Title?: Title[];
  m_communities?: Community[];
  m_maritalStatuses?: MaritalStatus[];
  i_BeneficiaryEducation?: Education[];
  govtIdentityTypes?: GovtIdentityType[];
  benRelationshipTypes?: Relationship[];
  [key: string]: unknown;
}

// --- Location cascade --------------------------------------------------------

/** State master row (`m/role/state`). */
export interface StateOption {
  stateID: number;
  stateName: string;
}

/** District master row (`location/districts/{stateID}`). */
export interface DistrictOption {
  districtID: number;
  districtName: string;
}

/** Sub-district / block row (`location/taluks/{districtID}`). */
export interface BlockOption {
  blockID: number;
  blockName: string;
}

/** Village row (`location/village/{subDistrictID}`). */
export interface VillageOption {
  districtBranchID: number;
  villageName: string;
}
