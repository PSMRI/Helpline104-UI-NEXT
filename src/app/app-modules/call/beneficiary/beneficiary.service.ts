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
import { Observable, TimeoutError, catchError, map, shareReplay, throwError, timeout } from 'rxjs';

import { ConfigService } from '../../core/services/config.service';
import {
  ApiResponse,
  BeneficiaryError,
  BeneficiaryRecord,
  BeneficiarySearchRequest,
  BlockOption,
  DistrictOption,
  HealthCareWorkerType,
  PhoneSearchRequest,
  RegisterBeneficiaryRequest,
  RegisterBeneficiaryResponse,
  RegistrationMasterData,
  StateOption,
  VillageOption,
} from './beneficiary.models';

/** Endpoint paths (relative to the common API base), ported from SearchService. */
const SEARCH_BY_PHONE_PATH = 'beneficiary/searchUserByPhone';
const SEARCH_BENEFICIARY_PATH = 'beneficiary/searchBeneficiary';
const CREATE_BENEFICIARY_PATH = 'beneficiary/create';
const REGISTRATION_DATA_PATH = 'beneficiary/getRegistrationDataV1';
const DISTRICTS_PATH = 'location/districts/';
const SUB_DISTRICTS_PATH = 'location/taluks/';
const VILLAGES_PATH = 'location/village/';
/** Provider states live on the admin API. */
const PROVIDER_STATES_PATH = 'm/role/state';
/** Healthcare-worker types live on the 104 API. */
const HCW_TYPES_PATH = 'beneficiary/get/healthCareWorkerTypes';

/** Page size used when pulling a caller's full registration history. */
const HISTORY_PAGE_SIZE = 1000;

