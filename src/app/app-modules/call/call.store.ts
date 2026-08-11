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

import { Injectable, inject, signal } from '@angular/core';

import { SessionStorageService } from '../core/services/session-storage.service';

/** Storage keys for the live-call state, mirroring the legacy `onCall` flags. */
const CALL_STORAGE_KEYS = {
  onCall: 'onCall',
  cli: 'CLI',
  sessionId: 'session_id',
  callId: 'callId',
  startedAt: 'callStartedAt',
} as const;

/** Sentinel the legacy app wrote to `sessionStorage.onCall` for a live call. */
const ON_CALL_YES = 'yes';

/** The details that seed the on-call workspace from an inbound CTI event. */
export interface InboundCallSeed {
  /** Caller line identification (the caller's phone number). */
  readonly cli: string;
  /** CZentrix session/call id used to de-duplicate and resolve the call. */
  readonly sessionId: string;
}

/**
 * Demographics of the resolved beneficiary, captured when the caller is
 * identified (selected or newly registered). The service workspace reads these
 * to give its clinical tools patient context — CDSS needs age/gender, the
 * prescription shows the patient identity, the screenings pre-fill the age band.
 */
export interface CallerDemographics {
  readonly firstName: string | null;
  readonly lastName: string | null;
  /** Whole-unit age in years, or null when unknown. */
  readonly age: number | null;
  readonly genderId: number | null;
  readonly genderName: string | null;
}

/**
 * Signal store for the live inbound call.
 *
 * Holds the state the on-call workspace is built from: whether a call is active
 * (`onCall`), the caller's number (`cli`), the CZentrix session id and the
 * resolved AMRIT call/beneficiary ids. `onCall`, `cli`, `sessionId` and `callId`
 * are persisted to `sessionStorage` (as in the legacy app) so the guarded
 * `/innerpage` route survives a page reload while a call is connected.
 *
 * Replaces the legacy `sessionStorage.onCall/CLI/session_id` juggling and the
 * `AuthGuard2` that read it directly.
 */
@Injectable({ providedIn: 'root' })
export class CallStore {
  private readonly storage = inject(SessionStorageService);

  private readonly _onCall = signal(this.storage.getItem(CALL_STORAGE_KEYS.onCall) === ON_CALL_YES);
  private readonly _cli = signal<string | null>(this.storage.getItem(CALL_STORAGE_KEYS.cli));
  private readonly _sessionId = signal<string | null>(this.storage.getItem(CALL_STORAGE_KEYS.sessionId));
  private readonly _callId = signal<string | null>(this.storage.getItem(CALL_STORAGE_KEYS.callId));
  private readonly _startedAt = signal<number | null>(
    readStoredTimestamp(this.storage.getItem(CALL_STORAGE_KEYS.startedAt)),
  );
  private readonly _beneficiaryId = signal<number | null>(null);
  private readonly _districtID = signal<number | null>(null);
  private readonly _demographics = signal<CallerDemographics | null>(null);

  /** True while an inbound call is connected; gates the on-call workspace. */
  readonly onCall = this._onCall.asReadonly();
  /** Caller line identification (the caller's phone number), or null. */
  readonly cli = this._cli.asReadonly();
  /** CZentrix session/call id for the active call, or null. */
  readonly sessionId = this._sessionId.asReadonly();
  /** AMRIT call id, resolved once the call is registered with the backend. */
  readonly callId = this._callId.asReadonly();
  /** Resolved beneficiary id for the caller, or null until identified. */
  readonly beneficiaryId = this._beneficiaryId.asReadonly();
  /**
   * District id of the resolved beneficiary, or null until identified. Captured
   * alongside the beneficiary so downstream screens (e.g. schedule-appointment)
   * can load the district's blocks/facilities without a separate lookup.
   */
  readonly districtID = this._districtID.asReadonly();
  /** Demographics of the resolved beneficiary, or null until identified. */
  readonly demographics = this._demographics.asReadonly();
  /** Epoch ms when the active call connected, or null when not on a call. */
  readonly startedAt = this._startedAt.asReadonly();

  /**
   * Seed the store from an inbound CTI event and mark the agent on-call.
   * Persists the call identity (including the connect time) so a reload on
   * `/innerpage` is not bounced and the call-duration timer stays accurate.
   */
  startCall(seed: InboundCallSeed): void {
    const startedAt = Date.now();
    this._onCall.set(true);
    this._cli.set(seed.cli);
    this._sessionId.set(seed.sessionId);
    this._startedAt.set(startedAt);
    // A second inbound call must never inherit the previous call's AMRIT
    // linkage; clear the resolved call/beneficiary ids before this call seeds
    // its own (e.g. when the workspace is re-entered without an intervening
    // endCall()).
    this._callId.set(null);
    this._beneficiaryId.set(null);
    this._districtID.set(null);
    this._demographics.set(null);

    this.storage.setItem(CALL_STORAGE_KEYS.onCall, ON_CALL_YES);
    this.storage.setItem(CALL_STORAGE_KEYS.cli, seed.cli);
    this.storage.setItem(CALL_STORAGE_KEYS.sessionId, seed.sessionId);
    this.storage.setItem(CALL_STORAGE_KEYS.startedAt, String(startedAt));
    this.storage.removeItem(CALL_STORAGE_KEYS.callId);
  }

  /** Record the AMRIT call id once the call is registered with the backend. */
  setCallId(callId: string): void {
    this._callId.set(callId);
    this.storage.setItem(CALL_STORAGE_KEYS.callId, callId);
  }

  /**
   * Record the beneficiary resolved for the caller, and their district
   * (in-memory only). The district is beneficiary-scoped, so clearing the
   * beneficiary (passing null) also clears it.
   */
  setBeneficiaryId(beneficiaryId: number | null, districtID: number | null = null): void {
    this._beneficiaryId.set(beneficiaryId);
    this._districtID.set(beneficiaryId === null ? null : districtID);
    // Demographics only make sense while a beneficiary is set; clearing the id
    // (e.g. "Back to RO") drops the stale patient context too.
    if (beneficiaryId === null) {
      this._demographics.set(null);
    }
  }

  /** Record the resolved beneficiary's demographics (in-memory only). */
  setDemographics(demographics: CallerDemographics | null): void {
    this._demographics.set(demographics);
  }

  /** Clear all live-call state (signals + persisted keys) on call close. */
  endCall(): void {
    this._onCall.set(false);
    this._cli.set(null);
    this._sessionId.set(null);
    this._callId.set(null);
    this._startedAt.set(null);
    this._beneficiaryId.set(null);
    this._districtID.set(null);
    this._demographics.set(null);

    this.storage.removeItem(CALL_STORAGE_KEYS.onCall);
    this.storage.removeItem(CALL_STORAGE_KEYS.cli);
    this.storage.removeItem(CALL_STORAGE_KEYS.sessionId);
    this.storage.removeItem(CALL_STORAGE_KEYS.callId);
    this.storage.removeItem(CALL_STORAGE_KEYS.startedAt);
  }
}

/** Parse a stored epoch-ms timestamp, returning null for missing/invalid values. */
function readStoredTimestamp(raw: string | null): number | null {
  if (raw === null) {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
