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
 * always-on tabs (health advice, the diabetic and BP screenings) are shown
 * for every HAO agent; the rest are gated by {@link HaoScreenName}. (SNOMED
 * and CDSS are not tabs — they live inside the Health Advisory case sheet,
 * which supplies their chief complaint. There is no SMS tab: legacy sends an
 * SMS as a side effect of saving the case sheet, not a screen of its own.
 * Prescription is not a tab either: legacy gates it to MO only, so it lives
 * in the case sheet's MO-only Prescription control, not the service tabs.)
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
 * sheet. The id field is `diseasesummaryID` (verified against the UAT response,
 * not `diseaseID`).
 */
export interface AvailableDisease {
  diseasesummaryID: number;
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
  /** True when the call is on behalf of the caller themselves (legacy `isSelf`). */
  isSelf?: boolean;
  /** CDSS-derived action, editable by the agent (legacy `addedAdvice`). */
  addedAdvice?: string | null;
  /** Required, role-labelled action field (legacy `actionByHAO`). */
  actionByHAO?: string | null;
  /** Required, role-labelled action field (legacy `actionByMO`). */
  actionByMO?: string | null;
  /** Patient's age unit when entered as "Other" under HAO (legacy `ageUnits`). */
  ageUnits?: string | null;
  /** Patient's date of birth when entered as "Other" under HAO (legacy `dOB`). */
  dOB?: string | null;
  /** True once the COVID (QC) section has been filled (legacy `isCOVIDAvailable`). */
  isCOVIDAvailable?: boolean;
  travel_14days?: string | null;
  travel_type?: string | null;
  travelledFrom?: string | null;
  travelledTo?: string | null;
  modeOfTravel?: string | null;
  symptoms?: string | null;
  COVID19_contact_history?: string | null;
  medical_consultation?: string | null;
  riskLevel?: string | null;
  treatmentRecommendation?: string | null;
  categoryID?: number | null;
  subCategoryID?: number | null;
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
  isSelf?: boolean;
  addedAdvice?: string | null;
  actionByHAO?: string | null;
  actionByMO?: string | null;
  riskLevel?: string | null;
  treatmentRecommendation?: string | null;
  categoryID?: number | null;
  subCategoryID?: number | null;
  [key: string]: unknown;
}

/**
 * One entry in the beneficiary's prior 104 case sheets, returned by
 * `beneficiary/get104BenMedHistory` ({104}). Field names keep the legacy
 * spelling (`selecteDiagnosis`, `addedAdvice`) since that is the wire
 * contract, ported from the Angular 4 `case-sheet-history.html` list.
 */
export interface CaseSheetHistoryEntry {
  benHistoryID?: number;
  requestID?: number;
  createdDate?: string;
  patientName?: string;
  patientAge?: number | string;
  diseaseSummary?: string;
  selecteDiagnosis?: string;
  isChiefComplaint?: boolean;
  algorithm?: string;
  riskLevel?: string;
  addedAdvice?: string;
  actionByHAO?: string;
  actionByMO?: string;
  actionByPD?: string;
  treatmentRecommendation?: string;
  [key: string]: unknown;
}

// --- Closure --------------------------------------------------------------

/**
 * A selectable call sub-type, nested under a {@link CallType} group in the
 * `call/getCallTypesV1` response (shape verified against UAT). The Sub-Type
 * dropdown shows {@link callTypeDesc} and stores {@link callTypeID};
 * {@link fitToBlock} rides along into the closure payload. There is NO separate
 * sub-type endpoint — sub-types are the group's nested {@link CallType.callTypes}.
 */
export interface CallSubType {
  callTypeID: number;
  /** Human label for the sub-type, e.g. "For Call Disconnect". */
  callTypeDesc: string;
  /** Owning group name, repeated on each sub-type by the backend. */
  callGroupType: string;
  isInbound: boolean;
  isOutbound: boolean;
  /** Whether choosing this sub-type blocks the caller's number. */
  fitToBlock: boolean;
  fitForFollowUp: boolean;
  [key: string]: unknown;
}

/**
 * A call-type group returned by `call/getCallTypesV1` (shape verified against
 * UAT). The Call Type dropdown shows {@link callGroupType}; its
 * {@link callTypes} are the sub-types for the Sub-Type dropdown.
 */
export interface CallType {
  callGroupType: string;
  callTypes: CallSubType[];
  [key: string]: unknown;
}

/**
 * Disposition payload for `call/closeCall`, mirroring the legacy closure
 * request field names (verified against the Angular 4 `closure.component`):
 * `callType` is the selected group, `callTypeID` the chosen sub-type id, and
 * `fitToBlock` is carried from that sub-type. Remarks map to `requestedFor`,
 * the follow-up datetime to `prefferedDateTime` (legacy spelling), and the
 * selected service id to `providerServiceMapID`. The HAO workspace is inbound,
 * so `IsOutbound` is false; `endCall` is true on Submit & Close.
 */
export interface CloseCallRequest {
  benCallID: string;
  callID?: string | null;
  beneficiaryRegID?: number | null;
  /** Selected call-type group, e.g. "Valid" / "Transfer". */
  callType: string;
  /** Chosen sub-type id from the group's nested {@link CallType.callTypes}. */
  callTypeID: number;
  /** Carried from the chosen sub-type's {@link CallSubType.fitToBlock}. */
  fitToBlock: boolean;
  isFollowupRequired: boolean;
  /** Follow-up datetime; present only when {@link isFollowupRequired} (legacy name). */
  prefferedDateTime?: string | null;
  /**
   * Feature (screen) the follow-up routes back to; present only when
   * {@link isFollowupRequired} — the role's own screen, or the agent's
   * explicit choice when they hold more than one (legacy `requestedFeature`).
   */
  requestedFeature?: string | null;
  /** Remarks (legacy field name). */
  requestedFor?: string | null;
  isEmergency: boolean;
  isSuicidal: boolean;
  /**
   * Whether an IVR feedback call is required (legacy `isFeedbackRequiredFlag`),
   * only meaningful — and only shown to the agent — when {@link callType} is
   * "Valid".
   */
  isFeedback: boolean;
  /** Selected service id (legacy sent `current_service.serviceID` here). */
  providerServiceMapID: number | null;
  agentID: number | null;
  /** True on Submit & Close; false on Submit & Continue. */
  endCall: boolean;
  /** HAO workspace is the inbound flow. */
  IsOutbound: boolean;
  createdBy: string;
  externalRefferal?: string | null;
  instTypeId?: number | null;
  instNames?: string[] | null;
  /** Logged-in user's own id (legacy `saved_data.uid`), distinct from the telephony {@link agentID}. */
  callEndUserID?: number | null;
  /** Agent IP, resolved via `cti/getAgentIPAddress`; null when unavailable. */
  agentIPAddress?: string | null;
}

export interface InstituteType {
  institutionTypeID: number;
  institutionType: string;
  [key: string]: unknown;
}

export interface InstituteName {
  institutionID?: number;
  institutionName: string;
  [key: string]: unknown;
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

export interface AvailableService {
  subServiceName: string;
  subServiceID?: number;
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
 * sent only when a skill was chosen ({@link skillTransferFlag}). `callType`/
 * `callTypeID` are always sent, sourced from the same mandatory Call Type /
 * Call Sub-Type selection as {@link CloseCallRequest} — legacy's
 * `transferCallToCampaign` reads them off the same closure form values used
 * to build `closeCall`, unconditionally, not only on a skill transfer.
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
  /** Selected call-type group, same value {@link CloseCallRequest.callType} sends. */
  callType: string;
  /** Chosen sub-type id, same value {@link CloseCallRequest.callTypeID} sends. */
  callTypeID: number;
}

// --- COVID vaccine status (case sheet) --------------------------------------

export interface CovidVaccineType {
  covidVaccineTypeID: number;
  vaccineType: string;
  [key: string]: unknown;
}

export interface CovidDoseType {
  covidDoseTypeID: number;
  doseType: string;
  [key: string]: unknown;
}

export interface CovidVaccineMasterData {
  vaccineType: CovidVaccineType[];
  doseType: CovidDoseType[];
}

export interface CovidVaccinationDetails {
  covidVSID?: number | null;
  vaccineStatus?: 'YES' | 'NO' | null;
  covidVaccineTypeID?: number | null;
  doseTypeID?: number | null;
}

export interface SaveCovidVaccinationRequest {
  covidVSID?: number | null;
  beneficiaryRegID: number;
  vaccineStatus: 'YES' | 'NO';
  covidVaccineTypeID?: number | null;
  doseTypeID?: number | null;
  providerServiceMapID?: number | null;
  createdBy: string;
  modifiedBy?: string | null;
}

export interface GuidelineCategory {
  categoryID: number;
  categoryName: string;
  isWellBeing?: boolean | null;
  [key: string]: unknown;
}

export interface GuidelineSubCategory {
  subCategoryID: number;
  subCategoryName: string;
  [key: string]: unknown;
}

export interface GuidelineDetail {
  subCategoryName?: string | null;
  subCatFilePath?: string | null;
  fileManger?: { fileName?: string | null }[];
  [key: string]: unknown;
}
