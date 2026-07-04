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
 * Types for the COVID-19 risk screening, derived from the legacy
 * `Covid19Component` + `CovidserviceService`. Endpoints (104 API):
 *   - GET  master/patient/covidDetails/{providerServiceMapID}
 *   - POST master/save/covidScreeningData
 */

/** Standard AMRIT API envelope. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised COVID-API error the component can display. */
export interface CovidError {
  status: number;
  errorMessage: string;
}

/** A master option (id + label), also used for multi-select checkbox state. */
export interface CovidOption {
  ID?: number | string;
  Value: string;
}

/**
 * COVID master data (subset consumed by the risk screening). Category →
 * sub-category lists are keyed by the category `Value` (legacy switch).
 */
export interface CovidMasterData {
  covid19Category?: CovidOption[];
  medicalAssistance?: CovidOption[];
  foodSupply?: CovidOption[];
  lpgSupply?: CovidOption[];
  strandedAssistance?: CovidOption[];
  lawAndOrder?: CovidOption[];
  essentialServicese?: CovidOption[];
  transportation?: CovidOption[];
  covidReliefFund?: CovidOption[];
  testingPersonMaster?: CovidOption[];
  symptomsMaster?: CovidOption[];
  healthConditionsMaster?: CovidOption[];
  [key: string]: unknown;
}

/** COVID risk bands. */
export type CovidRisk = '' | 'Low Risk' | 'Medium Risk' | 'High Risk';

/**
 * Request body for POST master/save/covidScreeningData (subset of the legacy
 * `covid19Obj`; detailed travel/fever capture is out of scope here).
 */
export interface SaveCovidRequest {
  beneficiaryRegID: string | null;
  benCallID: number | string | null;
  providerServiceMapID: number | null;
  genderID: number | null;
  age: number | null;
  categoryID?: number | string;
  categoryName?: string;
  subCategoryID?: number | string;
  subCategoryName?: string;
  forWhomThisTest?: string;
  isPregnant?: string;
  travelledLast14Days?: string;
  largeGathering?: string;
  publicExposedPlaces?: string;
  famliyPublicExposedPlaces?: string;
  laboratoryConfirmed?: string;
  symptoms?: string[];
  healthConditions?: string[];
  riskOfCovid19: CovidRisk;
  createdBy: string;
}
