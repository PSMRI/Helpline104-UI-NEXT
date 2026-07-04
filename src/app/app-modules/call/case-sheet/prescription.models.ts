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
 * Types for the prescription step of the case sheet, derived from the legacy
 * `prescriptionComponent` and `PrescriptionService`. All endpoints are POST on
 * the 104 API:
 *   - beneficiary/getDrugDetailList    (drugs for the service)
 *   - beneficiary/get/drugStrength     (strengths)
 *   - beneficiary/get/drugFrequency    (frequencies)
 *   - beneficiary/get/prescriptionList (history for the beneficiary)
 *   - beneficiary/save/prescription    (save)
 *
 * `Raw*` model the wire format; the others model the normalised UI shapes.
 */

/** Standard AMRIT API envelope. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised prescription-API error the component can display. */
export interface PrescriptionError {
  status: number;
  errorMessage: string;
}

/**
 * Strength value used by the legacy "Not Applicable" option. The backend
 * expects an empty dosage for NA, so this sentinel is mapped to `''` on save.
 */
export const STRENGTH_NA = 'Not Applicable';

// --- Wire formats ------------------------------------------------------------

/** One drug row from beneficiary/getDrugDetailList. */
export interface RawDrug {
  drugMapID?: number;
  drugName?: string;
  drugGroupID?: number;
  drugGroupName?: string;
}

/** Strength row from beneficiary/get/drugStrength. */
export interface RawDrugStrength {
  drugStrength?: string;
}

/** Frequency row from beneficiary/get/drugFrequency. */
export interface RawDrugFrequency {
  frequency?: string;
}

// --- Normalised UI shapes ----------------------------------------------------

/**
 * One drug the agent can prescribe. A (drugName, drugGroup) pair maps to a
 * unique `drugMapID`, so the "drug group" select carries the `drugMapID`.
 */
export interface Drug {
  drugMapID: number;
  drugName: string;
  drugGroupName: string;
}

/** One line the agent added to the current prescription (view model). */
export interface PrescribedLine {
  drugMapID: number;
  drugName: string;
  drugGroupName: string;
  /** Strength/dosage as shown; `STRENGTH_NA` renders blank and saves as `''`. */
  strength: string;
  route: string;
  frequency: string;
  noOfDays: string;
  remarks: string;
}

// --- Save payload (mirrors the legacy prescriptionObj) -----------------------

/** One prescribed drug in the save payload. */
export interface PrescribedDrug {
  drugMapID: number;
  dosage: string;
  drugRoute: string;
  noOfDays: string;
  frequency: string;
  timeToConsume: string | null;
  sideEffects: string | null;
  deleted: boolean;
  createdBy: string;
}

/** Request body for POST beneficiary/save/prescription. */
export interface SavePrescriptionRequest {
  userID: number | null;
  beneficiaryRegID: number | null;
  benCallID: number | string | null;
  createdBy: string;
  providerServiceMapID: number | null;
  diagnosisProvided: string;
  remarks: string | null;
  prescribedDrugs: PrescribedDrug[];
}

/** Response from beneficiary/save/prescription. */
export interface SavePrescriptionResponse {
  prescriptionID?: number;
  [key: string]: unknown;
}

/** One historical prescription from beneficiary/get/prescriptionList. */
export interface PrescriptionRecord {
  prescriptionID?: number;
  diagnosisProvided?: string;
  remarks?: string;
  createdDate?: string;
  prescribedDrugs?: Array<{
    drugName?: string;
    dosage?: string;
    frequency?: string;
    noOfDays?: string;
  }>;
}
