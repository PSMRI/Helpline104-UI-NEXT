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
 * Shapes for the HAO (Health Assistant Officer) workspace, derived from the
 * legacy `104-hao` flow and its `case-sheet` / `closure` / `callservice`
 * dependencies documented in docs/INBOUND_CALL_AUDIT.md (§3, §4.4–4.6).
 *
 * The legacy endpoints are loosely typed JSON; only the fields the rebuilt
 * workspace reads/writes are typed strictly, with index signatures preserving
 * the rest so the contract is not narrowed beyond what is verified.
 */

/** Common envelope returned by the 104 common-api / ip104 endpoints. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
  status?: string;
}

/**
 * Screen names a 104 role can hold (from `serviceRoleScreenMappings`). They gate
 * which service tabs the HAO workspace renders — mirroring the legacy
 * `screens.includes(...)` guards on the `<md-tab-group>`.
 */
export type HaoScreenName =
  | 'Health_Advice'
  | 'Registration'
  | 'Blood Request'
  | 'Directory Information Service'
  | 'Epidemic Outbreak Service'
  | 'Food safety'
  | 'Grievance'
  | 'Organ Donation'
  | 'Health schemes'
  | 'Covid19 for 104 services'
  | 'IMR MMR Information'
  | 'Bal Vivah';

/**
 * Stable identifiers for the service tabs of the "Provide Service" step. The
 * three screening tabs (health advice, diabetic, BP) are always shown; the rest
 * are gated by {@link HaoScreenName}.
 */
export type HaoServiceId =
  | 'healthAdvice'
  | 'diabeticScreening'
  | 'bpScreening'
  | 'bloodOnCall'
  | 'directory'
  | 'epidemic'
  | 'foodSafety'
  | 'grievance'
  | 'organDonation'
  | 'schemes'
  | 'covid19'
  | 'imrMmr'
  | 'balVivah';

// --- Case sheet (primary Health Advisory service) -------------------------

/**
 * A diagnosis option returned by `diseaseController/getAvailableDiseases`
 * ({104}), used to populate the provisional-diagnosis selector on the case
 * sheet.
 */
export interface AvailableDisease {
  diseaseID: number;
  diseaseName: string;
  [key: string]: unknown;
}

/**
 * Case-sheet payload saved via `beneficiary/save/benCaseSheet` ({104}). A
 * focused subset of the legacy case sheet — the fields the Health Advisory form
 * captures. On a successful save the workspace marks the call "service availed".
 */
export interface CaseSheetRequest {
  beneficiaryRegID: number;
  benFlowID?: number | null;
  /** AMRIT call id, linked once the call is registered with the backend. */
  benCallID?: string | null;
  /** Patient's reported complaint(s). */
  chiefComplaints: string;
  /** Selected provisional diagnosis disease id, or null when free-text only. */
  provisionalDiagnosisID?: number | null;
  provisionalDiagnosis?: string | null;
  /** Health advice / counselling given to the caller. */
  healthAdvice?: string | null;
  remarks?: string | null;
  providerServiceMapID?: number | null;
  createdBy: string;
}

/** Response of a successful `beneficiary/save/benCaseSheet`. */
export interface CaseSheetResponse {
  caseSheetID?: number;
  benCaseSheetID?: number;
  [key: string]: unknown;
}

/**
 * Existing case sheet fetched by `beneficiary/getPresentCaseSheet` ({104}) for
 * the active beneficiary, used to pre-fill the form on re-entry.
 */
export interface PresentCaseSheet {
  chiefComplaints?: string | null;
  provisionalDiagnosisID?: number | null;
  provisionalDiagnosis?: string | null;
  healthAdvice?: string | null;
  remarks?: string | null;
  [key: string]: unknown;
}

// --- Closure --------------------------------------------------------------

/** A call sub-type nested under a {@link CallType} (`call/getCallTypesV1`). */
export interface CallSubType {
  callSubTypeID: number;
  callSubType: string;
  [key: string]: unknown;
}

/** A mandatory call disposition type returned by `call/getCallTypesV1`. */
export interface CallType {
  callTypeID: number;
  callType: string;
  subType?: CallSubType[];
  [key: string]: unknown;
}

/**
 * Disposition payload for `call/closeCall`. Call Type / Call Sub-Type are
 * mandatory in the legacy closure; follow-up date is required only when
 * follow-up is requested.
 */
export interface CloseCallRequest {
  benCallID: string;
  callID?: string | null;
  beneficiaryRegID?: number | null;
  callTypeID: number;
  callSubTypeID: number | null;
  isFollowupRequired: boolean;
  /** ISO date (yyyy-MM-dd); present only when {@link isFollowupRequired}. */
  followUpDate?: string | null;
  isEmergency: boolean;
  isSuicidal: boolean;
  remarks?: string | null;
  /** True once any service was saved during the call (marks the call valid). */
  isServiceAvailed: boolean;
  createdBy: string;
}

/**
 * A campaign the call can be transferred to (`cti/getTransferCampaigns`). The
 * legacy contract identifies a campaign by name — that value is what
 * {@link HaoService.getCampaignSkills} and the transfer payload pass along.
 */
export interface TransferCampaign {
  campaignName: string;
  [key: string]: unknown;
}

/** A skill within a transfer campaign (`cti/getCampaignSkills`). */
export interface CampaignSkill {
  skillName: string;
  [key: string]: unknown;
}

/**
 * Payload for `cti/transferCall`, mirroring the legacy `transferToCampaign`
 * request body (snake_case keys are applied in {@link HaoService}). `skill` is
 * sent only when a skill was chosen ({@link skillTransferFlag}).
 */
export interface TransferCallRequest {
  /** Transferring agent's id (`transfer_from`). */
  transferFrom: number;
  /** Selected campaign name (`transfer_campaign_info`). */
  transferCampaignInfo: string;
  /** Whether the transfer is skill-based (`skill_transfer_flag`). */
  skillTransferFlag: boolean;
  /** Chosen skill, when {@link skillTransferFlag} is true. */
  skill?: string | null;
  /** Agent IP, resolved via `cti/getAgentIPAddress`; null when unavailable. */
  agentIPAddress?: string | null;
  benCallID: string;
}
