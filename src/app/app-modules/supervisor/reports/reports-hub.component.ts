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
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationKey } from '../../core/i18n/locales';

/** One report tab in the hub's navigation. */
interface ReportTab {
  readonly path: string;
  readonly labelKey: TranslationKey;
}

/** Tabs mirror the legacy supervisor Reports menu (call + CRM reports). */
const TABS: readonly ReportTab[] = [
  { path: 'call-quality', labelKey: 'supReports.tab.callQuality' },
  { path: 'qa-report', labelKey: 'supReports.tab.qa' },
  { path: 'call-summary', labelKey: 'supReports.tab.callSummary' },
  { path: 'call-type', labelKey: 'supReports.tab.callType' },
  { path: 'complaint-detail', labelKey: 'supReports.tab.complaintDetail' },
  { path: 'district-call-volume', labelKey: 'supReports.tab.districtVolume' },
  { path: 'diseases-summary', labelKey: 'supReports.tab.diseases' },
  { path: 'unblock-user', labelKey: 'supReports.tab.unblockUser' },
];

/**
 * Supervisor reports hub (route `/supervisor/reports`): hosts every report
 * screen behind a tab bar so all reports share one container and navigation.
 */
@Component({
  selector: 'app-supervisor-reports-hub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  template: `
    <div class="flex flex-col gap-4">
      <header>
        <h2 class="text-base font-semibold text-foreground">
          {{ 'supReports.title' | translate: lang() }}
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ 'supReports.subtitle' | translate: lang() }}
        </p>
      </header>

      <nav class="flex flex-wrap gap-1 border-b border-border" role="tablist">
        @for (tab of tabs; track tab.path) {
          <a
            [routerLink]="tab.path"
            routerLinkActive="border-primary text-foreground"
            class="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {{ tab.labelKey | translate: lang() }}
          </a>
        }
      </nav>

      <router-outlet />
    </div>
  `,
})
export class SupervisorReportsHubComponent {
  private readonly i18n = inject(I18nService);
  readonly lang = this.i18n.language;
  readonly tabs = TABS;
}
