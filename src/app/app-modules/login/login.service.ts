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
import { Observable, catchError, map, throwError } from 'rxjs';

import { LoginResponse } from '../core/auth/auth.models';
import { ConfigService } from '../core/services/config.service';

/** Envelope returned by the 104 auth API. */
interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised login error the component can display. */
export interface LoginError {
  status: number;
  errorMessage: string;
}

/**
 * 104 authentication API. Ported from the Angular 4 `loginService`, trimmed to
 * the login path (security questions, logout, version, etc. come later).
 *
 * Auth headers and session-expiry handling are applied by the HTTP
 * interceptors; the login URL is exempted from the global 401/403/5002 logout
 * so failures surface here instead.
 */
@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get authenticateUrl(): string {
    return this.config.getCommonBaseURL() + 'user/userAuthenticate';
  }

  /**
   * Authenticate the user with an already-encrypted password.
   * Resolves to the login payload (`json.data`) or errors with a {@link LoginError}.
   */
  authenticateUser(
    userName: string,
    encryptedPassword: string,
    doLogout = false,
    captchaToken?: string,
  ): Observable<LoginResponse> {
    const body: Record<string, unknown> = {
      userName,
      password: encryptedPassword,
      withCredentials: true,
      doLogout,
    };
    if (captchaToken) {
      body['captchaToken'] = captchaToken;
    }

    return this.http.post<ApiResponse<LoginResponse>>(this.authenticateUrl, body).pipe(
      map((res) => {
        if (res.statusCode && res.statusCode !== 200) {
          throw {
            status: res.statusCode,
            errorMessage: res.errorMessage || 'Unknown error',
          } satisfies LoginError;
        }
        // A 200 with no payload is still a failed login — surface it as an error
        // rather than returning undefined and crashing downstream consumers.
        if (!res.data) {
          throw {
            status: res.statusCode ?? 0,
            errorMessage: res.errorMessage || 'Internal issue, please try again later.',
          } satisfies LoginError;
        }
        return res.data;
      }),
      catchError((err: unknown) => throwError(() => this.toLoginError(err))),
    );
  }

  /**
   * Normalise any failure into a {@link LoginError} so the component can show a
   * meaningful message. Handles both our in-body error (thrown from `map`) and
   * transport errors (`HttpErrorResponse` for bad credentials, 5xx, network),
   * surfacing the backend `errorMessage` when present.
   */
  private toLoginError(err: unknown): LoginError {
    // Already normalised (thrown from the map above).
    if (
      err &&
      typeof (err as LoginError).status === 'number' &&
      typeof (err as LoginError).errorMessage === 'string'
    ) {
      return err as LoginError;
    }

    if (err instanceof HttpErrorResponse) {
      const body = err.error as { errorMessage?: string } | string | null;
      const fromBody =
        body && typeof body === 'object' && typeof body.errorMessage === 'string'
          ? body.errorMessage
          : typeof body === 'string'
            ? body
            : '';
      return {
        status: err.status,
        errorMessage: fromBody.trim() || 'Internal issue, please try again later.',
      };
    }

    return { status: 0, errorMessage: 'Internal issue, please try again later.' };
  }
}
