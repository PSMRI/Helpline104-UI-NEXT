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

import { Injectable, effect, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStore } from '../auth/auth.store';
import { LOGIN_ROUTE } from '../core.constants';
import { ConfigService } from './config.service';
import { ConfirmationService } from './confirmation.service';
import { SessionStorageService } from './session-storage.service';
import { SpinnerService } from './spinner.service';

/**
 * Owns the idle-session lifecycle, modelled on MMU's interceptor:
 *  - a 27-minute inactivity timer (configurable) reset on each authenticated
 *    request (keepalive),
 *  - a warning prompt on expiry offering to extend, and
 *  - forced logout on 401/403/5002 or on declined/elapsed timeout.
 *
 * Kept separate from the interceptors so the policy is testable and reusable.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(AuthStore);
  private readonly config = inject(ConfigService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly storage = inject(SessionStorageService);
  private readonly spinner = inject(SpinnerService);

  // TODO(P0-routing): register LOGIN_ROUTE in app.routes; this is the target.
  private readonly loginRoute = LOGIN_ROUTE;

  private timeoutRef: ReturnType<typeof setTimeout> | null = null;
  private handlingExpiry = false;
  /**
   * Whether the idle-expiry confirm dialog is currently open. The dialog is
   * async (ZardUI, not the blocking `window.confirm`), so a keepalive during
   * the prompt can restart the timer and fire a second timeout before the
   * first prompt settles; this guard keeps a single dialog on screen.
   */
  private idlePromptOpen = false;

  constructor() {
    // Bind the idle timer to the session lifecycle. notifyActivity() alone
    // could never initialise the timer: the auth token is set (via
    // AuthStore.setSession) only after the login response has already passed
    // through the interceptor, so the keepalive ping on that response is a
    // no-op. Reacting to isAuthenticated() starts the timer the moment a token
    // exists (login or a reload that rehydrates one) and clears it on logout.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.resetTimer();
      } else {
        this.clearTimer();
      }
    });
  }

  /**
   * Keepalive: restart the inactivity timer after an authenticated request.
   * Called by the HTTP interceptors on each successful authenticated response.
   */
  notifyActivity(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }
    this.resetTimer();
  }

  /** Reset the inactivity timer for another full window. */
  resetTimer(): void {
    this.clearTimer();
    this.startTimer();
  }

  private startTimer(): void {
    const ms = this.config.getSessionTimeoutMinutes() * 60 * 1000;
    this.timeoutRef = setTimeout(() => void this.onIdleTimeout(), ms);
  }

  private clearTimer(): void {
    if (this.timeoutRef) {
      clearTimeout(this.timeoutRef);
      this.timeoutRef = null;
    }
  }

  private async onIdleTimeout(): Promise<void> {
    if (
      !this.auth.isAuthenticated() ||
      this.handlingExpiry ||
      this.idlePromptOpen
    ) {
      return;
    }
    this.idlePromptOpen = true;
    let wantsMoreTime = false;
    try {
      wantsMoreTime = await this.confirmation.confirm(
        'Your session is about to expire. Do you need more time?',
      );
    } finally {
      this.idlePromptOpen = false;
    }
    // A forced logout (401/403/5002) may have raced the open dialog; if the
    // session is already being torn down, the user's answer is moot.
    if (this.handlingExpiry || !this.auth.isAuthenticated()) {
      return;
    }
    if (wantsMoreTime) {
      // Keepalive. TODO(P1): POST to a backend extend-session endpoint once
      // the 104 API exposes one; for now, restarting the timer suffices.
      this.resetTimer();
    } else {
      this.handleSessionExpiry('Your session has expired. Please login again.');
    }
  }

  /**
   * Force logout. Invoked by the error interceptor on 401/403 and on a 200
   * carrying `statusCode === 5002`, and by the idle timeout above. Guarded so
   * concurrent failures don't trigger multiple logouts/dialogs.
   */
  handleSessionExpiry(message: string): void {
    if (this.handlingExpiry) {
      return;
    }
    this.handlingExpiry = true;

    this.clearTimer();
    this.spinner.reset();
    this.auth.clear();
    this.storage.clear();

    // Mirror the old blocking `window.alert` ordering: navigate to login only
    // after the user acknowledges the notice, then release the guard.
    void this.confirmation.alert(message, 'error').finally(() => {
      void this.router.navigate([this.loginRoute]).finally(() => {
        this.handlingExpiry = false;
      });
    });
  }

  /** Whether a logout is already underway (components can skip error dialogs). */
  isExpiryInProgress(): boolean {
    return this.handlingExpiry;
  }

  /** Reset transient state, e.g. after a fresh login or navigating to login. */
  reset(): void {
    this.handlingExpiry = false;
    this.clearTimer();
  }
}
