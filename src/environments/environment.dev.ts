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
// Host confirmed with mentor. The 104/1097 API path suffixes still follow the
// AMRIT v1.0 naming convention and remain to be confirmed with the backend team.

const devHost = 'https://amritwprdev.piramalswasthya.org/';

const sessionStorageEncKey = '';
const commonAPI = `${devHost}commonapi-v1.0/`;
const tmAPI = `${devHost}tmapi-v1.0/`;
const mmuAPI = `${devHost}mmuapi-v1.0/`;
const adminAPI = `${devHost}adminapi-v1.0/`;
const telephoneServer = 'https://uatcz.piramalswasthya.org/';
const fhirAPI = `${devHost}fhirapi-v1.0/`;
const API1097 = `${devHost}1097api-v1.0/`;
const API104 = `${devHost}104api-v1.0/`;
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
