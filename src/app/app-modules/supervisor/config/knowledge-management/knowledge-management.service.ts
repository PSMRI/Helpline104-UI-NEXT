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

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError, timeout } from 'rxjs';

import { ConfigService } from '../../../core/services/config.service';
import { ApiResponse, SUPERVISOR_TIMEOUT_MS, readSupervisorData, toSupervisorError } from '../../shared/supervisor-api';

const SERVICE_TYPES_PATH = 'service/servicetypes';
const CATEGORY_BY_ID_PATH = 'service/categoryByID';
const SUB_CATEGORY_PATH = 'service/subcategory';
const ADD_FILE_PATH = 'kmfilemanager/addFile';

/** One sub-service type (`service/servicetypes`). */
export interface SubServiceType {
  subServiceID: number;
  subServiceName: string;
}

/** One category (`service/categoryByID`). */
export interface KmCategory {
  categoryID: number;
  categoryName: string;
}

/** One previously-uploaded KM file on a sub-category. */
export interface KmFileEntry {
  fileUID?: string;
  fileName?: string;
  fileExtension?: string;
  versionNo?: string | number;
  createdBy?: string;
  createdDate?: number | string;
}

/** One sub-category (`service/subcategory`) with its uploaded files. */
export interface KmSubCategory {
  subCategoryID: number;
  subCategoryName: string;
  fileManger?: KmFileEntry[];
}

/** One element of the `kmfilemanager/addFile` body. */
export interface KmDocumentUpload {
  fileName: string;
  fileExtension: string;
  providerServiceMapID: number | null;
  userID: number | null;
  fileContent?: string;
  createdBy: string | null;
  categoryID: number | null;
  subCategoryID: number | null;
}

/**
 * Knowledge management API (legacy `CoCategoryService` + `UploadServiceService`,
 * common base): sub-service types, category/sub-category cascade, and the KM
 * document upload. Failures normalise to a {@link SupervisorError}.
 */
@Injectable({ providedIn: 'root' })
export class KnowledgeManagementService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  getServiceTypes(providerServiceMapID: number | null): Observable<SubServiceType[]> {
    return this.post<SubServiceType[]>(SERVICE_TYPES_PATH, { providerServiceMapID }).pipe(map((data) => data ?? []));
  }

  getCategories(subServiceID: number, providerServiceMapID: number | null): Observable<KmCategory[]> {
    return this.post<KmCategory[]>(CATEGORY_BY_ID_PATH, {
      subServiceID,
      providerServiceMapID,
    }).pipe(map((data) => data ?? []));
  }

  getSubCategories(categoryID: number): Observable<KmSubCategory[]> {
    return this.post<KmSubCategory[]>(SUB_CATEGORY_PATH, { categoryID }).pipe(map((data) => data ?? []));
  }

  /** Upload KM documents — the API takes an array of file descriptors. */
  uploadDocuments(body: KmDocumentUpload[]): Observable<KmFileEntry[]> {
    return this.post<KmFileEntry[]>(ADD_FILE_PATH, body).pipe(map((data) => data ?? []));
  }

  private post<T>(path: string, body: unknown): Observable<T | undefined> {
    return this.http.post<ApiResponse<T>>(this.config.getCommonBaseURL() + path, body).pipe(
      timeout(SUPERVISOR_TIMEOUT_MS),
      map((res) => readSupervisorData(res)),
      catchError((err: unknown) => throwError(() => toSupervisorError(err))),
    );
  }
}
