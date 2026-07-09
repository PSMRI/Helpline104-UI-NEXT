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
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideActivity,
  lucideBookOpen,
  lucideChartColumn,
  lucideDroplets,
  lucideFilePlus2,
  lucideFileText,
  lucideHeadphones,
  lucideHouse,
  lucideLogOut,
  lucideMapPin,
  lucideMegaphone,
  lucideMessageSquare,
  lucidePhoneCall,
  lucidePhoneForwarded,
  lucidePhoneOff,
  lucideRefreshCw,
  lucideStethoscope,
  lucideUpload,
} from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { TranslationKey } from '../core/i18n/locales';

/** One sidebar navigation entry. */
interface SupervisorNavItem {
  readonly labelKey: TranslationKey;
  readonly icon: string;
  /** Router link — absolute, so entries can point outside `/supervisor`. */
  readonly link: string;
  /** Match the active state exactly (for the overview entry). */
  readonly exact?: boolean;
}

/** A titled group of sidebar entries (Activities / Reports / Configurations). */
interface SupervisorNavGroup {
  readonly labelKey: TranslationKey;
  readonly items: readonly SupervisorNavItem[];
}

/**
 * Sections mirror the legacy `104-supervisor` navbar: Activities, Reports and
 * Configurations. Sections not yet migrated route to the shared placeholder;
 * outbound allocation/re-allocation reuse the existing `/outbound` screens.
 */
const NAV_GROUPS: readonly SupervisorNavGroup[] = [
  {
    labelKey: 'supervisor.nav.activities',
    items: [
      { labelKey: 'supervisor.nav.agentStatus', icon: 'lucideActivity', link: '/supervisor/agent-status' },
      { labelKey: 'supervisor.nav.blockUnblock', icon: 'lucidePhoneOff', link: '/supervisor/block-unblock' },
      { labelKey: 'supervisor.nav.outboundAllocation', icon: 'lucidePhoneForwarded', link: '/outbound/search' },
      { labelKey: 'supervisor.nav.outboundReallocation', icon: 'lucideRefreshCw', link: '/outbound/reallocate' },
      { labelKey: 'supervisor.nav.qualityAudit', icon: 'lucideHeadphones', link: '/supervisor/quality-audit' },
      { labelKey: 'supervisor.nav.grievance', icon: 'lucideMessageSquare', link: '/supervisor/grievance' },
      { labelKey: 'supervisor.nav.uploadSchemes', icon: 'lucideUpload', link: '/supervisor/upload-schemes' },
      { labelKey: 'supervisor.nav.uploadSymptoms', icon: 'lucideFilePlus2', link: '/supervisor/upload-symptoms' },
      { labelKey: 'supervisor.nav.alertsNotifications', icon: 'lucideMegaphone', link: '/supervisor/communication/alerts-notifications' },
      { labelKey: 'supervisor.nav.locationMessages', icon: 'lucideMapPin', link: '/supervisor/communication/location-messages' },
      { labelKey: 'supervisor.nav.trainingResources', icon: 'lucideBookOpen', link: '/supervisor/communication/training-resources' },
      { labelKey: 'supervisor.nav.emergencyContacts', icon: 'lucidePhoneCall', link: '/supervisor/communication/emergency-contacts' },
      { labelKey: 'supervisor.nav.forceLogout', icon: 'lucideLogOut', link: '/supervisor/force-logout' },
    ],
  },
  {
    labelKey: 'supervisor.nav.reports',
    items: [
      { labelKey: 'supervisor.nav.reports', icon: 'lucideChartColumn', link: '/supervisor/reports' },
    ],
  },
  {
    labelKey: 'supervisor.nav.configurations',
    items: [
      { labelKey: 'supervisor.nav.contentManagement', icon: 'lucideFileText', link: '/supervisor/content-management' },
      { labelKey: 'supervisor.nav.smsTemplates', icon: 'lucideMessageSquare', link: '/supervisor/sms-templates' },
      { labelKey: 'supervisor.nav.bloodUrl', icon: 'lucideDroplets', link: '/supervisor/blood-url' },
      { labelKey: 'supervisor.nav.diseasesSummary', icon: 'lucideStethoscope', link: '/supervisor/diseases-summary' },
    ],
  },
];

/**
 * Supervisor Activity Area shell (route `/supervisor`). Replaces the legacy
 * `104-supervisor` navbar-with-`ngSwitch` host: a fixed left sidebar navigates
 * the supervisor sections and each section renders as a routed child in the
 * content pane.
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-supervisor-workspace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe, ZardButtonComponent],
  viewProviders: [
    provideIcons({
      lucideActivity,
      lucideBookOpen,
      lucideChartColumn,
      lucideDroplets,
      lucideFilePlus2,
      lucideFileText,
      lucideHeadphones,
      lucideHouse,
      lucideLogOut,
      lucideMapPin,
      lucideMegaphone,
      lucideMessageSquare,
      lucidePhoneCall,
      lucidePhoneForwarded,
      lucidePhoneOff,
      lucideRefreshCw,
      lucideStethoscope,
      lucideUpload,
    }),
  ],
  template: `
    <div class="flex min-h-screen flex-col bg-background text-foreground">
      <header
        class="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6"
      >
        <h1 class="text-lg font-semibold">
          {{ 'supervisor.title' | translate: lang() }}
        </h1>
        <button z-button type="button" zType="outline" zSize="sm" (click)="goToDashboard()">
          {{ 'supervisor.backToDashboard' | translate: lang() }}
        </button>
      </header>

      <div class="flex flex-1">
        <aside
          class="hidden w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-card px-3 py-4 md:flex"
        >
          <a
            routerLink="/supervisor"
            routerLinkActive="bg-accent text-foreground"
            [routerLinkActiveOptions]="{ exact: true }"
            class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ng-icon name="lucideHouse" size="16" aria-hidden="true" />
            {{ 'supervisor.nav.overview' | translate: lang() }}
          </a>

          @for (group of navGroups; track group.labelKey) {
            <div>
              <p
                class="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {{ group.labelKey | translate: lang() }}
              </p>
              <nav class="flex flex-col gap-0.5">
                @for (item of group.items; track item.link) {
                  <a
                    [routerLink]="item.link"
                    routerLinkActive="bg-accent text-foreground"
                    class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <ng-icon [name]="item.icon" size="16" aria-hidden="true" />
                    {{ item.labelKey | translate: lang() }}
                  </a>
                }
              </nav>
            </div>
          }
        </aside>

        <main class="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class SupervisorWorkspaceComponent {
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly lang = this.i18n.language;
  readonly navGroups = NAV_GROUPS;

  goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }
}
