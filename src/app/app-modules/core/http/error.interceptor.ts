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

import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { EMPTY, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { SessionService } from '../services/session.service';

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please login again.';

/**
 * Centralises session-expiry handling, replacing the legacy `onSuccess`/
 * `onError` callbacks. Force-logout triggers:
 *  - HTTP 401 / 403, and
 *  - HTTP 200 whose body carries `statusCode === 5002` (104's "logged in
 *    elsewhere" / invalid-session signal).
 *
 * On expiry it delegates to `SessionService` and returns `EMPTY` so the failure
 * never reaches components. Any other successful authenticated response pings
 * the keepalive timer. Non-expiry errors propagate unchanged.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);

  // Login-time requests are exempt from global session-expiry handling: an
  // unauthenticated attempt must never force-logout. 401/403 (bad credentials)
  // and body statusCode 5002 ("already logged in elsewhere") are surfaced to the
  // login component instead. The concurrent-session logout is part of that same
  // pre-session flow, so it is exempt too.
  const url = req.url.toLowerCase();
  const isLoginRequest =
    url.includes('user/userauthenticate') ||
    url.includes('user/logoutuserfromconcurrentsession');

  return next(req).pipe(
    tap((event) => {
      if (isLoginRequest || !(event instanceof HttpResponse)) {
        return;
      }
      const body = event.body as { statusCode?: number; errorMessage?: string } | null;
      if (body && body.statusCode === 5002) {
        const msg =
          typeof body.errorMessage === 'string' && body.errorMessage.trim()
            ? body.errorMessage
            : SESSION_EXPIRED_MESSAGE;
        session.handleSessionExpiry(msg);
      } else {
        session.notifyActivity();
      }
    }),
    catchError((error: HttpErrorResponse) => {
      if (!isLoginRequest && (error.status === 401 || error.status === 403)) {
        session.handleSessionExpiry(SESSION_EXPIRED_MESSAGE);
        return EMPTY;
      }
      return throwError(() => error);
    }),
  );
};
