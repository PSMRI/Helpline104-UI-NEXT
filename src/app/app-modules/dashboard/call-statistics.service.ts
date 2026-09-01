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

import { CallStatistics } from './dashboard.store';

/** CTI agent-call-stats endpoint, ported from the legacy CzentrixService. */
const GET_AGENT_CALL_STATS_PATH = 'cti/getAgentCallStats';

/** Envelope every CTI response arrives in (`data` carries the payload). */
interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/**
 * `cti/getAgentCallStats` payload (`data`). Every field is a string on the
 * wire, confirmed against live UAT: `total_calls` is a decimal string and the
 * three duration fields are pre-formatted `HH:MM:SS`, not raw seconds.
 */
interface AgentCallStats {
  readonly total_calls?: string;
  readonly total_call_duration?: string;
  readonly total_break_time?: string;
  readonly total_free_time?: string;
}

const ZERO_STATISTICS: CallStatistics = {
  callDurationSeconds: 0,
  breakTimeSeconds: 0,
  freeTimeSeconds: 0,
  totalCalls: 0,
};

/** Parse a legacy `HH:MM:SS` duration string to whole seconds. Malformed input yields 0. */
function parseHmsToSeconds(value: string | undefined): number {
  const parts = (value ?? '').split(':').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return 0;
  }
  const [hours, minutes, seconds] = parts;
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Per-shift call-statistics polling API (CZentrix CTI). Wraps the legacy
 * `cti/getAgentCallStats` call the old dashboard's `CallStatisticsComponent`
 * polled every 60 s to refresh the call-duration/break-time/free-time/
 * total-calls tile.
 */
@Injectable({ providedIn: 'root' })
export class CallStatisticsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** The agent's call statistics for the current shift. */
  getCallStatistics(agentId: number): Observable<CallStatistics> {
    return this.http
      .post<ApiResponse<AgentCallStats>>(`${this.config.getOpenCommonBaseURL()}${GET_AGENT_CALL_STATS_PATH}`, {
        agent_id: agentId,
      })
      .pipe(map((res) => this.toCallStatistics(res.data)));
  }

  private toCallStatistics(data: AgentCallStats | undefined): CallStatistics {
    if (!data) {
      return ZERO_STATISTICS;
    }
    return {
      callDurationSeconds: parseHmsToSeconds(data.total_call_duration),
      breakTimeSeconds: parseHmsToSeconds(data.total_break_time),
      freeTimeSeconds: parseHmsToSeconds(data.total_free_time),
      totalCalls: Number(data.total_calls) || 0,
    };
  }
}
