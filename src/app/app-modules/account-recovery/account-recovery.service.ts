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

import { ConfigService } from '../core/services/config.service';
import {
  ApiResponse,
  ForgetPasswordData,
  ForgetPasswordResult,
  RecoveryError,
  SaveSecurityQuesAns,
  SecurityAnswer,
  SecurityQuestionOption,
  ValidateAnswersData,
} from './account-recovery.models';

/** Neutral, non-revealing fallback shown when the backend sends no message. */
const NEUTRAL_MESSAGE =
  'If the username is registered, you will be asked a security question.';
const GENERIC_ERROR = 'Internal issue, please try again later.';

/**
 * Account-recovery API. Covers the forgot-password flow (`forgetPassword` →
 * `validateSecurityQuestionAndAnswer` → `setForgetPassword`) and the first-login
 * security-question setup (`getsecurityquetions` → `saveUserSecurityQuesAns`).
 *
 * These endpoints are exempted from the global 401/403/5002 session-expiry
 * logout in the error interceptor — notably `forgetPassword` returns
 * `statusCode 5002` as its neutral "maybe-registered" response, which must NOT
 * be treated as a session-expiry signal.
 */
@Injectable({ providedIn: 'root' })
export class AccountRecoveryService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get baseUrl(): string {
    return this.config.getOpenCommonBaseURL();
  }

  /**
   * Request the security questions for a username.
   *
   * Resolves to `questions` only when the account actually has questions to
   * answer; every other outcome (unknown user, no questions set, or the
   * `5002` neutral code) resolves to `neutral` with a non-revealing message, so
   * the caller can never distinguish a registered user from an unregistered one.
   */
  requestSecurityQuestions(userName: string): Observable<ForgetPasswordResult> {
    return this.http
      .post<ApiResponse<ForgetPasswordData>>(this.baseUrl + 'user/forgetPassword', {
        userName,
      })
      .pipe(
        map((res): ForgetPasswordResult => {
          const questions = res.data?.SecurityQuesAns ?? [];
          if (res.statusCode === 200 && questions.length > 0) {
            return { kind: 'questions', questions };
          }
          return {
            kind: 'neutral',
            message: res.errorMessage?.trim() || NEUTRAL_MESSAGE,
          };
        }),
        // A transport failure must also stay neutral — never leak existence via
        // a distinct error path. Only the message differs (generic).
        catchError(() =>
          throwError(() => this.toRecoveryError(undefined, NEUTRAL_MESSAGE)),
        ),
      );
  }

  /**
   * Validate the user's answers. Resolves to the `transactionId` required by
   * {@link setForgetPassword}, or errors with the backend message.
   */
  validateSecurityAnswers(
    userName: string,
    answers: SecurityAnswer[],
  ): Observable<string> {
    return this.http
      .post<ApiResponse<ValidateAnswersData>>(
        this.baseUrl + 'user/validateSecurityQuestionAndAnswer',
        { SecurityQuesAns: answers, userName },
      )
      .pipe(
        map((res) => {
          const transactionId = res.data?.transactionId;
          if (res.statusCode === 200 && transactionId) {
            return transactionId;
          }
          throw this.toRecoveryError(res);
        }),
        catchError((err: unknown) => throwError(() => this.toRecoveryError(err))),
      );
  }

  /**
   * Set a new password using the transaction id obtained from answer
   * validation. `encryptedPassword` is the legacy `salt+iv+ciphertext` string.
   */
  setForgetPassword(
    userName: string,
    encryptedPassword: string,
    transactionId: string,
  ): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(this.baseUrl + 'user/setForgetPassword', {
        userName,
        password: encryptedPassword,
        transactionId,
      })
      .pipe(
        map((res) => {
          if (res.statusCode && res.statusCode !== 200) {
            throw this.toRecoveryError(res);
          }
        }),
        catchError((err: unknown) => throwError(() => this.toRecoveryError(err))),
      );
  }

  /** Fetch the catalogue of selectable security questions (first-login setup). */
  getSecurityQuestionOptions(): Observable<SecurityQuestionOption[]> {
    return this.http
      .get<ApiResponse<SecurityQuestionOption[]>>(
        this.baseUrl + 'user/getsecurityquetions',
      )
      .pipe(
        map((res) => {
          // A bad envelope (non-200) or a missing `data` payload is a hard
          // failure, not "zero questions" — returning [] here would silently
          // strand the user on an empty dropdown. Surface it as an error so the
          // component shows the retry dialog instead.
          if (res.statusCode !== 200 || !res.data) {
            throw this.toRecoveryError(res);
          }
          return res.data;
        }),
        catchError((err: unknown) => throwError(() => this.toRecoveryError(err))),
      );
  }

  /**
   * Persist the user's chosen questions/answers (first-login setup) and resolve
   * to the `transactionId` the backend returns, which {@link setForgetPassword}
   * then consumes to set the new password (legacy two-call chain).
   */
  saveSecurityQuestions(payload: SaveSecurityQuesAns[]): Observable<string> {
    return this.http
      .post<ApiResponse<ValidateAnswersData>>(
        this.baseUrl + 'user/saveUserSecurityQuesAns',
        payload,
      )
      .pipe(
        map((res) => {
          const transactionId = res.data?.transactionId;
          if (res.statusCode === 200 && transactionId) {
            return transactionId;
          }
          throw this.toRecoveryError(res);
        }),
        catchError((err: unknown) => throwError(() => this.toRecoveryError(err))),
      );
  }

  /**
   * Normalise any failure (in-body error envelope, thrown {@link RecoveryError},
   * or transport `HttpErrorResponse`) into a {@link RecoveryError} the component
   * can display.
   */
  private toRecoveryError(err: unknown, fallback = GENERIC_ERROR): RecoveryError {
    // Already normalised.
    if (
      err &&
      typeof (err as RecoveryError).status === 'number' &&
      typeof (err as RecoveryError).errorMessage === 'string'
    ) {
      return err as RecoveryError;
    }

    // In-body error envelope (thrown from a map above).
    const envelope = err as ApiResponse<unknown> | undefined;
    if (envelope && typeof envelope.statusCode === 'number') {
      return {
        status: envelope.statusCode,
        errorMessage: envelope.errorMessage?.trim() || fallback,
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
      return { status: err.status, errorMessage: fromBody.trim() || fallback };
    }

    return { status: 0, errorMessage: fallback };
  }
}
