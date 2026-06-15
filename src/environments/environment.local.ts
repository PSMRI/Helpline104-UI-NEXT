/*
 * AMRIT – Accessible Medical Records via Integrated Technology
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

// Local development against backend services running on localhost.
// To use this file locally, copy it to `environment.ts` (which is git-ignored
// and is the file the Angular build replaces per configuration).

const sessionStorageEncKey = '';
const commonAPI = 'http://localhost:8083/';
const tmAPI = 'http://localhost:8089/';
const mmuAPI = 'http://localhost:8087/';
const adminAPI = 'http://localhost:8082/';
const telephoneServer = 'http://uatcz.piramalswasthya.org/';
const fhirAPI = 'http://localhost:8093/';
const API1097 = 'http://localhost:8090/';
const API104 = 'http://localhost:8081/';
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
};
