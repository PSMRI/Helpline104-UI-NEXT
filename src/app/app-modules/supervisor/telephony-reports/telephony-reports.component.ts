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

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ConfigService } from '../../core/services/config.service';
import { CzentrixService } from '../../core/services/czentrix.service';

/**
 * Telephony Reports (supervisor screen), the legacy `104-supervisor` menu's
 * first Reports entry.
 *
 * Legacy owns no telephony report catalogue of its own: the screen is an
 * iframe into CZentrix's `remote_login.php`, keyed by the username and login
 * key captured at portal login, and every report, filter and export inside it
 * is served by that external application
 * (`supervisor-reports.component.ts:51`). There is no REST endpoint to call
 * and no list to rebuild, so this reproduces the same mechanism rather than
 * inventing a report screen legacy never had.
 *
 * Mechanically identical to {@link AgentStatusComponent}, which embeds the
 * same console at a different entry point — legacy likewise had two separate
 * components doing this.
 */
@Component({
  selector: 'app-telephony-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        {{ 'supervisor.telephonyReports.title' | translate: lang() }}
      </h1>

      @if (screenUrl(); as url) {
        <iframe
          [src]="url"
          width="100%"
          height="700"
          class="rounded-md border border-border"
          [title]="'supervisor.telephonyReports.title' | translate: lang()"
        ></iframe>
      } @else {
        <p class="py-8 text-center text-sm text-muted-foreground" role="alert">
          {{ 'supervisor.telephonyReports.unavailable' | translate: lang() }}
        </p>
      }
    </section>
  `,
})
export class TelephonyReportsComponent {
  private readonly authStore = inject(AuthStore);
  private readonly czentrix = inject(CzentrixService);
  private readonly config = inject(ConfigService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly i18n = inject(I18nService);

  readonly lang = this.i18n.language;

  /**
   * CZentrix console URL, from the login key {@link CzentrixService} captured
   * during the portal login handshake. Null until that key resolves (or if the
   * CTI handshake failed) — the iframe is withheld rather than pointed at a
   * login URL with no key.
   */
  readonly screenUrl = computed<SafeResourceUrl | null>(() => {
    const key = this.czentrix.loginKey();
    const userName = this.authStore.user()?.userName;
    if (!key || !userName) {
      return null;
    }
    const url =
      `${this.config.getTelephonyServerURL()}remote_login.php` +
      `?username=${encodeURIComponent(userName)}&key=${encodeURIComponent(key)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });
}
