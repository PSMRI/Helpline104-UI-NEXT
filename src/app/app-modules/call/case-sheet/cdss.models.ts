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
 * Types for the CDSS (Clinical Decision Support System) flow, derived from the
 * legacy `cdss-dialog` (in `case-sheet.component.ts`), `algo-component`, and
 * `CDSSService`. All CDSS endpoints are POST on the 104 API under `CDSS/`:
 *   - CDSS/Symptoms     (chief complaints for age + gender)
 *   - CDSS/getQuestions (questionnaire for a chief complaint)
 *   - CDSS/getResult    (suggested diagnoses + advice for a picked question)
 *   - CDSS/saveSymptom  (persist a selected symptom)
 *
 * The backend returns PascalCase keys (`Disease`, `Symptoms`, …); the service
 * normalises them into the camelCase shapes the component consumes. `Raw*`
 * interfaces model the wire format; the others model the normalised UI shapes.
 */

/** Standard AMRIT API envelope (shared shape used across the app's services). */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised CDSS-API error the component can display. */
export interface CdssError {
  status: number;
  errorMessage: string;
}

/** Gender code the CDSS API expects (first letter of the gender name). */
export type CdssGender = 'M' | 'F' | 'T';

/** Request body for POST CDSS/Symptoms (chief complaints for a patient). */
export interface CdssChiefComplaintsRequest {
  age: number;
  gender: CdssGender;
}

/** Request body for POST CDSS/getQuestions. */
export interface CdssPatientContext {
  age: number;
  gender: CdssGender;
  /** The chief complaint text (e.g. the selected SNOMED term). */
  symptom: string;
}

/** Request body for POST CDSS/getResult (pick a question from the set). */
export interface CdssQuestionSelection {
  /** The questionnaire id returned by getQuestions. */
  complaintId: number;
  /** Zero-based index of the chosen question within the set. */
  selected: number;
}

// --- Wire formats (backend PascalCase) --------------------------------------

/** One question as returned by getQuestions. */
export interface RawCdssQuestion {
  question?: string;
  isEmergency?: boolean;
}

/** The getQuestions payload (`data`). */
export interface RawCdssQuestionSet {
  id?: number;
  disease?: string;
  Questions?: RawCdssQuestion[];
}

/** One suggested diagnosis as returned by getResult. */
export interface RawCdssDiagnosis {
  Disease?: string;
  Symptoms?: string[];
  Information?: string[];
  DoDonts?: string[];
  SelfCare?: string[];
  Action?: string[];
}

// --- Normalised UI shapes ----------------------------------------------------

/** A refining question the agent picks to narrow the differential. */
export interface CdssQuestion {
  question: string;
  isEmergency: boolean;
}

/** The questionnaire for a chief complaint. */
export interface CdssQuestionnaire {
  id: number;
  disease: string;
  questions: CdssQuestion[];
}

/** A suggested diagnosis with its associated health advice. */
export interface CdssDiagnosis {
  disease: string;
  symptoms: string[];
  information: string[];
  dosDonts: string[];
  selfCare: string[];
  action: string[];
}

/** A diagnosis the agent accepted, with the symptoms they marked present. */
export interface CdssAcceptedDiagnosis {
  disease: string;
  symptoms: string[];
  action: string;
}

/**
 * The outcome emitted to the parent (case sheet) when the agent accepts CDSS
 * suggestions: the accepted diagnoses plus a (possibly edited) recommended
 * action. Mirrors the legacy `diseasess` array + derived recommended-action.
 */
export interface CdssSelection {
  diagnoses: CdssAcceptedDiagnosis[];
  recommendedAction: string;
}
