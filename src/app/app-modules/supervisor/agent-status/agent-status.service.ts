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
import { OnlineAgent, normalizeOnlineAgents } from './agent-status.models';

/**
 * Agents currently online on the dialer. Legacy `CzentrixServices`:
 * `POST {openCommon}cti/getOnlineAgents` with body `{ agent_id }` (the
 * CZentrix `CTI_ONLINE_AGENTS` transaction), payload under the standard
 * AMRIT `data` envelope.
 */
const ONLINE_AGENTS_PATH = 'cti/getOnlineAgents';

/**
 * Supervisor Agent Status API. Wraps the legacy `getOnlineAgents` call with
 * the shared supervisor error normalisation, and folds the dialer's payload
 * into typed {@link OnlineAgent} rows.
 */
@Injectable({ providedIn: 'root' })
export class SupervisorAgentStatusService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** Agents currently online on the dialer (`cti/getOnlineAgents`). */
  getOnlineAgents(agentID: number | null): Observable<OnlineAgent[]> {
    return this.http
      .post<ApiResponse<unknown>>(this.config.getOpenCommonBaseURL() + ONLINE_AGENTS_PATH, {
        agent_id: agentID,
      })
      .pipe(
        timeout(SUPERVISOR_TIMEOUT_MS),
        map((res) => normalizeOnlineAgents(readSupervisorData(res))),
        catchError((err: unknown) => throwError(() => toSupervisorError(err))),
      );
  }
}
