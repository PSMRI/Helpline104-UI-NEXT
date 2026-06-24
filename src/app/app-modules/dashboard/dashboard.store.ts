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

import { Injectable, signal } from '@angular/core';

/** The two telephony campaigns an agent can be attached to. */
export type Campaign = 'inbound' | 'outbound';

/**
 * Per-shift call metrics shown on the dashboard. Durations are whole seconds;
 * the view formats them for display.
 */
export interface CallStatistics {
  readonly callDurationSeconds: number;
  readonly breakTimeSeconds: number;
  readonly freeTimeSeconds: number;
  readonly totalCalls: number;
}

const EMPTY_CALL_STATISTICS: CallStatistics = {
  callDurationSeconds: 0,
  breakTimeSeconds: 0,
  freeTimeSeconds: 0,
  totalCalls: 0,
};

/**
 * Signal store for the dashboard shell: the active inbound/outbound campaign
 * and the agent's call statistics.
 *
 * Statistics start at zero and the campaign defaults to inbound. The telephony
 * (CZentrix) feed that pushes live metrics and confirms campaign switches is
 * integrated separately; this store owns the client-side state it binds to.
 */
@Injectable()
export class DashboardStore {
  private readonly _campaign = signal<Campaign>('inbound');
  private readonly _callStatistics = signal<CallStatistics>(EMPTY_CALL_STATISTICS);

  /** The campaign the agent is currently working. */
  readonly campaign = this._campaign.asReadonly();
  /** Current shift call metrics. */
  readonly callStatistics = this._callStatistics.asReadonly();

  /** Select the inbound or outbound campaign. */
  setCampaign(campaign: Campaign): void {
    this._campaign.set(campaign);
  }
}