const GENERIC_ERROR = 'Internal issue, please try again later.';
const TIMEOUT_ERROR = 'The request timed out. Please check your connection and try again.';
const REQUEST_TIMEOUT_MS = 20_000;

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

  // Reference/location data barely changes within a session but is re-requested on
  // every registration-screen mount; cache per key (results can legitimately differ
  // by provider-service-map / location) and evict on failure so retries still work.
  private readonly registrationDataCache = new Map<number | null, Observable<RegistrationMasterData | undefined>>();
  private readonly providerStatesCache = new Map<number | null, Observable<StateOption[]>>();
  private readonly districtsCache = new Map<number, Observable<DistrictOption[]>>();
  private readonly subDistrictsCache = new Map<number, Observable<BlockOption[]>>();
  private readonly villagesCache = new Map<number, Observable<VillageOption[]>>();

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
    return this.http.post<ApiResponse<BeneficiaryRecord[]>>(this.baseUrl + SEARCH_BY_PHONE_PATH, body).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((res) => this.readList(res)),
      catchError((err: unknown) => throwError(() => this.toError(err))),
    );
  }

  /** Search beneficiaries by name and/or registration ID and gender. */
  searchBeneficiary(criteria: BeneficiarySearchRequest): Observable<BeneficiaryRecord[]> {
    return this.http.post<ApiResponse<BeneficiaryRecord[]>>(this.baseUrl + SEARCH_BENEFICIARY_PATH, criteria).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((res) => this.readList(res)),
      catchError((err: unknown) => throwError(() => this.toError(err))),
    );
  }

  /** Register a new beneficiary; resolves to the created record. */
  create(payload: RegisterBeneficiaryRequest): Observable<RegisterBeneficiaryResponse> {
    return this.http
      .post<ApiResponse<RegisterBeneficiaryResponse>>(this.baseUrl + CREATE_BENEFICIARY_PATH, payload)
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
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
   * Load the registration master data (genders, titles, communities, marital
   * statuses, educations, govt identity types, relationships) for the agent's
   * service. Mirrors the legacy `getUserBeneficaryData` call.
   */
  getRegistrationData(providerServiceMapID: number | null): Observable<RegistrationMasterData | undefined> {
    const cached = this.registrationDataCache.get(providerServiceMapID);
    if (cached) {
      return cached;
    }
    const request$ = this.http
      .post<ApiResponse<RegistrationMasterData>>(this.baseUrl + REGISTRATION_DATA_PATH, { providerServiceMapID })
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        map((res) => this.readData(res)),
        catchError((err: unknown) => {
          this.registrationDataCache.delete(providerServiceMapID);
          return throwError(() => this.toError(err));
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.registrationDataCache.set(providerServiceMapID, request$);
    return request$;
  }

  /** Healthcare-worker types (104 API), loaded when registering a HCW. */
  getHealthCareWorkerTypes(): Observable<HealthCareWorkerType[]> {
    return this.http.post<ApiResponse<HealthCareWorkerType[]>>(this.config.get104BaseURL() + HCW_TYPES_PATH, {}).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((res) => this.readData(res) ?? []),
      catchError((err: unknown) => throwError(() => this.toError(err))),
    );
  }

  /** Provider states for the location cascade (admin API). */
  getProviderStates(serviceProviderID: number | null): Observable<StateOption[]> {
    const cached = this.providerStatesCache.get(serviceProviderID);
    if (cached) {
      return cached;
    }
    const request$ = this.http
      .post<ApiResponse<StateOption[]>>(this.config.getAdminBaseURL() + PROVIDER_STATES_PATH, { serviceProviderID })
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        map((res) => this.readData(res) ?? []),
        catchError((err: unknown) => {
          this.providerStatesCache.delete(serviceProviderID);
          return throwError(() => this.toError(err));
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.providerStatesCache.set(serviceProviderID, request$);
    return request$;
  }

  /** Districts for a state (common API, GET). */
  getDistricts(stateID: number): Observable<DistrictOption[]> {
    const cached = this.districtsCache.get(stateID);
    if (cached) {
      return cached;
    }
    const request$ = this.http.get<ApiResponse<DistrictOption[]>>(this.baseUrl + DISTRICTS_PATH + stateID).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((res) => this.readData(res) ?? []),
      catchError((err: unknown) => {
        this.districtsCache.delete(stateID);
        return throwError(() => this.toError(err));
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.districtsCache.set(stateID, request$);
    return request$;
  }

  /** Sub-districts / blocks for a district (common API, GET). */
  getSubDistricts(districtID: number): Observable<BlockOption[]> {
    const cached = this.subDistrictsCache.get(districtID);
    if (cached) {
      return cached;
    }
    const request$ = this.http.get<ApiResponse<BlockOption[]>>(this.baseUrl + SUB_DISTRICTS_PATH + districtID).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((res) => this.readData(res) ?? []),
      catchError((err: unknown) => {
        this.subDistrictsCache.delete(districtID);
        return throwError(() => this.toError(err));
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.subDistrictsCache.set(districtID, request$);
    return request$;
  }

  /** Villages for a sub-district (common API, GET). */
  getVillages(subDistrictID: number): Observable<VillageOption[]> {
    const cached = this.villagesCache.get(subDistrictID);
    if (cached) {
      return cached;
    }
    const request$ = this.http.get<ApiResponse<VillageOption[]>>(this.baseUrl + VILLAGES_PATH + subDistrictID).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((res) => this.readData(res) ?? []),
      catchError((err: unknown) => {
        this.villagesCache.delete(subDistrictID);
        return throwError(() => this.toError(err));
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.villagesCache.set(subDistrictID, request$);
    return request$;
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
   * Read a data envelope: a non-200 status is a hard error; otherwise return
   * `data`, which may be absent (the legacy `extractData` returned `data` when
   * present). Callers must handle the `undefined` case.
   */
  private readData<T>(res: ApiResponse<T>): T | undefined {
    if (res.statusCode && res.statusCode !== 200) {
      throw this.toError(res);
    }
    return res.data;
  }

  /**
   * Normalise any failure (in-body error envelope or transport error) into a
   * {@link BeneficiaryError} with the backend message when available.
   */
  private toError(err: unknown): BeneficiaryError {
    if (err instanceof TimeoutError) {
      return { status: 0, errorMessage: TIMEOUT_ERROR };
    }

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
