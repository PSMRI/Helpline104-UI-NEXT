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

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMail } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { AppFooterComponent } from '@/shared/components/layout/app-footer.component';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ConfigService } from '../../core/services/config.service';

/** Static brand constants shown in the footer (not translatable). */
const CZENTRIX_LABEL = 'CZentrix';
const CTI_HANDLER_PATH = 'bar/cti_handler.php';
const FEEDBACK_ROUTE = '/feedback';

/**
 * Dashboard footer: the shared copyright / version chrome plus the post-logout
 * feedback link and — for call-handling roles — the CZentrix button that
 * toggles the CTI (telephony soft-phone) bar.
 */
@Component({
  selector: 'app-dashboard-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, ZardButtonComponent, TranslatePipe, AppFooterComponent],
  viewProviders: [provideIcons({ lucideMail })],
  template: `
    <app-shell-footer>
      <button
        type="button"
        class="flex items-center gap-1 hover:underline focus:outline-none focus:ring-2 focus:ring-white/60"
        (click)="goToFeedback()"
      >
        <ng-icon name="lucideMail" size="14" aria-hidden="true" />
        {{ 'dashboard.footer.feedback' | translate: lang() }}
      </button>

      @if (showCzentrix()) {
        <button z-button type="button" zSize="sm" (click)="toggleCti()">
          {{ czentrixLabel }}
        </button>
      }
    </app-shell-footer>

    @if (showCzentrix() && ctiOpen() && ctiUrl(); as src) {
      <iframe
        [src]="src"
        [title]="czentrixLabel"
        class="fixed bottom-12 right-4 z-50 h-[380px] w-[230px] rounded-md border border-border bg-card shadow-lg"
      ></iframe>
    }
  `,
})
export class DashboardFooterComponent {
  private readonly i18n = inject(I18nService);
  private readonly config = inject(ConfigService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly authStore = inject(AuthStore);

  readonly lang = this.i18n.language;

  /** Whether to show the CZentrix CTI toggle (call-handling roles only). */
  readonly showCzentrix = input(false);
  /** Telephony agent id used to address the CTI handler. */
  readonly agentId = input<number | null>(null);

  readonly czentrixLabel = CZENTRIX_LABEL;

  private readonly _ctiOpen = signal(false);
  readonly ctiOpen = this._ctiOpen.asReadonly();

  /** Sanitized CTI bar URL, or null when no agent id is available. */
  readonly ctiUrl = computed<SafeResourceUrl | null>(() => {
    const id = this.agentId();
    if (id === null) {
      return null;
    }
    const url = `${this.config.getTelephonyServerURL()}${CTI_HANDLER_PATH}?e=${id}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  toggleCti(): void {
    this._ctiOpen.update((open) => !open);
  }

  goToFeedback(): void {
    // The feedback page is anonymous: clear the session before navigating.
    this.authStore.clear();
    void this.router.navigate([FEEDBACK_ROUTE], { queryParams: { sl: '104' } });
  }
}
