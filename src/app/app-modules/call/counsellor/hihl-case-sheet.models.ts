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

export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

export interface HihlError {
  status: number;
  errorMessage: string;
}

export type DurationUnit = 'Hours' | 'Days' | 'Weeks' | 'Months' | 'Years';

export interface PsychiatricChiefComplaintOption {
  psychiatricChiefComplaintId: number;
  psychiatricChiefComplaintName: string;
  snomedCtCode?: string | null;
}

export interface AppetiteOption {
  appetiteName: string;
}

export interface SleepOption {
  slipName: string;
}

export interface HygieneOption {
  hygieneseSelfCareName: string;
}

export interface BladderOption {
  bladderName: string;
}

export interface BowelOption {
  bowelName: string;
}

export interface LibidoOption {
  libidoName: string;
}

export interface RegularWorkOption {
  regularWorkName: string;
}

export interface IssueAtWorkplaceOption {
  issueAtWorkPlaceName: string;
}

export interface HouseholdWorkOption {
  houseHoldWorkName: string;
}

export interface GettingWithFamilyOption {
  gettingWithFamilyName: string;
}

export interface PrecipitatingFactorOption {
  precipitatingFactorName: string;
}

export interface PastPsychiatricConditionOption {
  pastPsychiatricConditionId: number;
  pastPsychiatricConditionName: string;
}

export interface TreatmentTypeOption {
  treatmentTypeName: string;
}

export interface ProgressOption {
  progressName: string;
}

export interface CourseOption {
  courseName: string;
}

export interface PastMedicalConditionOption {
  pastMedicalConditionId: number;
  pastMedicalConditionName: string;
}

export interface FamilyConditionOption {
  familyConditionId: number;
  familyConditionName: string;
}

export interface RelationshipOption {
  relationShipName: string;
}

/** Raw master-data envelope from `GET hihl/get/masters` (legacy property names, unchanged). */
export interface HihlMasterData {
  psychiatricChiefComplaints?: PsychiatricChiefComplaintOption[];
  m_104appetite?: AppetiteOption[];
  m_104sleep?: SleepOption[];
  m_104hygieneselfcare?: HygieneOption[];
  m_104bladder?: BladderOption[];
  m_104bowel?: BowelOption[];
  m_104libido?: LibidoOption[];
  m_104regularworok?: RegularWorkOption[];
  m_104issuesatworkplace?: IssueAtWorkplaceOption[];
  m_104householdwork?: HouseholdWorkOption[];
  m_104gettingwithfamily?: GettingWithFamilyOption[];
  m_104precipitatingfactor?: PrecipitatingFactorOption[];
  m_104pastpsychiatriccondition?: PastPsychiatricConditionOption[];
  m_104treatmenttype?: TreatmentTypeOption[];
  m_104progress?: ProgressOption[];
  m_104course?: CourseOption[];
  m_104pastmedicalcondition?: PastMedicalConditionOption[];
  m_104familycondition?: FamilyConditionOption[];
  m_104relationship?: RelationshipOption[];
}

export interface ChiefComplaintSaveRow {
  chiefComplaintID: number | string | null;
  chiefComplaint: string | null;
  description: string | null;
  duration: number | null;
  unitOfDuration: DurationUnit | null;
}

export interface PastPsychiatricConditionSaveRow {
  pastPsychiatricCondition: string | null;
  pastPsychiatricConditionID: number | null;
  mediciationType: string | null;
  psychiatricDrugsMedicationDetails: string | null;
  duration: number | null;
  unitOfDuration: DurationUnit | null;
  progress: string | null;
  course: string | null;
  typeOfTreatment: string | null;
}

export interface PastMedicalConditionSaveRow {
  pastMedicalCondition: string | null;
  pastMedicalConditionID: number | null;
  otherPastMedicalCondition: string | null;
  duration: number | null;
  unitOfDuration: DurationUnit | null;
}

export interface FamilyDiseaseSaveRow {
  familyCondition: FamilyConditionOption | null;
  familyMembers: string[] | null;
}

export interface HihlSaveRequest {
  chiefComplaints: ChiefComplaintSaveRow[] | null;
  biologicalFunctioning: {
    appetite: string | null;
    sleep: string[] | null;
    hygieneAndTakingCare: string | null;
    bladder: string | null;
    bowel: string | null;
    sexualLibido: string | null;
  };
  occupationalFunctioning: {
    goingToWork: string | null;
    issuesAtWorkplace: string | null;
  };
  socialFunctioning: {
    householdWork: string | null;
    gettingAlong: string | null;
  };
  treatmentDetails: string | null;
  precipitatingFactors: string[] | null;
  concurrentMedicalCondition: string | null;
  pastHistory: {
    pastPsychiatricConditions: PastPsychiatricConditionSaveRow[] | null;
    pastMedicalConditions: PastMedicalConditionSaveRow[] | null;
  };
  currentDrugsMedication: string | null;
  conditionInFamilyList: FamilyDiseaseSaveRow[] | null;
  personalAndSocialHistory: string | null;
  mentalStatusExamination: string | null;
  summary: string | null;
  beneficiaryRegID: number;
  benCallID: string | null;
  providerServiceMapID: number | null;
  createdBy: string;
}

export interface HihlHistoryRow {
  chiefComplaints?: Array<{ chiefComplaint?: string | null } | null> | null;
  biologicalFunctioning?: {
    appetite?: string | null;
    sleep?: string | null;
    hygieneAndTakingCare?: string | null;
    bladder?: string | null;
    bowel?: string | null;
    sexualLibido?: string | null;
  } | null;
  occupationalFunctioning?: {
    goingToWork?: string | null;
    issuesAtWorkplace?: string | null;
  } | null;
  socialFunctioning?: {
    householdWork?: string | null;
    gettingAlong?: string | null;
  } | null;
  treatmentDetails?: string | null;
  precipitatingFactors?: string | null;
  concurrentMedicalCondition?: string | null;
  pastHistory?: {
    pastPsychiatricConditions?: Array<{ pastPsychiatricCondition?: string | null } | null> | null;
    pastMedicalConditions?: Array<{ pastMedicalCondition?: string | null } | null> | null;
  } | null;
  currentDrugsMedication?: string | null;
  conditionInFamilyList?: Array<{ familyCondition?: { familyConditionName?: string | null } | null } | null> | null;
  personalAndSocialHistory?: string | null;
  mentalStatusExamination?: string | null;
  summary?: string | null;
}
