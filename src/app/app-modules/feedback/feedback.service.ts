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

import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, TimeoutError, catchError, throwError, timeout } from 'rxjs';

import { ConfigService } from '../core/services/config.service';
import { FeedbackApiError, FeedbackCategory, FeedbackSubmitResponse } from './feedback.models';

const PLATFORM_FEEDBACK_PATH = 'platform-feedback';
const SERVICE_LINE = '104';
const GENERIC_ERROR = 'Internal issue, please try again later.';
const TIMEOUT_ERROR = 'The request timed out. Please check your connection and try again.';
const FEEDBACK_TIMEOUT_MS = 20_000;

/**
 * Post-logout platform feedback API (open common API, no auth). Failures
 * normalise to a {@link FeedbackApiError}.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  getCategories(): Observable<FeedbackCategory[]> {
    return this.http
      .get<FeedbackCategory[]>(this.config.getOpenCommonBaseURL() + PLATFORM_FEEDBACK_PATH + '/categories', {
        params: new HttpParams().set('serviceLine', SERVICE_LINE),
      })
      .pipe(
        timeout(FEEDBACK_TIMEOUT_MS),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  submit(rating: number, categorySlug: string, comment: string): Observable<FeedbackSubmitResponse> {
    return this.http
      .post<FeedbackSubmitResponse>(this.config.getOpenCommonBaseURL() + PLATFORM_FEEDBACK_PATH, {
        rating,
        categorySlug,
        comment,
        isAnonymous: true,
        serviceLine: SERVICE_LINE,
      })
      .pipe(
        timeout(FEEDBACK_TIMEOUT_MS),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  private toError(err: unknown): FeedbackApiError {
    if (err instanceof TimeoutError) {
      return { status: 0, errorMessage: TIMEOUT_ERROR };
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
