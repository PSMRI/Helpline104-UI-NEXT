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

// Production environment.
// NOTE: API path prefixes follow the hyphenated APIMAN convention verified on
// UAT (e.g. common-api/). The hostnames are still placeholders — confirm the
// real production hostnames with the deploy team.
// CAPTCHA is disabled here only because no production credentials exist yet.
// Before go-live, set siteKey + captchaChallengeURL to the real production
// values and flip enableCaptcha to true (tracked on PR #1).

const prodHost = 'https://amrit.piramalswasthya.org/';

const sessionStorageEncKey = '';
const commonAPI = `${prodHost}common-api/`;
const tmAPI = `${prodHost}tm-api/`;
const mmuAPI = `${prodHost}mmu-api/`;
const adminAPI = `${prodHost}admin-api/`;
const telephoneServer = 'https://cz.piramalswasthya.org/';
const fhirAPI = `${prodHost}fhir-api/`;
// OpenKM document-download base (placeholder — set the real host; no credentials).
const openKmBaseUrl = 'https://amrit.piramalswasthya.org:8084/OpenKM/Download?uuid=';
const API1097 = `${prodHost}1097-api/`;
const API104 = `${prodHost}104-api/`;
const siteKey = '';
const captchaChallengeURL = '';
const enableCaptcha = false;

export const environment = {
  production: true,
  encKey: sessionStorageEncKey,
  commonAPI: commonAPI,
  ip1097: API1097,
  telephoneServer: telephoneServer,
  openKmBaseUrl: openKmBaseUrl,
  adminAPI: adminAPI,
  ip104: API104,
  mmuAPI: mmuAPI,
  tmAPI: tmAPI,
  fhirAPI: fhirAPI,
  siteKey: siteKey,
  captchaChallengeURL: captchaChallengeURL,
  enableCaptcha: enableCaptcha,

  // 104 P0 foundation config
  useApimanKey: true,
  sessionTimeoutMinutes: 27,
};
