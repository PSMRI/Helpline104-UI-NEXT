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
import {
  ApiResponse,
  DirectoryError,
  DirectoryHistoryRow,
  DirectoryItem,
  InstituteResult,
  RegistrationDirectoryData,
  SaveDirectoryHistoryItem,
  SearchInstitutesRequest,
  ServiceItem,
  SubDirectoryData,
  SubDirectoryItem,
} from './directory.models';

const REGISTRATION_DATA_PATH = 'beneficiary/getRegistrationDataV1';
const SUB_DIRECTORY_PATH = 'directory/getSubDirectory';
const SEARCH_INSTITUTES_PATH = 'directory/getInstitutesDirectories';
const SERVICES_PATH = 'beneficiary/get/services';
const GET_HISTORY_PATH = 'beneficiary/getdirectorySearchHistory';
const SAVE_HISTORY_PATH = 'beneficiary/save/directorySearchHistory';

const GENERIC_ERROR = 'Internal issue, please try again later.';
const TIMEOUT_ERROR = 'The request timed out. Please check your connection and try again.';
const DIRECTORY_TIMEOUT_MS = 20_000;

/**
 * Directory / institute-information lookup API. Directory list, sub-directories
 * and the institute search are on the common API; sub-services and the search
 * history are on the 104 API. The location cascade is handled by
 * BeneficiaryService. Failures normalise to a {@link DirectoryError}.
 */
@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** Directory types (read from the registration master's `directory` list). */
  getDirectoryList(providerServiceMapID: number | null): Observable<DirectoryItem[]> {
    return this.http
      .post<ApiResponse<RegistrationDirectoryData>>(
        this.config.getCommonBaseURL() + REGISTRATION_DATA_PATH,
        { providerServiceMapID },
      )
      .pipe(
        timeout(DIRECTORY_TIMEOUT_MS),
        map((res) => this.readData(res)?.directory ?? []),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Sub-directories for a directory type. */
  getSubDirectory(instituteDirectoryID: number): Observable<SubDirectoryItem[]> {
    return this.http
      .post<ApiResponse<SubDirectoryData>>(this.config.getCommonBaseURL() + SUB_DIRECTORY_PATH, {
        instituteDirectoryID,
      })
      .pipe(
        timeout(DIRECTORY_TIMEOUT_MS),
        map((res) => this.readData(res)?.subDirectory ?? []),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Sub-services for the agent's service (used to resolve `serviceID1097`). */
  getServices(providerServiceMapID: number | null): Observable<ServiceItem[]> {
    return this.http
      .post<ApiResponse<ServiceItem[]>>(this.config.get104BaseURL() + SERVICES_PATH, {
        providerServiceMapID,
      })
      .pipe(
        timeout(DIRECTORY_TIMEOUT_MS),
        map((res) => this.readData(res) ?? []),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Search institutes matching the selected directory + location. */
  searchInstitutes(req: SearchInstitutesRequest): Observable<InstituteResult[]> {
    return this.http
      .post<ApiResponse<InstituteResult[]>>(
        this.config.getCommonBaseURL() + SEARCH_INSTITUTES_PATH,
        req,
      )
      .pipe(
        timeout(DIRECTORY_TIMEOUT_MS),
        map((res) => this.readData(res) ?? []),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Directory search history for a beneficiary (104 API). */
  getSearchHistory(beneficiaryRegID: number | null): Observable<DirectoryHistoryRow[]> {
    return this.http
      .post<ApiResponse<DirectoryHistoryRow[]>>(this.config.get104BaseURL() + GET_HISTORY_PATH, {
        beneficiaryRegID,
      })
      .pipe(
        timeout(DIRECTORY_TIMEOUT_MS),
        map((res) => this.readData(res) ?? []),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  /** Persist directory search history (fire-and-forget on the caller side). */
  saveSearchHistory(rows: SaveDirectoryHistoryItem[]): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(this.config.get104BaseURL() + SAVE_HISTORY_PATH, rows)
      .pipe(
        timeout(DIRECTORY_TIMEOUT_MS),
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

  private toError(err: unknown): DirectoryError {
    if (err instanceof TimeoutError) {
      return { status: 0, errorMessage: TIMEOUT_ERROR };
    }

    if (
      err &&
      typeof (err as DirectoryError).status === 'number' &&
      typeof (err as DirectoryError).errorMessage === 'string'
    ) {
      return err as DirectoryError;
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
