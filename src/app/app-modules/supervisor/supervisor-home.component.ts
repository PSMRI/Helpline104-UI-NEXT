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
import { RouterLink } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChartColumn,
  lucidePhoneForwarded,
  lucidePhoneOff,
  lucideRefreshCw,
} from '@ng-icons/lucide';

import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { TranslationKey } from '../core/i18n/locales';

/** A quick-link card on the supervisor landing page. */
interface QuickLink {
  readonly titleKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
  readonly icon: string;
  readonly link: string;
}

const QUICK_LINKS: readonly QuickLink[] = [
  {
    titleKey: 'supervisor.nav.reports',
    descriptionKey: 'supervisor.home.reportsHint',
    icon: 'lucideChartColumn',
    link: '/supervisor/reports',
  },
  {
    titleKey: 'supervisor.nav.blockUnblock',
    descriptionKey: 'supervisor.home.blockUnblockHint',
    icon: 'lucidePhoneOff',
    link: '/supervisor/block-unblock',
  },
  {
    titleKey: 'supervisor.nav.outboundAllocation',
    descriptionKey: 'supervisor.home.outboundAllocationHint',
    icon: 'lucidePhoneForwarded',
    link: '/outbound/search',
  },
  {
    titleKey: 'supervisor.nav.outboundReallocation',
    descriptionKey: 'supervisor.home.outboundReallocationHint',
    icon: 'lucideRefreshCw',
    link: '/outbound/reallocate',
  },
];

/**
 * Supervisor landing page (default child of the workspace shell): a short
 * intro plus quick-link cards to the migrated sections.
 */
@Component({
  selector: 'app-supervisor-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, RouterLink, TranslatePipe],
  viewProviders: [
    provideIcons({
      lucideChartColumn,
      lucidePhoneForwarded,
      lucidePhoneOff,
      lucideRefreshCw,
    }),
  ],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h2 class="text-base font-semibold text-foreground">
        {{ 'supervisor.home.title' | translate: lang() }}
      </h2>
      <p class="mt-1 max-w-2xl text-sm text-muted-foreground">
        {{ 'supervisor.intro' | translate: lang() }}
      </p>

      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (card of quickLinks; track card.link) {
          <a
            [routerLink]="card.link"
            class="flex flex-col gap-2 rounded-md border border-border p-4 transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <ng-icon [name]="card.icon" size="22" class="text-primary" aria-hidden="true" />
            <span class="text-sm font-medium text-foreground">
              {{ card.titleKey | translate: lang() }}
            </span>
            <span class="text-xs text-muted-foreground">
              {{ card.descriptionKey | translate: lang() }}
            </span>
          </a>
        }
      </div>
    </section>
  `,
})
export class SupervisorHomeComponent {
  private readonly i18n = inject(I18nService);
  readonly lang = this.i18n.language;
  readonly quickLinks = QUICK_LINKS;
}
