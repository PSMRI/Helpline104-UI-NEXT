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
 * One disease's summary detail, as consumed by the disease-summary detail
 * modal. Text fields are `$`-delimited in the backend data; the component
 * renders them with newlines (mirroring the legacy `setSummaryDetails`).
 */
export interface DiseaseSummaryDetail {
  diseaseName?: string;
  summary?: string;
  couldbedangerous?: string;
  causes?: string;
  dos_donts?: string;
  symptoms_Signs?: string;
  medicaladvice?: string;
  riskfactors?: string;
  treatment?: string;
  self_care?: string;
  investigations?: string;
}
