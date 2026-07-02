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

// Shared AMRIT development environment.
// Host and gateway prefixes verified against UAT: the APIMAN routes are
// hyphenated with no version suffix (common-api, admin-api, 104-api, ...).
// The earlier `*-v1.0` prefixes returned nginx 500 and were never valid.

const devHost = 'https://amritwprdev.piramalswasthya.org/';

const sessionStorageEncKey = '';
const commonAPI = `${devHost}common-api/`;
const tmAPI = `${devHost}tm-api/`;
const mmuAPI = `${devHost}mmu-api/`;
const adminAPI = `${devHost}admin-api/`;
const telephoneServer = 'https://uatcz.piramalswasthya.org/';
const fhirAPI = `${devHost}fhir-api/`;
const API1097 = `${devHost}1097-api/`;
const API104 = `${devHost}104-api/`;
const siteKey = '';
const captchaChallengeURL = '';
const enableCaptcha = false;

export const environment = {
  production: false,
  encKey: sessionStorageEncKey,
  commonAPI: commonAPI,
  ip1097: API1097,
  telephoneServer: telephoneServer,
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
