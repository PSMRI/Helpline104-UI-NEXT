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
  Drug,
  PrescriptionError,
  PrescriptionRecord,
  RawDrug,
  RawDrugFrequency,
  RawDrugStrength,
  SavePrescriptionRequest,
  SavePrescriptionResponse,
} from './prescription.models';

/** All prescription endpoints live on the 104 API. */
const DRUG_LIST_PATH = 'beneficiary/getDrugDetailList';
const DRUG_STRENGTH_PATH = 'beneficiary/get/drugStrength';
const DRUG_FREQUENCY_PATH = 'beneficiary/get/drugFrequency';
const PRESCRIPTION_LIST_PATH = 'beneficiary/get/prescriptionList';
const SAVE_PRESCRIPTION_PATH = 'beneficiary/save/prescription';

const GENERIC_ERROR = 'Internal issue, please try again later.';
const TIMEOUT_ERROR =
  'The request timed out. Please check your connection and try again.';
/** Max wait for any call before failing gracefully (matches CDSS). */
const PRESCRIPTION_TIMEOUT_MS = 20_000;

/**
 * Prescription API for the case-sheet prescription step.
 *
 * Wraps the legacy `PrescriptionService` calls (drug list, strengths,
 * frequencies, history, save) on the 104 API base. Wire payloads (`data`
 * envelope, backend field names) are normalised into the shapes the component
 * consumes. Auth headers and session-expiry are handled by the HTTP
 * interceptors; failures are normalised to a {@link PrescriptionError}.
 */
@Injectable({ providedIn: 'root' })
export class PrescriptionService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get baseUrl(): string {
    return this.config.get104BaseURL();
  }

  /**
   * Drugs available for the agent's service. Each (name, group) pair is one
   * `drugMapID`; rows missing an id or name are dropped. Resolves to `[]`.
   */
  getDrugList(providerServiceMapID: number | null): Observable<Drug[]> {
    return this.http
      .post<ApiResponse<RawDrug[]>>(this.baseUrl + DRUG_LIST_PATH, {
        providerServiceMapID,
      })
      .pipe(
        timeout(PRESCRIPTION_TIMEOUT_MS),
        map((res) =>
          (this.readData(res) ?? [])
            .filter((d): d is RawDrug => !!d && d.drugMapID != null && !!d.drugName)
            .map((d) => ({
              drugMapID: d.drugMapID as number,
              drugName: (d.drugName ?? '').trim(),
              drugGroupName: (d.drugGroupName ?? '').trim(),
            })),
        ),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Drug strengths for the service provider. Resolves to `[]`. */
  getStrengths(serviceProviderID: number | null): Observable<string[]> {
    return this.http
      .post<ApiResponse<RawDrugStrength[]>>(this.baseUrl + DRUG_STRENGTH_PATH, {
        serviceProviderID,
      })
      .pipe(
        timeout(PRESCRIPTION_TIMEOUT_MS),
        map((res) => this.cleanStrings(this.readData(res), (r) => r.drugStrength)),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Drug frequencies. Resolves to `[]`. */
  getFrequencies(): Observable<string[]> {
    return this.http
      .post<ApiResponse<RawDrugFrequency[]>>(this.baseUrl + DRUG_FREQUENCY_PATH, {})
      .pipe(
        timeout(PRESCRIPTION_TIMEOUT_MS),
        map((res) => this.cleanStrings(this.readData(res), (r) => r.frequency)),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Prior prescriptions for a beneficiary (history). Resolves to `[]`. */
  getPrescriptionList(
    beneficiaryRegID: number | null,
  ): Observable<PrescriptionRecord[]> {
    return this.http
      .post<ApiResponse<PrescriptionRecord[]>>(
        this.baseUrl + PRESCRIPTION_LIST_PATH,
        { beneficiaryRegID },
      )
      .pipe(
        timeout(PRESCRIPTION_TIMEOUT_MS),
        map((res) => this.readData(res) ?? []),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Save a prescription; resolves to the created prescription (with its id). */
  savePrescription(
    payload: SavePrescriptionRequest,
  ): Observable<SavePrescriptionResponse> {
    return this.http
      .post<ApiResponse<SavePrescriptionResponse>>(
        this.baseUrl + SAVE_PRESCRIPTION_PATH,
        payload,
      )
      .pipe(
        timeout(PRESCRIPTION_TIMEOUT_MS),
        map((res) => {
          if (res.statusCode && res.statusCode !== 200) {
            throw this.toError(res);
          }
          // Legacy `extractData` returned the whole body when there was no
          // `data` envelope, and read `prescriptionID` off it — mirror that so
          // the created id is never dropped.
          return res.data ?? (res as unknown as SavePrescriptionResponse) ?? {};
        }),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Extract, trim and de-dupe a string field from a possibly-absent list. */
  private cleanStrings<T>(
    rows: T[] | undefined,
    pick: (row: T) => string | undefined,
  ): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const row of rows ?? []) {
      const v = (pick(row) ?? '').trim();
      if (v && !seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
    return out;
  }

  /**
   * Read a data envelope: a non-200 status is a hard error; otherwise return
   * `data`, which may be absent (the legacy `extractData` returned `data` when
   * present).
   */
  private readData<T>(res: ApiResponse<T>): T | undefined {
    if (res.statusCode && res.statusCode !== 200) {
      throw this.toError(res);
    }
    return res.data;
  }

  /**
   * Normalise any failure (timeout, in-body error envelope, transport error)
   * into a {@link PrescriptionError} with the backend message when available.
   */
  private toError(err: unknown): PrescriptionError {
    if (err instanceof TimeoutError) {
      return { status: 0, errorMessage: TIMEOUT_ERROR };
    }

    if (
      err &&
      typeof (err as PrescriptionError).status === 'number' &&
      typeof (err as PrescriptionError).errorMessage === 'string'
    ) {
      return err as PrescriptionError;
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
