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

import { DataTableComponent } from '@/shared/components/data-table';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ReportRunner } from './report-runner';

/**
 * The shared results block under every supervisor report's filters: loading
 * state, then the parsed workbook rows in the shared ZardUI data table (global
 * search, click-to-sort, pagination). Rendering it from the report's
 * {@link ReportRunner} keeps every report screen's output identical.
 */
@Component({
  selector: 'app-report-results',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, TranslatePipe],
  template: `
    @if (runner().loading()) {
      <p class="py-8 text-center text-sm text-muted-foreground">
        {{ 'supReports.loading' | translate: lang() }}
      </p>
    } @else if (runner().errorMessage()) {
      <p class="py-8 text-center text-sm font-medium text-destructive" role="alert">
        {{ runner().errorMessage() }}
      </p>
    } @else if (runner().searched()) {
      <div class="mt-2">
        <p class="mb-2 text-sm text-muted-foreground">
          {{ 'supReports.rowCount' | translate: lang() }}:
          <strong class="text-foreground">{{ runner().rows().length }}</strong>
        </p>
        <!-- Report workbooks routinely have 10-20 columns; keep the wide table
             scrolling inside its own container so the page never scrolls
             horizontally at narrow widths. -->
        <div class="overflow-x-auto">
          <app-data-table
            [columns]="runner().columns()"
            [data]="runner().rows()"
            [pageSize]="10"
            [filterable]="true"
            [exportable]="false"
            [searchPlaceholder]="'supReports.search' | translate: lang()"
            [emptyMessage]="'supReports.noData' | translate: lang()"
          />
        </div>
      </div>
    }
  `,
})
export class ReportResultsComponent {
  private readonly i18n = inject(I18nService);
  readonly lang = this.i18n.language;

  /** The owning report's runner (fetch/parse/export state). */
  readonly runner = input.required<ReportRunner>();
}
