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

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMail } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { AppFooterComponent } from '@/shared/components/layout/app-footer.component';
import { CtiPanelStore } from '@/shared/components/layout/cti-panel.store';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

const FEEDBACK_ROUTE = '/feedback';

/**
 * Dashboard footer: the shared copyright / version chrome plus the post-logout
 * feedback link and, for call-handling roles, the CZentrix toggle button —
 * docked here (rather than floating above the footer) so it reads as part of
 * the same bottom-right cluster as Feedback/Version. The soft-phone iframe
 * itself still lives in the app-root `CtiPanelComponent` so it survives
 * navigation; this button only flips the shared `CtiPanelStore`'s open state.
 */
@Component({
  selector: 'app-dashboard-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe, AppFooterComponent, ZardButtonComponent],
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

      @if (cti.showCzentrix()) {
        <button footerCorner z-button type="button" zSize="xs" class="shadow-sm" (click)="cti.toggleCti()">
          {{ cti.czentrixLabel }}
        </button>
      }
    </app-shell-footer>
  `,
})
export class DashboardFooterComponent {
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStore);
  readonly cti = inject(CtiPanelStore);

  readonly lang = this.i18n.language;

  goToFeedback(): void {
    // The feedback page is anonymous: clear the session before navigating.
    this.authStore.clear();
    void this.router.navigate([FEEDBACK_ROUTE], { queryParams: { sl: '104' } });
  }
}
