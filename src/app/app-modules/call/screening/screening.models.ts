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
 * Types for the disease-screening questionnaires (Diabetic + BP), derived from
 * the legacy `DiseaseScreeningService`, `DiabeticScreeningComponent` and
 * `BPScreeningComponent`. Endpoints:
 *   - POST questionTypeController/get/questionTypeList  (common API) — question types
 *   - POST beneficiary/get/questions                   (104 API)   — questions for a type
 *   - POST beneficiary/save/benCaseSheet               (104 API)   — save screening as a case-sheet row
 *
 * Both screening tabs share this service/model set, exactly as the legacy app
 * used one `DiseaseScreeningService` for both.
 */

/** Standard AMRIT API envelope. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised screening-API error the component can display. */
export interface ScreeningError {
  status: number;
  errorMessage: string;
}

/** A question-type row from questionTypeController/get/questionTypeList. */
export interface QuestionType {
  questionTypeID: number;
  questionType: string;
}

/** Legacy `questionType` names used to pick the relevant question sets. */
export const QUESTION_TYPE = {
  diabetic: 'Diabetic',
  diabeticRiskFactors: 'Diabetic-Risk Factors',
  bp: 'BP',
} as const;

/** One selectable answer/score for a question (legacy `m_104QuestionScore`). */
export interface QuestionScore {
  iD?: number;
  questionID?: number;
  /** Display text and the value used for answer-valued questions. */
  answer: string;
  /** Numeric (or numeric-string) score, summed for the diabetic risk score. */
  score: number | string;
}

/** One screening question with its answer options. */
export interface ScreeningQuestion {
  questionID: number;
  question: string;
  /** Machine tag (e.g. "UI Constant - Diabetic Stress"); not shown to the agent. */
  questionDesc?: string;
  /** BP hides rank-0 questions. */
  questionRank?: number;
  m_104QuestionScore: QuestionScore[];
}

/** Request body for POST beneficiary/get/questions. */
export interface QuestionsRequest {
  questionTypeID: number;
  providerServiceMapID: number | null;
}

/**
 * Request body for POST beneficiary/save/benCaseSheet — a screening result
 * saved as a case-sheet history row (mirrors the legacy `caseSheetObj`).
 */
export interface SaveScreeningRequest {
  beneficiaryRegID: number | null;
  /** Screen tag: 'diabetic' or 'Hyper Tension'. */
  diseaseSummary: string;
  actionByHAO: string;
  deleted: boolean;
  createdBy: string;
  patientName: string;
  patientAge: number | null;
  patientGenderID: number | null;
}

/** Response from beneficiary/save/benCaseSheet. */
export interface SaveScreeningResponse {
  benHistoryID?: number;
  [key: string]: unknown;
}
