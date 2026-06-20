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

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeftRight, lucideLayoutDashboard } from '@ng-icons/lucide';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

const ROLE_SELECTION_ROUTE = '/role-selection';
const SUPERVISOR_ROUTE = '/supervisor';

/**
 * Left navigation rail. Every role gets the switch-role action; supervisors
 * additionally get the Activity Area entry (placeholder route for now).
 */
@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [
    provideIcons({ lucideArrowLeftRight, lucideLayoutDashboard }),
  ],
  template: `
    <nav
      class="flex h-full w-14 flex-col items-center gap-2 bg-primary py-3 text-primary-foreground"
    >
      @if (showActivityArea()) {
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/60"
          [title]="'dashboard.sidebar.activityArea' | translate: lang()"
          [attr.aria-label]="'dashboard.sidebar.activityArea' | translate: lang()"
          (click)="goToActivityArea()"
        >
          <ng-icon name="lucideLayoutDashboard" size="22" aria-hidden="true" />
        </button>
      }

      <button
        type="button"
        class="flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/60"
        [title]="'dashboard.sidebar.switchRole' | translate: lang()"
        [attr.aria-label]="'dashboard.sidebar.switchRole' | translate: lang()"
        (click)="goToRoleSelection()"
      >
        <ng-icon name="lucideArrowLeftRight" size="22" aria-hidden="true" />
      </button>
    </nav>
  `,
})
export class DashboardSidebarComponent {
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly lang = this.i18n.language;

  /** Whether to show the supervisor-only Activity Area entry. */
  readonly showActivityArea = input(false);

  goToRoleSelection(): void {
    void this.router.navigate([ROLE_SELECTION_ROUTE]);
  }

  goToActivityArea(): void {
    void this.router.navigate([SUPERVISOR_ROUTE]);
  }
}
