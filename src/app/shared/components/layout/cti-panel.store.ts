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

import { Injectable, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { AuthStore } from '@/app-modules/core/auth/auth.store';
import { ConfigService } from '@/app-modules/core/services/config.service';

/** Static brand constants for the CTI soft-phone bar (not translatable). */
export const CZENTRIX_LABEL = 'CZentrix';
const CTI_HANDLER_PATH = 'bar/cti_handler.php';

/** Feature code of the supervising role, which has no personal agent line. */
const SUPERVISOR_FEATURE_CODE = 'Supervisor';

/**
 * Shared open/visibility state for the CZentrix CTI panel, split out of
 * `CtiPanelComponent` so the *toggle button* can be rendered from wherever the
 * current screen wants it (floating, or docked into `app-shell-footer` next
 * to Feedback/Version on the dashboard) while the soft-phone iframe itself
 * stays owned by the single root-level `CtiPanelComponent` instance — that's
 * what keeps the call alive across navigation, not where the button lives.
 */
@Injectable({ providedIn: 'root' })
export class CtiPanelStore {
  private readonly config = inject(ConfigService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly authStore = inject(AuthStore);

  readonly czentrixLabel = CZENTRIX_LABEL;

  private readonly _ctiOpen = signal(false);
  readonly ctiOpen = this._ctiOpen.asReadonly();

  /** Bumped on manual retry so the iframe `src` actually changes and reloads. */
  private readonly retryNonce = signal(0);

  /**
   * Whether the CZentrix toggle is visible: an authenticated session with a
   * telephony agent id and a selected role that is not the supervisor (who has
   * no personal agent line). Without an agent id the iframe has no CTI handler
   * to load, so the toggle would only ever open an empty panel.
   */
  readonly showCzentrix = computed(() => {
    if (!this.authStore.isAuthenticated() || this.agentId() === null) {
      return false;
    }
    const featureCode = this.authStore.currentRole()?.featureCode ?? null;
    return featureCode !== null && featureCode !== SUPERVISOR_FEATURE_CODE;
  });

  /** Telephony agent id used to address the CTI handler. */
  private readonly agentId = computed(() => this.authStore.user()?.agentID ?? null);

  /** Sanitized CTI bar URL, or null when no agent id is available. */
  readonly ctiUrl = computed<SafeResourceUrl | null>(() => {
    const id = this.agentId();
    if (id === null) {
      return null;
    }
    const nonce = this.retryNonce();
    const url =
      `${this.config.getTelephonyServerURL()}${CTI_HANDLER_PATH}?e=${id}` + (nonce ? `&_retry=${nonce}` : '');
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  toggleCti(): void {
    this._ctiOpen.update((open) => !open);
  }

  /** Force the iframe `src` to change so a failed load actually re-requests. */
  bumpRetry(): void {
    this.retryNonce.update((n) => n + 1);
  }
}
