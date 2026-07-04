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
 * Types for the directory / institute-information lookup, derived from the
 * legacy `DirectoryServicesComponent` and `CoReferralService`. Endpoints:
 *   - POST beneficiary/getRegistrationDataV1  (common) — directory list (`.directory`)
 *   - POST directory/getSubDirectory          (common) — sub-directories (`.subDirectory`)
 *   - POST directory/getInstitutesDirectories (common) — institute search
 *   - POST beneficiary/get/services           (104)    — sub-services (for serviceID1097)
 *   - POST beneficiary/getdirectorySearchHistory (104) — search history
 *   - POST beneficiary/save/directorySearchHistory (104) — save search history
 * The state/district/sub-district/village cascade reuses BeneficiaryService.
 */

/** Standard AMRIT API envelope. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised directory-API error the component can display. */
export interface DirectoryError {
  status: number;
  errorMessage: string;
}

/** An institute-directory type (e.g. Hospitals, Blood banks). */
export interface DirectoryItem {
  instituteDirectoryID: number;
  instituteDirectoryName: string;
}

/** A sub-directory under a directory type. */
export interface SubDirectoryItem {
  instituteSubDirectoryID: number;
  instituteSubDirectoryName: string;
}

/** A sub-service row (used to resolve the role's `serviceID1097`). */
export interface ServiceItem {
  subServiceID: number;
  subServiceName: string;
}

/** One institute returned by the institute search. */
export interface InstituteResult {
  institute?: {
    institutionID?: number;
    institutionName?: string;
    address?: string;
    contactNo1?: string;
    contactNo2?: string;
    contactNo3?: string;
  };
  directory?: {
    instituteDirectoryID?: number;
    instituteDirectoryName?: string;
    providerServiceMapID?: number;
  };
  subDirectory?: {
    instituteSubDirectoryID?: number;
    instituteSubDirectoryName?: string;
  };
}

/** Request body for POST directory/getInstitutesDirectories. */
export interface SearchInstitutesRequest {
  beneficiaryRegID: number | null;
  benCallID: number | string | null;
  serviceID1097: number | null;
  createdBy: string;
  instituteDirectoryID: number | null;
  instituteSubDirectoryID: number | null;
  stateID: number | null;
  districtID: number | null;
}

/** One entry saved to POST beneficiary/save/directorySearchHistory. */
export interface SaveDirectoryHistoryItem {
  beneficiaryRegID: number | null;
  benCallID: number | string | null;
  institutionID?: number;
  instituteDirectoryID?: number;
  instituteSubDirectoryID?: number;
  providerServiceMapID?: number;
  createdBy: string;
}

/** One row from the directory search history. */
export interface DirectoryHistoryRow {
  instituteDirectory?: { instituteDirectoryName?: string };
  instituteSubDirectory?: { instituteSubDirectoryName?: string };
  institute?: { institutionName?: string; address?: string };
}

/** getRegistrationDataV1 payload (only the `directory` list is consumed here). */
export interface RegistrationDirectoryData {
  directory?: DirectoryItem[];
}

/** getSubDirectory payload (`subDirectory` list). */
export interface SubDirectoryData {
  subDirectory?: SubDirectoryItem[];
}
