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
 * Types for the SNOMED CT chief-complaint search, derived from the legacy
 * `cheif-complaint-snomed-search` component and `SnomedService`:
 *   - POST snomed/getSnomedCTRecordList  (paged term search, common API)
 *
 * The legacy call returns `{ sctMaster, pageCount }` inside the standard `data`
 * envelope. Only the fields the rebuilt UI consumes are typed strictly.
 */

/** Standard AMRIT API envelope (shared shape used across the app's services). */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised SNOMED-search error the component can display. */
export interface SnomedError {
  status: number;
  errorMessage: string;
}

/** Request body for POST snomed/getSnomedCTRecordList. */
export interface SnomedSearchRequest {
  term: string;
  pageNo: number;
}

/**
 * One term row as returned by the backend. `conceptID` is a SNOMED CT concept
 * id (SCTID) — up to 18 digits, exceeding `Number.MAX_SAFE_INTEGER`. It is kept
 * as a string end-to-end so a long id survives untouched. Note: precision is
 * only preserved when the backend serialises the id *as a JSON string*; if it
 * sends a bare JSON number that big, `HttpClient`'s `JSON.parse` truncates it
 * before we ever see it. The `| number` here tolerates smaller numeric ids
 * (which the service stringifies); it is not a safeguard against that loss.
 */
export interface RawSnomedTerm {
  conceptID?: string | number;
  term?: string;
}

/** The `data` payload of a getSnomedCTRecordList response. */
export interface SnomedSearchResponse {
  sctMaster?: RawSnomedTerm[];
  pageCount?: number;
}

/**
 * A SNOMED CT term the UI works with and emits on selection. `conceptID` is
 * always a trimmed string here (normalised by {@link SnomedService}).
 */
export interface SnomedTerm {
  conceptID: string;
  term: string;
}
