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
 * Types for the consolidated SIO services history, derived from the legacy
 * `SioServicesHistoryComponent` + `SioService.getSioHistoryData`. Endpoint (104):
 * `beneficiary/getSioHistory`, body `{ benificiaryRegID }` (the legacy key
 * misspelling is preserved as the backend expects it). The response groups the
 * beneficiary's prior SIO service records into four arrays; the misspelled
 * `t_foodSafetyCopmlaint` key is likewise preserved verbatim.
 */

/** A prior blood request in the SIO history. */
export interface BloodRequestHistoryRow {
  recipientName?: string;
  recipientAge?: number;
  typeOfRequest?: string;
  hospitalAdmitted?: string;
  [key: string]: unknown;
}

/** A prior epidemic-outbreak complaint in the SIO history. */
export interface EpidemicHistoryRow {
  natureOfComplaint?: string;
  totalPeopleAffected?: number | string;
  m_district?: { districtName?: string };
  m_districtblock?: { blockName?: string };
  m_city?: { cityName?: string };
  remarks?: string;
  [key: string]: unknown;
}

/** A prior food-safety complaint in the SIO history. */
export interface FoodSafetyHistoryRow {
  typeOfRequest?: string;
  historyOfDiet?: string;
  typeOfFood?: string;
  foodConsumedFrom?: string;
  isFoodConsumed?: string;
  associatedSymptoms?: string;
  [key: string]: unknown;
}

/** A prior organ-donation request in the SIO history. */
export interface OrganDonationHistoryRow {
  m_donationType?: { donationType?: string };
  m_donatableOrgan?: { donatableOrgan?: string };
  acceptorHospitalID?: number | string;
  remarks?: string;
  [key: string]: unknown;
}

/** The `beneficiary/getSioHistory` payload (misspelled keys preserved). */
export interface SioHistoryData {
  t_bloodRequest?: BloodRequestHistoryRow[];
  t_epidemicOutbreak?: EpidemicHistoryRow[];
  t_foodSafetyCopmlaint?: FoodSafetyHistoryRow[];
  t_organDonation?: OrganDonationHistoryRow[];
  [key: string]: unknown;
}
