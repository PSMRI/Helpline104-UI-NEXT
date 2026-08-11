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

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { DataTableColumn, DataTableComponent } from '@/shared/components/data-table';
import { ZardButtonComponent } from '@common-ui/ui/button';

import { SupervisorError } from '../shared/supervisor-api';
import { DiseaseSummaryItem } from './reports.models';
import { SupervisorReportsService } from './reports.service';

/** Fetch the whole catalogue in one page; the table paginates client-side. */
const PAGE_SIZE = 1000;

/** Legacy encoding: entries are `$`-separated with a leading `$`. */
function decodeLines(value: string | undefined): string {
  if (!value) {
    return '';
  }
  const body = value.startsWith('$') ? value.slice(1) : value;
  return body.replace(/\$/g, '\n');
}

/**
 * Diseases Summary report (legacy `SupervisorDiseasesSummaryComponent`, read
 * view): the disease-summary catalogue from the 104 API's
 * `diseaseController/getDisease`, shown in the shared table with search, sort,
 * pagination and CSV export. This endpoint returns JSON (not a workbook) and
 * takes no date range, so the export is the table's own CSV.
 */
@Component({
  selector: 'app-diseases-summary-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, TranslatePipe, ZardButtonComponent],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h3 class="mb-4 text-base font-semibold text-foreground">
        {{ 'supReports.diseases.title' | translate: lang() }}
      </h3>

      @if (serverError()) {
        <div
          class="mb-3 flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          role="alert"
        >
          <span>{{ errorMessage() }}</span>
          <button z-button type="button" zType="ghost" zSize="sm" (click)="dismissError()">
            {{ 'supReports.dismiss' | translate: lang() }}
          </button>
        </div>
      } @else if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      @if (loading()) {
        <p class="py-8 text-center text-sm text-muted-foreground">
          {{ 'supReports.loading' | translate: lang() }}
        </p>
      } @else {
        <p class="mb-2 text-sm text-muted-foreground">
          {{ 'supReports.rowCount' | translate: lang() }}:
          <strong class="text-foreground">{{ rows().length }}</strong>
        </p>
        <app-data-table
          [columns]="columns()"
          [data]="rows()"
          [pageSize]="10"
          [filterable]="true"
          [exportable]="true"
          [exportFileName]="'Diseases_Summary'"
          [searchPlaceholder]="'supReports.search' | translate: lang()"
          [emptyMessage]="'supReports.noData' | translate: lang()"
        />
      }
    </section>
  `,
})
export class DiseasesSummaryReportComponent implements OnInit {
  private readonly service = inject(SupervisorReportsService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  /** True when the last load failed with an HTTP 5xx (see the error handler). */
  readonly serverError = signal(false);
  readonly rows = signal<Record<string, unknown>[]>([]);

  /** Dismiss the server-error banner. */
  dismissError(): void {
    this.errorMessage.set('');
    this.serverError.set(false);
  }

  /** Column headers re-resolve when the UI language changes. */
  readonly columns = computed<DataTableColumn[]>(() => {
    this.lang();
    return [
      { key: 'diseaseName', header: this.i18n.instant('supReports.diseases.colName'), sortable: true },
      { key: 'summary', header: this.i18n.instant('supReports.diseases.colSummary') },
      { key: 'symptoms', header: this.i18n.instant('supReports.diseases.colSymptoms') },
      { key: 'medicalAdvice', header: this.i18n.instant('supReports.diseases.colAdvice') },
      { key: 'treatment', header: this.i18n.instant('supReports.diseases.colTreatment') },
      { key: 'selfCare', header: this.i18n.instant('supReports.diseases.colSelfCare') },
    ];
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.service
      .getDiseaseSummaryList(1, PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.loading.set(false);
          this.rows.set((page.DiseaseList ?? []).map((item) => this.toRow(item)));
        },
        error: (err: SupervisorError) => {
          this.loading.set(false);
          this.rows.set([]);
          // A 5xx is a server fault, not an empty catalogue, and the raw message
          // is never shown — see ReportRunner.messageFor for the same reasoning.
          const isServerError = err.status >= 500;
          this.serverError.set(isServerError);
          this.errorMessage.set(
            this.i18n.instant(isServerError ? 'supReports.serverError' : 'supReports.diseases.loadError'),
          );
        },
      });
  }

  private toRow(item: DiseaseSummaryItem): Record<string, unknown> {
    return {
      diseaseName: item.diseaseName ?? '',
      summary: decodeLines(item.summary),
      symptoms: decodeLines(item.symptoms_Signs),
      medicalAdvice: decodeLines(item.medicaladvice),
      treatment: decodeLines(item.treatment),
      selfCare: decodeLines(item.self_care),
    };
  }
}
