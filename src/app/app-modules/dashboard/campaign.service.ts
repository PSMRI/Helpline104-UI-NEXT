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

import { Observable } from 'rxjs';

import { ConfigService } from '../core/services/config.service';

/** CTI campaign-switch endpoints, ported from the legacy CzentrixService. */
const SWITCH_TO_INBOUND_PATH = 'cti/switchToInbound';
const SWITCH_TO_OUTBOUND_PATH = 'cti/switchToOutbound';

/**
 * Telephony (CZentrix/CTI) campaign switching for the logged-in agent.
 *
 * Wraps the legacy `cti/switchToInbound` / `cti/switchToOutbound` calls. The
 * backend authorizes the change and may reject it (e.g. an agent not permitted
 * to enter MANUAL/outbound mode), in which case the error carries an
 * `errorMessage` the caller surfaces to the agent.
 */
@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** Move the agent to the inbound campaign. */
  switchToInbound(agentId: number): Observable<unknown> {
    return this.http.post(
      `${this.config.getOpenCommonBaseURL()}${SWITCH_TO_INBOUND_PATH}`,
      { agent_id: agentId },
    );
  }

  /** Move the agent to the outbound campaign. */
  switchToOutbound(agentId: number): Observable<unknown> {
    return this.http.post(
      `${this.config.getOpenCommonBaseURL()}${SWITCH_TO_OUTBOUND_PATH}`,
      { agent_id: agentId },
    );
  }
}
