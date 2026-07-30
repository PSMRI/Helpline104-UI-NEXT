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

import { CallStore } from './call.store';
import { parseInboundCtiMessage } from './cti-message';

/** Feature code of the supervising role, which has no personal agent line. */
const SUPERVISOR_FEATURE_CODE = 'Supervisor';

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
 * postMessage ("Accept|<CLI>|<sessionId>|INBOUND"). The iframe lives in the
 * root-level CTI panel and persists across every route, so the listener must
 * be app-scoped too — an inbound call must seed the {@link CallStore} and route
 * into the guarded on-call workspace no matter which screen the agent is on.
 *
 * Instantiated once by the root `App` component; the listener stays registered
 * for the lifetime of the application.
 */
@Injectable({ providedIn: 'root' })
export class InboundCtiService {
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly router = inject(Router);

  /** Origin of the CZentrix telephony server, the only trusted CTI sender. */
  private readonly telephonyOrigin = safeOrigin(environment.telephoneServer);

  constructor() {
    const onMessage = (event: MessageEvent): void => {
      if (!this.isTrustedCtiOrigin(event.origin) || !this.isCtiEligible()) {
        return;
      }
      this.handleCtiMessage(event.data);
    };
    window.addEventListener('message', onMessage);
    inject(DestroyRef).onDestroy(() =>
      window.removeEventListener('message', onMessage),
    );
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
    if (
      !this.authStore.isAuthenticated() ||
      (this.authStore.user()?.agentID ?? null) === null
    ) {
      return false;
    }
    const featureCode = this.authStore.currentRole()?.featureCode ?? null;
    return featureCode !== null && featureCode !== SUPERVISOR_FEATURE_CODE;
  }

  /** Parse a CTI payload; on a fresh inbound call, seed state and navigate. */
  private handleCtiMessage(data: unknown): void {
    const inbound = parseInboundCtiMessage(data);
    if (!inbound) {
      return;
    }
    // De-dupe: the iframe may re-post the same event for one connected call.
    if (
      this.callStore.onCall() &&
      this.callStore.sessionId() === inbound.sessionId
    ) {
      return;
    }

    this.callStore.startCall({
      cli: inbound.cli,
      sessionId: inbound.sessionId,
    });
    void this.router.navigate(['/innerpage']);
  }
}
