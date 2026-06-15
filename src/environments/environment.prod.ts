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
// NOTE: host and API path suffixes are placeholders following the AMRIT v1.0
// naming convention. Confirm the real production hostnames with the deploy team.
// CAPTCHA is disabled here only because no production credentials exist yet.
// Before go-live, set siteKey + captchaChallengeURL to the real production
// values and flip enableCaptcha to true (tracked on PR #1).

const prodHost = 'https://amrit.piramalswasthya.org/';

const sessionStorageEncKey = '';
const commonAPI = `${prodHost}commonapi-v1.0/`;
const tmAPI = `${prodHost}tmapi-v1.0/`;
const mmuAPI = `${prodHost}mmuapi-v1.0/`;
const adminAPI = `${prodHost}adminapi-v1.0/`;
const telephoneServer = 'https://cz.piramalswasthya.org/';
const fhirAPI = `${prodHost}fhirapi-v1.0/`;
const API1097 = `${prodHost}1097api-v1.0/`;
const API104 = `${prodHost}104api-v1.0/`;
const siteKey = '';
const captchaChallengeURL = '';
const enableCaptcha = false;

export const environment = {
  production: true,
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
