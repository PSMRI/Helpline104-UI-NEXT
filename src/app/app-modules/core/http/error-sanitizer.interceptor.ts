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

import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * The backend sometimes puts raw server exceptions into the envelope's
 * `errorMessage` (e.g. a full `JDBC exception executing SQL [select ...]`
 * on a DB outage), and every service surfaces `errorMessage` verbatim in
 * user-visible alerts/toasts. Rewriting the message here — before any
 * service or the session-expiry interceptor reads the body — keeps leaked
 * SQL/stack detail off the screen everywhere with a single change point.
 */
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again or contact support.';

const SERVER_EXCEPTION_PATTERNS: readonly RegExp[] = [
  /jdbc/i,
  /\bsql\b/i,
  /\bselect\b.{0,50}\bfrom\b/i,
  /exception/i,
  /communications link failure/i,
];

/** Replace a message that looks like a raw server exception with generic copy. */
export function sanitizeErrorMessage(message: string): string {
  return SERVER_EXCEPTION_PATTERNS.some((p) => p.test(message)) ? GENERIC_ERROR_MESSAGE : message;
}

/** Return a copy of an envelope body with its `errorMessage` sanitized, or null if untouched. */
function sanitizeBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }
  const envelope = body as { errorMessage?: unknown };
  if (typeof envelope.errorMessage !== 'string') {
    return null;
  }
  const sanitized = sanitizeErrorMessage(envelope.errorMessage);
  if (sanitized === envelope.errorMessage) {
    return null;
  }
  return { ...(body as Record<string, unknown>), errorMessage: sanitized };
}

export const errorSanitizerInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    map((event) => {
      if (!(event instanceof HttpResponse)) {
        return event;
      }
      const sanitized = sanitizeBody(event.body);
      return sanitized ? event.clone({ body: sanitized }) : event;
    }),
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        // Error bodies are either the same envelope or a raw string.
        const sanitizedBody =
          typeof err.error === 'string'
            ? sanitizeErrorMessage(err.error) !== err.error
              ? sanitizeErrorMessage(err.error)
              : null
            : sanitizeBody(err.error);
        if (sanitizedBody !== null) {
          return throwError(
            () =>
              new HttpErrorResponse({
                error: sanitizedBody,
                headers: err.headers,
                status: err.status,
                statusText: err.statusText,
                url: err.url ?? undefined,
              }),
          );
        }
      }
      return throwError(() => err);
    }),
  );
