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

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFileDown } from '@ng-icons/lucide';

import { ZardTableImports } from '@common-ui/ui/table';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** A placeholder report row (the 104 reports feed is not yet wired). */
interface ReportRow {
  readonly sno: number;
  readonly date: string;
}

const PLACEHOLDER_REPORTS: readonly ReportRow[] = [
  { sno: 1, date: '10-01-17' },
  { sno: 2, date: '10-01-17' },
  { sno: 3, date: '10-01-17' },
];

/**
 * Reports panel. Shows the recent-reports table with an export affordance and a
 * "More" link. Report data is not yet wired, so static placeholder rows render.
 */
@Component({
  selector: 'app-reports-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, ZardTableImports, TranslatePipe],
  viewProviders: [provideIcons({ lucideFileDown })],
  template: `
    <section
      class="flex h-full flex-col rounded-lg border border-border bg-card text-card-foreground shadow-sm"
    >
      <header
        class="flex items-center justify-between border-b border-border px-4 py-3"
      >
        <h2 class="text-base font-semibold">
          {{ 'dashboard.reports.title' | translate: lang() }}
        </h2>
        <button
          type="button"
          class="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          [attr.aria-label]="'dashboard.reports.export' | translate: lang()"
        >
          <ng-icon name="lucideFileDown" size="18" aria-hidden="true" />
        </button>
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
            @for (row of reports; track row.sno) {
              <tr z-table-row>
                <td z-table-cell>{{ row.sno }}</td>
                <td z-table-cell>
                  {{ 'dashboard.reports.reportName' | translate: lang() }}
                </td>
                <td z-table-cell>{{ row.date }}</td>
              </tr>
            }
          </tbody>
        </table>

        <div class="mt-auto pt-2 text-right">
          <button
            type="button"
            class="text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring"
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
  readonly lang = this.i18n.language;
  readonly reports = PLACEHOLDER_REPORTS;
}
