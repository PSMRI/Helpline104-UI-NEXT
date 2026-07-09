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

import { Observable, map } from 'rxjs';

import { ConfigService } from '../core/services/config.service';

/** CTI agent-state endpoint, ported from the legacy CzentrixService. */
const GET_AGENT_STATE_PATH = 'cti/getAgentState';

/** Envelope every CTI response arrives in (`data` carries the payload). */
interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/**
 * The agent's live telephony state (`cti/getAgentState` → `data`). Only the
 * keys the dashboard consumes are typed; the payload carries more.
 */
export interface AgentState {
  /** Current state, e.g. `{ stateName: 'READY', stateType: 'IDLE' }`. */
  readonly stateObj?: {
    readonly stateName?: string;
    readonly stateType?: string;
  };
  /** CZentrix session id when a call is connected. */
  readonly session_id?: string;
  /** Caller number when a call is connected. */
  readonly cust_ph_no?: string;
  /** Dialer mode: `PROGRESSIVE` → inbound campaign, `PREVIEW` → outbound. */
  readonly dialer_type?: string;
}

/**
 * Live agent-state polling API (CZentrix CTI). Wraps the legacy
 * `cti/getAgentState` call the old dashboard's `DashboardUserIdComponent`
 * polled every 15 s to refresh the "My ID" status line.
 */
@Injectable({ providedIn: 'root' })
export class AgentStatusService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** The agent's current telephony state. */
  getAgentStatus(agentId: number): Observable<AgentState | null> {
    return this.http
      .post<ApiResponse<AgentState>>(
        `${this.config.getOpenCommonBaseURL()}${GET_AGENT_STATE_PATH}`,
        { agent_id: agentId },
      )
      .pipe(map((res) => res.data ?? null));
  }
}
