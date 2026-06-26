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
 * Shapes for the account-recovery flows (forgot password, set password, and
 * first-login security-question setup), derived from the legacy 104 endpoints
 * documented in docs/AUTH_FLOWS_AUDIT.md.
 */

/** Common envelope returned by the 104 common-api endpoints. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
  status?: string;
}

/** A normalised recovery-flow error a component can display. */
export interface RecoveryError {
  status: number;
  errorMessage: string;
}

/**
 * Backend status code returned by `user/forgetPassword` when the username is
 * not registered. It is deliberately the SAME neutral response shown for a
 * registered user with no questions, so the UI never confirms or denies that an
 * account exists (username-enumeration protection — see audit §0).
 */
export const NEUTRAL_FORGOT_PASSWORD_CODE = 5002;

/** One security question returned by `user/forgetPassword`. */
export interface SecurityQuestion {
  questionId: number;
  question: string;
}

/** `data` payload of a successful `user/forgetPassword` response. */
export interface ForgetPasswordData {
  forgetPassword?: string;
  SecurityQuesAns?: SecurityQuestion[];
}

/**
 * Outcome of requesting security questions for a username.
 *  - `questions`: the user is registered and has questions — proceed to answer.
 *  - `neutral`: registered-or-not is intentionally indistinguishable; show the
 *    neutral message and do not advance.
 */
export type ForgetPasswordResult =
  | { kind: 'questions'; questions: SecurityQuestion[] }
  | { kind: 'neutral'; message: string };

/** One answered question sent to `user/validateSecurityQuestionAndAnswer`. */
export interface SecurityAnswer {
  questionId: number;
  answer: string;
}

/** `data` payload of a successful answer-validation response. */
export interface ValidateAnswersData {
  transactionId: string;
}

/**
 * One question option for the first-login setup, returned by
 * `user/getsecurityquetions`. Note the different casing from
 * {@link SecurityQuestion} — it mirrors the legacy endpoint contract.
 */
export interface SecurityQuestionOption {
  QuestionID: number;
  Question: string;
}

/** One question/answer row sent to `user/saveUserSecurityQuesAns`. */
export interface SaveSecurityQuesAns {
  userID: number;
  questionID: number;
  answers: string;
  /** Collected from the user when available; never hardcoded (audit finding #2). */
  mobileNumber: string;
  createdBy: string;
}
