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

import { ConfigService } from '../../core/services/config.service';
import {
  ApiResponse,
  BeneficiaryError,
  BeneficiaryRecord,
  BeneficiarySearchRequest,
  PhoneSearchRequest,
  RegisterBeneficiaryRequest,
  RegisterBeneficiaryResponse,
} from './beneficiary.models';

/** Endpoint paths (relative to the common API base), ported from SearchService. */
const SEARCH_BY_PHONE_PATH = 'beneficiary/searchUserByPhone';
const SEARCH_BENEFICIARY_PATH = 'beneficiary/searchBeneficiary';
const CREATE_BENEFICIARY_PATH = 'beneficiary/create';

/** Page size used when pulling a caller's full registration history. */
const HISTORY_PAGE_SIZE = 1000;

const GENERIC_ERROR = 'Internal issue, please try again later.';

/**
 * Beneficiary identity/registration API for the inbound-call flow.
 *
 * Wraps the three legacy `SearchService` calls used to identify an inbound
 * caller — reg-history by phone, name/ID search, and new registration — on the
 * common API base. Auth headers and session-expiry are handled by the HTTP
 * interceptors; failures are normalised to a {@link BeneficiaryError}.
 */
@Injectable({ providedIn: 'root' })
export class BeneficiaryService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get baseUrl(): string {
    return this.config.getCommonBaseURL();
  }

  /**
   * Identify an inbound caller: list every beneficiary registered against the
   * caller's phone number (CLI). Resolves to `[]` when none are found.
   */
  searchByPhone(phoneNo: string): Observable<BeneficiaryRecord[]> {
    const body: PhoneSearchRequest = {
      phoneNo,
      pageNo: 1,
      rowsPerPage: HISTORY_PAGE_SIZE,
    };
    return this.http
      .post<ApiResponse<BeneficiaryRecord[]>>(
        this.baseUrl + SEARCH_BY_PHONE_PATH,
        body,
      )
      .pipe(
        map((res) => this.readList(res)),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Search beneficiaries by name and/or registration ID and gender. */
  searchBeneficiary(
    criteria: BeneficiarySearchRequest,
  ): Observable<BeneficiaryRecord[]> {
    return this.http
      .post<ApiResponse<BeneficiaryRecord[]>>(
        this.baseUrl + SEARCH_BENEFICIARY_PATH,
        criteria,
      )
      .pipe(
        map((res) => this.readList(res)),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Register a new beneficiary; resolves to the created record. */
  create(
    payload: RegisterBeneficiaryRequest,
  ): Observable<RegisterBeneficiaryResponse> {
    return this.http
      .post<ApiResponse<RegisterBeneficiaryResponse>>(
        this.baseUrl + CREATE_BENEFICIARY_PATH,
        payload,
      )
      .pipe(
        map((res) => {
          if ((res.statusCode && res.statusCode !== 200) || !res.data) {
            throw this.toError(res);
          }
          return res.data;
        }),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /**
   * Read a list envelope: a non-200 status is a hard error; an empty/absent
   * `data` means "no matches" and resolves to `[]`.
   */
  private readList(res: ApiResponse<BeneficiaryRecord[]>): BeneficiaryRecord[] {
    if (res.statusCode && res.statusCode !== 200) {
      throw this.toError(res);
    }
    return res.data ?? [];
  }

  /**
   * Normalise any failure (in-body error envelope or transport error) into a
   * {@link BeneficiaryError} with the backend message when available.
   */
  private toError(err: unknown): BeneficiaryError {
    if (
      err &&
      typeof (err as BeneficiaryError).status === 'number' &&
      typeof (err as BeneficiaryError).errorMessage === 'string'
    ) {
      return err as BeneficiaryError;
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
