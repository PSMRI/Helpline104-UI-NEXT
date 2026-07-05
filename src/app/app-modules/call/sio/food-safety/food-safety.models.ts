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
 * Types for the Food Safety (food complaint) service tab, derived from the
 * legacy food-complaint flow. Endpoints (both 104 base):
 * `beneficiary/get/foodComplaintDetails` and
 * `beneficiary/save/foodComplaintDetails`. The complaint types are a fixed
 * local list rather than a master lookup. The legacy outbound dialling / SMS
 * flow is a separate outbound concern and is intentionally not part of this
 * inbound capture tab.
 */

/** A fixed food-complaint type option (value = the label string). */
export interface ComplaintTypeOption {
  value: string;
}

/** Request body for POST beneficiary/save/foodComplaintDetails. */
export interface SaveFoodComplaintRequest {
  beneficiaryRegID: number | null;
  benCallID: string | null;
  patientName: string;
  patientAge: number | null;
  patientGenderID: number | null;
  typeOfRequest: string;
  historyOfDiet: string;
  typeOfFood: string;
  foodConsumedFrom: string;
  associatedSymptoms: string | null;
  fromWhen: string | null;
  /** Symptom flags carry the "1"/"0" strings. */
  isDiarrhea: string;
  isVomiting: string;
  isAbdominalPain: string;
  isChillsOrRigors: string;
  isGiddiness: string;
  isDehydration: string;
  isRashes: string;
  isFoodConsumed: string;
  districtID: number | null;
  districtBlockID: number | null;
  villageID: number | null;
  feedbackTypeID: number | null;
  isSelf: boolean;
  remarks: string | null;
  serviceID: number | null;
  createdBy: string;
}

/** One row of the food-complaint history (`beneficiary/get/foodComplaintDetails`). */
export interface FoodComplaintRow {
  requestID?: number | string;
  historyOfDiet?: string;
  isFoodConsumed?: string;
  typeOfFood?: string;
  foodConsumedFrom?: string;
  associatedSymptoms?: string;
  typeOfRequest?: string;
  remarks?: string;
  createdDate?: string;
  [key: string]: unknown;
}
