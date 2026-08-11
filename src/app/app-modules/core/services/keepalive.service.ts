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
import { Injectable, OnDestroy, effect, inject } from '@angular/core';
import { timeout } from 'rxjs/operators';

import { CallStore } from '../../call/call.store';
import { AuthStore } from '../auth/auth.store';
import { ConfigService } from './config.service';

/** How often to ping the backend while a call is connected. */
const KEEPALIVE_INTERVAL_MS = 10 * 60 * 1000;

/** Cap on a single ping — matches the 20s the supervisor services use. */
const KEEPALIVE_REQUEST_TIMEOUT_MS = 20_000;

/**
 * The endpoint pinged to keep the backend session alive.
 *
 * The 104 API exposes no dedicated extend-session/keepalive endpoint (verified
 * in both the legacy Angular-4 app — which only reset a client-side timer —
 * and this app's service layer). Per the interceptor keepalive design, ANY
 * authenticated 200 extends the server-side session and, via the error
 * interceptor's `notifyActivity()`, the client idle timer too — so the ping
 * just needs to be the cheapest authenticated request the app already makes
 * benignly. `user/getRolesByProviderID` is a small read-only master lookup
 * (already used by the outbound, supervisor and reports screens, and by the
 * role rehydration on reload). It is deliberately NOT a `cti/*` endpoint:
 * those are proxied to CZentrix and can answer 200 with a body
 * `statusCode === 5002` when the telephony side is unhappy, which the error
 * interceptor treats as session expiry and would force-logout the agent
 * mid-call — exactly what a keepalive must never do.
 *
 * Replace with the real extend-session endpoint once the 104 API exposes one.
 */
const KEEPALIVE_PATH = 'user/getRolesByProviderID';

/**
 * Backend session keepalive for long calls.
 *
 * `SessionService` handles the *client* idle window, but the backend session
 * has its own TTL, refreshed only by authenticated requests. During a long
 * quiet stretch of a call (e.g. extended counselling with no lookups) the
 * agent generates no traffic, and the backend session can lapse while the
 * agent is still mid-call. This service watches `CallStore.onCall()` and,
 * while a call is connected, pings {@link KEEPALIVE_PATH} every 10 minutes so
 * the backend session outlives the call.
 *
 * Failures are logged to the console and otherwise swallowed: a failed
 * keepalive must never interrupt a call. (A genuine session-expiry signal —
 * 401 or body 5002 — is still handled globally by the error interceptor, as
 * for any other request.)
 *
 * Instantiated with the on-call shell (`InnerpageComponent` injects it); as a
 * root singleton it then reacts to every subsequent call on its own.
 */
@Injectable({ providedIn: 'root' })
export class KeepaliveService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly auth = inject(AuthStore);
  private readonly callStore = inject(CallStore);

  private intervalRef: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Mirror the SessionService pattern: bind the loop to signal state so it
    // starts the moment a call connects (or is rehydrated after a reload) and
    // stops on call close or logout.
    effect(() => {
      if (this.callStore.onCall() && this.auth.isAuthenticated()) {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  ngOnDestroy(): void {
    this.stop();
  }

  /** Start the 10-minute ping loop (idempotent). */
  private start(): void {
    if (this.intervalRef !== null) {
      return;
    }
    // No immediate ping: connecting a call already generates authenticated
    // traffic (startCall, beneficiary search, …) which extends the session.
    this.intervalRef = setInterval(() => this.ping(), KEEPALIVE_INTERVAL_MS);
  }

  /** Stop the ping loop (idempotent). */
  private stop(): void {
    if (this.intervalRef !== null) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  /**
   * One keepalive ping. Fire-and-forget: the authenticated 200 is the whole
   * point (it extends the backend session, and the error interceptor's
   * `notifyActivity()` resets the client idle timer); the payload is unused.
   */
  private ping(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }
    const providerServiceMapID =
      this.auth.currentRole()?.providerServiceMapID ?? null;
    this.http
      .post(this.config.getCommonBaseURL() + KEEPALIVE_PATH, {
        providerServiceMapID,
      })
      // Bound the request so a stalled ping errors into the ignored-log path
      // instead of hanging while the next intervals stack more requests.
      .pipe(timeout(KEEPALIVE_REQUEST_TIMEOUT_MS))
      .subscribe({
        error: (err: unknown) => {
          // Silently ignored by design — a failed keepalive must never
          // interrupt a live call. Console only, for diagnosability.
          console.warn('[keepalive] session ping failed (ignored):', err);
        },
      });
  }
}
