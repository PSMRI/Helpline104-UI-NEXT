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

import { DestroyRef, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '@env/environment';

import { AuthStore } from '../core/auth/auth.store';
import { ConfigService } from '../core/services/config.service';

import { CallLifecycleService } from './call-lifecycle.service';
import { CallStore } from './call.store';
import { CallWrapupService } from './call-wrapup.service';
import { parseDisconnectCtiMessage, parseInboundCtiMessage } from './cti-message';
import { toCallerDemographics } from './beneficiary/caller-demographics.util';
import { inboundAcceptPath } from './role-workspace/role-screens.util';

/** Feature code of the supervising role, which has no personal agent line. */
const SUPERVISOR_FEATURE_CODE = 'Supervisor';
const REGISTRATION_PATH = 'registration';

/** `localStorage.setItem('ctiDebug', '1')` logs every message the listener receives. */
export const CTI_DEBUG_STORAGE_KEY = 'ctiDebug';

type CtiMessageOutcome = 'accepted: inbound' | 'accepted: disconnect' | 'dropped: duplicate' | 'dropped: parse';

function ctiDebugEnabled(): boolean {
  try {
    return localStorage.getItem(CTI_DEBUG_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function ctiDebug(message: string, detail?: unknown): void {
  console.info(`[cti-debug] ${message}`, detail ?? '');
}

/**
 * Extract the origin from a configured base URL. Returns a token that can never
 * equal a real `MessageEvent.origin` when the URL is empty/malformed, so an
 * unconfigured telephony server trusts nothing rather than everything.
 */
function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return 'invalid:no-telephony-origin';
  }
}

/**
 * App-scoped listener for inbound CTI events from the CZentrix soft-phone.
 *
 * The CZentrix CTI iframe announces inbound calls to the host window via
 * postMessage ("Accept|<CLI>|<sessionId>|INBOUND"), and a caller hanging up
 * mid-call the same way ("CustDisconnect|<callID>|..."). The iframe lives in
 * the root-level CTI panel and persists across every route, so the listener
 * must be app-scoped too — an inbound call must seed the {@link CallStore},
 * route into the guarded on-call workspace no matter which screen the agent
 * is on, and register the call with the backend via {@link CallLifecycleService}
 * so later requests (`closeCall`, `transferCall`, `saveCaseSheet`) can carry
 * the real AMRIT call id instead of falling back to the CTI session id; a
 * disconnect must reach {@link CallWrapupService} the same way.
 *
 * Instantiated once by the root `App` component; the listener stays registered
 * for the lifetime of the application.
 */
@Injectable({ providedIn: 'root' })
export class InboundCtiService {
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly callWrapup = inject(CallWrapupService);
  private readonly callLifecycle = inject(CallLifecycleService);
  private readonly router = inject(Router);
  private readonly config = inject(ConfigService);

  /**
   * Origin of the CZentrix telephony server, the only trusted CTI sender.
   * Derived from {@link ConfigService.getTelephonyServerURL}, the same
   * https-upgraded URL the CTI iframe itself is loaded from (`CtiPanelStore.ctiUrl`)
   * — deriving it from the raw, non-upgraded `environment.telephoneServer`
   * instead left this comparing `https://…` (the iframe's real origin) against
   * `http://…`, so every genuine inbound-call postMessage was silently dropped.
   */
  private readonly telephonyOrigin = safeOrigin(this.config.getTelephonyServerURL());

  constructor() {
    const onMessage = (event: MessageEvent): void => {
      const debug = ctiDebugEnabled();
      if (debug) {
        ctiDebug('received', { origin: event.origin, data: event.data });
      }
      if (!this.isTrustedCtiOrigin(event.origin)) {
        if (debug) {
          ctiDebug('dropped: origin', { origin: event.origin, expected: this.telephonyOrigin });
        }
        return;
      }
      if (!this.isCtiEligible()) {
        if (debug) {
          ctiDebug('dropped: ineligible', {
            authenticated: this.authStore.isAuthenticated(),
            agentID: this.authStore.user()?.agentID ?? null,
            featureCode: this.authStore.currentRole()?.featureCode ?? null,
          });
        }
        return;
      }
      const outcome = this.handleCtiMessage(event.data);
      if (debug) {
        ctiDebug(outcome, { data: event.data });
      }
    };
    window.addEventListener('message', onMessage);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('message', onMessage));
  }

  /**
   * Only accept CTI events from the CZentrix telephony origin — never from an
   * arbitrary page/iframe that could forge an "inbound call". The dev simulator
   * posts from this app's own origin, which is trusted in non-production builds.
   */
  private isTrustedCtiOrigin(origin: string): boolean {
    if (origin === this.telephonyOrigin) {
      return true;
    }
    return !environment.production && origin === window.location.origin;
  }

  /**
   * Whether the current session may take inbound CTI calls — mirrors the
   * CtiPanelComponent `showCzentrix` gate: an authenticated user with a
   * telephony agent id and a selected non-supervisor role. The listener stays
   * registered for the app's lifetime, so without this gate a message arriving
   * on the login screen or in a supervisor session would seed call state and
   * navigate into the on-call workspace.
   */
  private isCtiEligible(): boolean {
    if (!this.authStore.isAuthenticated() || (this.authStore.user()?.agentID ?? null) === null) {
      return false;
    }
    const featureCode = this.authStore.currentRole()?.featureCode ?? null;
    return featureCode !== null && featureCode !== SUPERVISOR_FEATURE_CODE;
  }

  /**
   * Parse a CTI payload. On a fresh inbound call, seed state, navigate at once
   * to the agent's role workspace (registration for RO/HAO, the only roles that
   * identify a new caller; straight to their own workspace for every other
   * role — e.g. an HAO-to-MO transfer must not bounce the MO agent through
   * registration, see `inboundAcceptPath`), and register the call with the
   * backend. Roles landing on a workspace then have the transferred
   * beneficiary looked up by call id (see {@link resolveTransferredBeneficiary});
   * on the caller hanging up mid-call, start the wrap-up grace period.
   */
  private handleCtiMessage(data: unknown): CtiMessageOutcome {
    const inbound = parseInboundCtiMessage(data);
    if (inbound) {
      // De-dupe: the iframe may re-post the same event for one connected call.
      if (this.callStore.onCall() && this.callStore.sessionId() === inbound.sessionId) {
        return 'dropped: duplicate';
      }
      this.callStore.startCall({
        cli: inbound.cli,
        sessionId: inbound.sessionId,
      });
      const path = inboundAcceptPath(this.authStore.currentRole()?.featureCode, this.authStore.privileges());
      const toWorkspace = path !== REGISTRATION_PATH;
      if (toWorkspace) {
        this.callStore.setBeneficiaryPending(true);
      }
      void this.router.navigate(['/innerpage', path]);
      this.registerCallStart(
        inbound.cli,
        inbound.sessionId,
        toWorkspace ? () => this.resolveTransferredBeneficiary(inbound.sessionId) : undefined,
      );
      return 'accepted: inbound';
    }

    const disconnect = parseDisconnectCtiMessage(data);
    if (disconnect) {
      this.callWrapup.handleCallerDisconnect(disconnect.callId);
      return 'accepted: disconnect';
    }
    return 'dropped: parse';
  }

  /**
   * Register the call with the backend and resolve the real AMRIT call id
   * (legacy `storeCallID`). Fire-and-forget, like legacy: the agent proceeds
   * to registration regardless, and every downstream call-lifecycle request
   * already falls back to the CTI session id when this hasn't resolved yet.
   */
  private registerCallStart(cli: string, sessionId: string, onSettled?: () => void): void {
    const user = this.authStore.user();
    const role = this.authStore.currentRole();
    this.callLifecycle
      .startCall({
        beneficiaryRegID: this.callStore.beneficiaryId(),
        callID: sessionId,
        phoneNo: cli,
        agentID: user?.agentID ?? null,
        createdBy: user?.userName ?? '',
        callReceivedUserID: user?.userID ?? null,
        isOutbound: false,
        receivedRoleName: role?.roleName ?? null,
        calledServiceID: role?.providerServiceMapID ?? null,
      })
      .subscribe({
        next: (response) => {
          if (this.callStore.sessionId() !== sessionId) {
            return;
          }
          if (response.benCallID) {
            this.callStore.setCallId(response.benCallID);
          }
          const ben = response.i_beneficiary;
          const benRegId = ben?.beneficiaryRegID ?? response.beneficiaryRegID ?? null;
          if (this.callStore.beneficiaryId() === null && benRegId !== null) {
            this.callStore.setBeneficiaryId(benRegId, ben?.i_bendemographics?.districtID ?? null);
            if (ben) {
              this.callStore.setDemographics(toCallerDemographics(ben));
            }
          }
          onSettled?.();
        },
        error: (err: unknown) => {
          console.warn('startCall failed; falling back to the CTI session id', err);
          if (this.callStore.sessionId() === sessionId) {
            onSettled?.();
          }
        },
      });
  }

  /**
   * Look up the beneficiary an earlier leg of a transferred call identified
   * (legacy `104.component.ts` `getBeneficiaryByCallID`, run for every role
   * on landing). On a transfer the receiving role's `startCall` answers with
   * no beneficiary at all, so this is what actually seeds the MO/CO workspace
   * that is already open — its patient context is read from the store
   * reactively. Settling without one (`{ response: "null" }`, or the lookup
   * failing) sends the agent to registration: the workspaces cannot identify
   * a caller themselves and would otherwise be a dead end.
   */
  private resolveTransferredBeneficiary(sessionId: string): void {
    const settle = (): void => {
      if (this.callStore.sessionId() !== sessionId) {
        return;
      }
      this.callStore.setBeneficiaryPending(false);
      if (this.callStore.beneficiaryId() === null) {
        void this.router.navigate(['/innerpage', REGISTRATION_PATH]);
      }
    };
    this.callLifecycle.beneficiaryByCallID(sessionId).subscribe({
      next: (ben) => {
        if (ben && this.callStore.sessionId() === sessionId) {
          this.callStore.setBeneficiaryId(ben.beneficiaryRegID, ben.i_bendemographics?.districtID ?? null);
          this.callStore.setDemographics(toCallerDemographics(ben));
        }
        settle();
      },
      error: (err: unknown) => {
        console.warn('beneficiaryByCallID failed; no transferred beneficiary resolved', err);
        settle();
      },
    });
  }
}
