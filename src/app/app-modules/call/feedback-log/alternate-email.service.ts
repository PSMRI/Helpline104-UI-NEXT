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

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, TimeoutError, catchError, map, throwError, timeout } from 'rxjs';

import { ConfigService } from '../../core/services/config.service';
import { AlternateEmailError, ApiResponse, SendEmailRequest } from './alternate-email.models';

const FETCH_EMAILS_PATH = 'emailController/getAuthorityEmailID';
const SEND_EMAIL_PATH = 'emailController/SendEmail';

const GENERIC_ERROR = 'Internal issue, please try again later.';
const TIMEOUT_ERROR = 'The request timed out. Please check your connection and try again.';
const EMAIL_TIMEOUT_MS = 20_000;

/**
 * Feedback authority-email API (common base): the pre-configured authority
 * emails for a district and the send action. Failures normalise to an
 * {@link AlternateEmailError}.
 */
@Injectable({ providedIn: 'root' })
export class AlternateEmailService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** Pre-configured authority email addresses for a district. */
  fetchEmails(districtID: number | null): Observable<string[]> {
    return this.http
      .post<ApiResponse<string[]>>(this.config.getCommonBaseURL() + FETCH_EMAILS_PATH, {
        districtID,
      })
      .pipe(
        timeout(EMAIL_TIMEOUT_MS),
        map((res) => this.readData(res) ?? []),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Send the feedback email to the chosen recipients. */
  sendEmail(req: SendEmailRequest): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(this.config.getCommonBaseURL() + SEND_EMAIL_PATH, req)
      .pipe(
        timeout(EMAIL_TIMEOUT_MS),
        map((res) => this.readData(res)),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  private readData<T>(res: ApiResponse<T>): T | undefined {
    if (res.statusCode && res.statusCode !== 200) {
      throw this.toError(res);
    }
    return res.data;
  }

  private toError(err: unknown): AlternateEmailError {
    if (err instanceof TimeoutError) {
      return { status: 0, errorMessage: TIMEOUT_ERROR };
    }

    if (
      err &&
      typeof (err as AlternateEmailError).status === 'number' &&
      typeof (err as AlternateEmailError).errorMessage === 'string'
    ) {
      return err as AlternateEmailError;
    }

    const envelope = err as ApiResponse<unknown> | undefined;
    if (envelope && typeof envelope.statusCode === 'number') {
      return {
        status: envelope.statusCode,
        errorMessage: envelope.errorMessage?.trim() || GENERIC_ERROR,
      };
    }

    if (err instanceof HttpErrorResponse) {
      const body = err.error as { errorMessage?: string } | string | null;
      const fromBody =
        body && typeof body === 'object' && typeof body.errorMessage === 'string'
          ? body.errorMessage
          : typeof body === 'string'
            ? body
            : '';
      return { status: err.status, errorMessage: fromBody.trim() || GENERIC_ERROR };
    }

    return { status: 0, errorMessage: GENERIC_ERROR };
  }
}
