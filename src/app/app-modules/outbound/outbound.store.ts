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

import { Injectable, computed, signal } from '@angular/core';

import { OutboundCallRecord, alternatePhoneNumbers } from './outbound.models';

/** The subset of an outbound record the workspace works from. */
export interface OutboundSelection {
  outboundCallReqID: number | null;
  beneficiaryRegID: number | null;
  beneficiaryName: string;
  phoneNo: string;
  alternatePhoneNumbers: string[];
  requestedFeature: string;
  isSelf: boolean;
}

/**
 * In-memory store for the outbound call currently being worked.
 *
 * The legacy app juggled this through `dataService.outboundBenID`,
 * `outboundCallReqID`, `isSelf`, `outboundRequestID` and `sessionStorage.CLI`.
 * Here it is a single signal seeded when the agent dials a worklist record and
 * cleared when the outbound call is closed. CTI dial/login is deferred, so this
 * holds only the record context the workspace renders.
 */
@Injectable({ providedIn: 'root' })
export class OutboundStore {
  private readonly _selection = signal<OutboundSelection | null>(null);

  /** The outbound record being worked, or null when none is active. */
  readonly selection = this._selection.asReadonly();

  /** True while an outbound record is loaded into the workspace. */
  readonly hasSelection = computed(() => this._selection() !== null);

  /** Seed the workspace from a worklist record the agent chose to dial. */
  select(record: OutboundCallRecord): void {
    const ben = record.beneficiary;
    this._selection.set({
      outboundCallReqID: record.outboundCallReqID ?? null,
      beneficiaryRegID: ben?.beneficiaryRegID ?? null,
      beneficiaryName: [ben?.firstName, ben?.lastName].filter((p) => !!p && p.trim().length > 0).join(' '),
      phoneNo: ben?.benPhoneMaps?.[0]?.phoneNo ?? '',
      alternatePhoneNumbers: alternatePhoneNumbers(ben),
      requestedFeature: record.requestedFeature ?? '',
      isSelf: record.isSelf ?? false,
    });
  }

  /** Clear the active outbound record (on call close / leaving the workspace). */
  clear(): void {
    this._selection.set(null);
  }
}
