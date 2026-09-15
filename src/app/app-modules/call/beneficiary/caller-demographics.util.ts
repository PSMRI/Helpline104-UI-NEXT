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

import { CallerDemographics } from '../call.store';
import { BeneficiaryRecord } from './beneficiary.models';

/** Caller demographics from a beneficiary record (search result or `call/startCall` `i_beneficiary`). */
export function toCallerDemographics(detail: BeneficiaryRecord): CallerDemographics {
  const demo = detail.i_bendemographics;
  const ageInYears = detail.ageUnits === undefined || /year/i.test(detail.ageUnits) ? (detail.actualAge ?? null) : null;
  return {
    firstName: detail.firstName ?? null,
    lastName: detail.lastName ?? null,
    age: ageInYears,
    genderId: detail.m_gender?.genderID ?? null,
    genderName: detail.m_gender?.genderName ?? null,
    displayId: String(detail.beneficiaryID ?? detail.beneficiaryRegID),
    stateName: demo?.m_state?.stateName ?? null,
    districtName: demo?.m_district?.districtName ?? null,
    subDistrictName: demo?.m_districtbranchmapping?.blockName ?? null,
    villageName: demo?.m_districtbranchmapping?.villageName ?? null,
    maritalStatus: detail.maritalStatus?.status ?? null,
    category:
      demo?.healthCareWorkerID != null
        ? `Healthcare Worker: ${demo.healthCareWorkerType?.healthCareWorkerType ?? ''}`.trim()
        : 'General Public',
    communityName: demo?.communityName ?? null,
    educationName: demo?.educationName ?? null,
  };
}
