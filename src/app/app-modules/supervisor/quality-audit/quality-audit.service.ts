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

import { ConfigService } from '../../core/services/config.service';
import {
  ApiResponse,
  SUPERVISOR_TIMEOUT_MS,
  readSupervisorData,
  toSupervisorError,
} from '../shared/supervisor-api';
import { AgentOption } from '../reports/reports.models';
import { WorklistPage, WorklistRequest } from './quality-audit.models';

// --- Common-API paths (legacy `QualityAuditService`) ------------------------
const FILTER_CALL_LIST_PATH = 'call/filterCallList';
const AGENTS_PATH = 'user/getAgentByRoleID';

/**
 * Quality Audit (call auditing) API, ported from the legacy
 * `QualityAuditService`: the recordings worklist (`call/filterCallList`) and
 * the role-specific agent lookup. The skillset/call-type lookups and the CTI
 * audio-path lookup are shared with {@link SupervisorReportsService} and
 * {@link BlockUnblockService} respectively. Failures normalise to a
 * {@link import('../shared/supervisor-api').SupervisorError}.
 */
@Injectable({ providedIn: 'root' })
export class QualityAuditService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** One page of the call-recording audit worklist (`call/filterCallList`). */
  getCallRecordingWorklist(body: WorklistRequest): Observable<WorklistPage> {
    return this.post<WorklistPage>(FILTER_CALL_LIST_PATH, body).pipe(map((data) => data ?? {}));
  }

  /**
   * Agents of the service (`user/getAgentByRoleID`), optionally narrowed to a
   * skillset. The legacy screen posts the role id as capital-`RoleID`.
   */
  getAgents(providerServiceMapID: number | null, roleID?: number): Observable<AgentOption[]> {
    return this.post<AgentOption[]>(AGENTS_PATH, {
      providerServiceMapID,
      ...(roleID != null ? { RoleID: roleID } : {}),
    }).pipe(map((data) => data ?? []));
  }

  private post<T>(path: string, body: unknown): Observable<T | undefined> {
    return this.http.post<ApiResponse<T>>(this.config.getCommonBaseURL() + path, body).pipe(
      timeout(SUPERVISOR_TIMEOUT_MS),
      map((res) => readSupervisorData(res)),
      catchError((err: unknown) => throwError(() => toSupervisorError(err))),
    );
  }
}
