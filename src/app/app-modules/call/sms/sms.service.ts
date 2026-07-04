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
import {
  Observable,
  TimeoutError,
  catchError,
  map,
  throwError,
  timeout,
} from 'rxjs';

import { ConfigService } from '../../core/services/config.service';
import {
  ApiResponse,
  SendSmsRequest,
  SmsError,
  SmsTemplate,
  SmsType,
} from './sms.models';

const SMS_TYPES_PATH = 'sms/getSMSTypes';
const SMS_TEMPLATES_PATH = 'sms/getSMSTemplates';
const SEND_SMS_PATH = 'sms/sendSMS';

const GENERIC_ERROR = 'Internal issue, please try again later.';
const TIMEOUT_ERROR =
  'The request timed out. Please check your connection and try again.';
const SMS_TIMEOUT_MS = 20_000;

/**
 * SMS sending API (common base): SMS types, templates and send. Used by the
 * post-registration SMS flow. The `{ data }` envelope is unwrapped; failures
 * normalise to an {@link SmsError}.
 */
@Injectable({ providedIn: 'root' })
export class SmsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** SMS types available for a service. Resolves to `[]`. */
  getSmsTypes(serviceID: number | null): Observable<SmsType[]> {
    return this.http
      .post<ApiResponse<SmsType[]>>(this.config.getCommonBaseURL() + SMS_TYPES_PATH, {
        serviceID,
      })
      .pipe(
        timeout(SMS_TIMEOUT_MS),
        map((res) => this.readData(res) ?? []),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** SMS templates for a service (optionally filtered to a type). Resolves to `[]`. */
  getSmsTemplates(
    providerServiceMapID: number | null,
    smsTypeID?: number,
  ): Observable<SmsTemplate[]> {
    return this.http
      .post<ApiResponse<SmsTemplate[]>>(this.config.getCommonBaseURL() + SMS_TEMPLATES_PATH, {
        providerServiceMapID,
        smsTemplateTypeID: smsTypeID,
      })
      .pipe(
        timeout(SMS_TIMEOUT_MS),
        map((res) => this.readData(res) ?? []),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Send one or more SMS messages. */
  sendSms(requests: SendSmsRequest[]): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(this.config.getCommonBaseURL() + SEND_SMS_PATH, requests)
      .pipe(
        timeout(SMS_TIMEOUT_MS),
        map((res) => {
          if (res.statusCode && res.statusCode !== 200) {
            throw this.toError(res);
          }
          return res.data ?? res;
        }),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  private readData<T>(res: ApiResponse<T>): T | undefined {
    if (res.statusCode && res.statusCode !== 200) {
      throw this.toError(res);
    }
    return res.data;
  }

  private toError(err: unknown): SmsError {
    if (err instanceof TimeoutError) {
      return { status: 0, errorMessage: TIMEOUT_ERROR };
    }

    if (
      err &&
      typeof (err as SmsError).status === 'number' &&
      typeof (err as SmsError).errorMessage === 'string'
    ) {
      return err as SmsError;
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
