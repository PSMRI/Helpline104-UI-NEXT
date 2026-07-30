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

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChartColumn } from '@ng-icons/lucide';

import { ZardTableImports } from '@common-ui/ui/table';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/locales';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** One report the agent can open from the dashboard. */
interface ReportLink {
  readonly nameKey: TranslationKey;
  readonly route: string;
}

/** The reports available to an agent (legacy: the surveyor CDI report). */
const AGENT_REPORTS: readonly ReportLink[] = [
  { nameKey: 'reports.callType.title', route: '/reports/call-type' },
];

/**
 * Reports panel: the reports the signed-in agent can open. Each row (and
 * "View All") navigates to the report's page. The legacy dashboard widget was
 * a static placeholder; the agent-facing report itself is the surveyor
 * call-type (Customer Delight Index) report.
 */
@Component({
  selector: 'app-reports-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, NgIcon, ZardTableImports, TranslatePipe],
  viewProviders: [provideIcons({ lucideChartColumn })],
  template: `
    <section
      class="flex h-full flex-col rounded-lg bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md"
    >
      <header class="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 class="text-lg font-semibold">
          {{ 'dashboard.reports.title' | translate: lang() }}
        </h2>
        <ng-icon name="lucideChartColumn" size="18" class="text-primary" aria-hidden="true" />
      </header>

      <div class="flex flex-1 flex-col px-4 py-3">
        <table z-table class="w-full text-sm">
          <thead z-table-header>
            <tr z-table-row>
              <th z-table-head>{{ 'dashboard.reports.sno' | translate: lang() }}</th>
              <th z-table-head>
                {{ 'dashboard.reports.reportName' | translate: lang() }}
              </th>
              <th z-table-head>{{ 'dashboard.reports.date' | translate: lang() }}</th>
            </tr>
          </thead>
          <tbody z-table-body>
            @for (report of reports; track report.route; let i = $index) {
              <tr z-table-row>
                <td z-table-cell>{{ i + 1 }}</td>
                <td z-table-cell>
                  <button
                    type="button"
                    class="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring"
                    (click)="open(report)"
                  >
                    {{ report.nameKey | translate: lang() }}
                  </button>
                </td>
                <td z-table-cell>{{ today | date: 'dd-MM-yy' }}</td>
              </tr>
            }
          </tbody>
        </table>

        <div class="mt-auto pt-2 text-right">
          <button
            type="button"
            class="text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring"
            (click)="open(reports[0])"
          >
            {{ 'dashboard.reports.more' | translate: lang() }}
          </button>
        </div>
      </div>
    </section>
  `,
})
export class ReportsPanelComponent {
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly lang = this.i18n.language;
  readonly reports = AGENT_REPORTS;
  readonly today = new Date();

  open(report: ReportLink): void {
    void this.router.navigate([report.route]);
  }
}
