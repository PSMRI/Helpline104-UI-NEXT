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
 * Types for the Health Scheme lookup service tab, derived from the legacy
 * scheme lookup flow. This tab has no data-entry form: it lists the configured
 * health schemes (with an optional reference document link) and records a
 * search-history entry whenever the agent opens a scheme's document ("avails"
 * it). Endpoints: `beneficiary/get/schemeList` (COMMON base),
 * `beneficiary/save/schemeSearchHistory` and `beneficiary/getSchemeSearchHistory`
 * (both 104 base).
 */

/** A configured health scheme (`beneficiary/get/schemeList`). */
export interface Scheme {
  schemeID: number;
  schemeName?: string;
  schemeDesc?: string;
  kmFilePath?: string;
  kmFileManager?: { fileName?: string };
  [key: string]: unknown;
}

/** One entry of the save-search-history array (`beneficiary/save/schemeSearchHistory`). */
export interface SaveSchemeSearch {
  beneficiaryRegID: number | null;
  benCallID: string | null;
  schemeID: number;
  providerServiceMapID: number | null;
  createdBy: string;
}

/** One row of the scheme search history (`beneficiary/getSchemeSearchHistory`). */
export interface SchemeSearchRow {
  scheme?: { schemeName?: string };
  createdDate?: string;
  [key: string]: unknown;
}
