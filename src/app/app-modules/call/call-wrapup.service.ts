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
import { Injectable, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';

import { AuthStore } from '../core/auth/auth.store';
import { ConfigService } from '../core/services/config.service';

import { CallStore } from './call.store';
import { RoleWrapupTime } from './call-wrapup.models';
import { ApiResponse, CallType, CloseCallRequest } from './hao/hao.models';
import { HaoService } from './hao/hao.service';

const PATHS = {
  // GET {ip104}user/role/{roleID} — legacy `caller.service.ts#getRoleBasedWrapuptime`.
  roleWrapupTime: 'user/role/',
} as const;

/**
 * Grace period before an unattended disconnected call is auto-closed, used
 * when the role has no configured wrap-up time or that lookup fails. Mirrors
 * the legacy `ConfigService.defaultWrapupTime` (30 seconds).
 */
const DEFAULT_WRAPUP_SECONDS = 30;

/** Call-type group the backend uses for an auto-closed, unattended call. */
const WRAPUP_EXCEEDS_GROUP = 'wrapup exceeds';
/** Remarks recorded on an auto-closed call (legacy literal). */
const WRAPUP_EXCEEDS_REMARKS = 'wrapup exceeded';

/**
 * Find the "Wrapup Exceeds" sub-type's id in a call-type catalogue (legacy
 * `getWrapupExceedsCallTypeID`): the group named "wrapup exceeds", then the
 * sub-type within it whose description mentions "wrapup exceeds".
 */
function resolveWrapupExceedsCallTypeID(types: CallType[]): number | null {
  const group = types.find((t) => t.callGroupType.toLowerCase() === WRAPUP_EXCEEDS_GROUP);
  const subType = group?.callTypes.find((s) => s.callTypeDesc.toLowerCase().includes(WRAPUP_EXCEEDS_GROUP));
  return subType?.callTypeID ?? null;
}

/**
 * Caller-disconnect wrap-up flow: when CZentrix reports the caller hung up
 * (`CustDisconnect|...`, see {@link parseDisconnectCtiMessage}), a grace
 * period starts ({@link disconnectedByCaller} / {@link secondsRemaining})
 * instead of ending the call immediately. `ClosureStepComponent` disables
 * Transfer while it is active, and `HaoWorkspaceComponent` /
 * `RoleWorkspaceComponent` / `SioWorkspaceComponent` force-navigate their
 * stepper to the closure step. If no disposition is submitted before the
 * grace period elapses, the call is auto-closed with the "Wrapup Exceeds"
 * call type.
 *
 * A repeat disconnect event for a call already being wrapped up is a no-op.
 */
@Injectable({ providedIn: 'root' })
export class CallWrapupService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly haoService = inject(HaoService);
  private readonly router = inject(Router);

  private readonly _disconnectedByCaller = signal(false);
  private readonly _secondsRemaining = signal(0);
  /** The call id currently being wrapped up, or null — the `ignoreListner` guard. */
  private handledCallId: string | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  /** True from the caller's disconnect until the call is closed (by the agent or by timeout). */
  readonly disconnectedByCaller = this._disconnectedByCaller.asReadonly();
  /** Seconds left in the grace period, or 0 when no wrap-up is active. */
  readonly secondsRemaining = this._secondsRemaining.asReadonly();

  constructor() {
    effect(() => {
      if (!this.callStore.onCall()) {
        this.reset();
      }
    });
  }

  /**
   * Handle a `CustDisconnect` CTI event for the given call id. A no-op unless
   * it matches the currently active call; a repeat event for a call already
   * being wrapped up is also a no-op (the countdown is not restarted).
   */
  handleCallerDisconnect(callId: string): void {
    if (!this.callStore.onCall() || this.callStore.sessionId() !== callId) {
      return;
    }
    if (this.handledCallId === callId) {
      return;
    }
    this.handledCallId = callId;
    this._disconnectedByCaller.set(true);
    this.startWrapupTimer();
  }

  private startWrapupTimer(): void {
    const roleID = this.authStore.currentRole()?.roleID ?? null;
    const seconds$ =
      roleID === null
        ? of(DEFAULT_WRAPUP_SECONDS)
        : this.getRoleBasedWrapupTime(roleID).pipe(
            // Guards against a malformed backend value near-instantly auto-closing the call.
            map((t) =>
              t.isWrapUpTime && Number.isFinite(t.wrapUpTime) && t.wrapUpTime > 0
                ? t.wrapUpTime
                : DEFAULT_WRAPUP_SECONDS,
            ),
            catchError(() => of(DEFAULT_WRAPUP_SECONDS)),
          );
    seconds$.subscribe((seconds) => this.runCountdown(seconds));
  }

  private runCountdown(totalSeconds: number): void {
    this.clearTimer();
    let remaining = totalSeconds;
    this._secondsRemaining.set(remaining);
    this.intervalId = setInterval(() => {
      remaining -= 1;
      this._secondsRemaining.set(Math.max(remaining, 0));
      if (remaining <= 0) {
        this.clearTimer();
        this.autoCloseOnWrapupExpired();
      }
    }, 1000);
  }

  /** The grace period elapsed with no disposition — close the call automatically. */
  private autoCloseOnWrapupExpired(): void {
    const serviceID = this.authStore.currentRole()?.serviceID ?? null;
    if (serviceID === null) {
      return;
    }
    this.haoService.getCallTypes(serviceID, true).subscribe({
      next: (types) => {
        // The agent may have closed the call manually while this was in flight.
        if (!this.callStore.onCall()) {
          return;
        }
        this.submitAutoClose(resolveWrapupExceedsCallTypeID(types));
      },
      error: () => undefined,
    });
  }

  private submitAutoClose(callTypeID: number | null): void {
    if (callTypeID === null) {
      return;
    }
    const benCallID = this.callStore.callId() ?? this.callStore.sessionId();
    if (benCallID === null) {
      return;
    }

    const request: CloseCallRequest = {
      benCallID,
      callID: this.callStore.sessionId(),
      beneficiaryRegID: this.callStore.beneficiaryId(),
      callType: 'Wrapup Exceeds',
      callTypeID,
      fitToBlock: false,
      isFollowupRequired: false,
      prefferedDateTime: null,
      requestedFor: WRAPUP_EXCEEDS_REMARKS,
      isEmergency: false,
      isSuicidal: false,
      providerServiceMapID: this.authStore.currentRole()?.serviceID ?? null,
      agentID: this.authStore.user()?.agentID ?? null,
      endCall: true,
      IsOutbound: false,
      createdBy: this.authStore.user()?.userName ?? '',
    };

    this.haoService.closeCall(request).subscribe({
      next: () => {
        this.callStore.endCall();
        void this.router.navigate(['/dashboard']);
      },
      error: () => undefined,
    });
  }

  private getRoleBasedWrapupTime(roleID: number): Observable<RoleWrapupTime> {
    return this.http
      .get<ApiResponse<RoleWrapupTime>>(this.config.get104BaseURL() + PATHS.roleWrapupTime + roleID)
      .pipe(map((res) => res.data ?? { isWrapUpTime: false, wrapUpTime: DEFAULT_WRAPUP_SECONDS }));
  }

  private reset(): void {
    this.clearTimer();
    this._disconnectedByCaller.set(false);
    this._secondsRemaining.set(0);
    this.handledCallId = null;
  }

  private clearTimer(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
