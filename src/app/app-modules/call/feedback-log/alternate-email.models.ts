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
 * Types for the alternate-email modal, derived from the legacy
 * `AlernateEmailModelComponent` + `FeedbackService`. Endpoints (common API, POST):
 *   - emailController/getAuthorityEmailID  { districtID }
 *   - emailController/SendEmail            { FeedbackID, emailID, is1097 }
 */

/** Standard AMRIT API envelope. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised error the modal can display. */
export interface AlternateEmailError {
  status: number;
  errorMessage: string;
}

/** Request body for `emailController/SendEmail`. */
export interface SendEmailRequest {
  FeedbackID: number | null;
  /** Comma-joined recipient list. */
  emailID: string;
  is1097: boolean;
}
