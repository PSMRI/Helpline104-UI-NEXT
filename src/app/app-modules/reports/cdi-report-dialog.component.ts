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
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Z_MODAL_DATA } from '@common-ui/ui/dialog';
import { ZardTableImports } from '@common-ui/ui/table';

import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { CdiQaMapping, ReportError } from './call-type-report.models';
import { CallTypeReportService } from './call-type-report.service';

/** The call the report is opened for, passed via the dialog `zData`. */
export interface CdiReportDialogData {
  readonly beneficiaryRegID: number | null;
  readonly benCallID: number | null;
}

/**
 * Body of the Customer Delight Report modal, opened from a Closed row of the
 * Call Type report. Ported from the legacy `CDICallModel` in report mode:
 * lists each question with the caller's answer and its weightage, plus the
 * total score (free-text answers carry no weightage → "NA").
 */
@Component({
  selector: 'app-cdi-report-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ZardTableImports, TranslatePipe],
  template: `
    @if (loading()) {
      <p class="py-6 text-center text-sm text-muted-foreground">
        {{ 'reports.cdi.loading' | translate: lang() }}
      </p>
    } @else if (errorMessage()) {
      <p class="py-6 text-center text-sm font-medium text-destructive" role="alert">
        {{ errorMessage() }}
      </p>
    } @else if (rows().length === 0) {
      <p class="py-6 text-center text-sm text-muted-foreground">
        {{ 'reports.cdi.empty' | translate: lang() }}
      </p>
    } @else {
      <div class="overflow-x-auto">
        <table z-table>
          <thead z-table-header>
            <tr z-table-row>
              <th z-table-head>{{ 'reports.cdi.question' | translate: lang() }}</th>
              <th z-table-head>{{ 'reports.cdi.answer' | translate: lang() }}</th>
              <th z-table-head class="text-right">
                {{ 'reports.cdi.weightage' | translate: lang() }}
              </th>
            </tr>
          </thead>
          <tbody z-table-body>
            @for (row of rows(); track $index) {
              <tr z-table-row>
                <td z-table-cell>{{ row.m_questionnaire?.question || '—' }}</td>
                <td z-table-cell>{{ row.answer || '—' }}</td>
                <td z-table-cell class="text-right">{{ weightageOf(row) }}</td>
              </tr>
            }
            <tr z-table-row>
              <td z-table-cell colspan="2" class="font-semibold">
                {{ 'reports.cdi.total' | translate: lang() }}
              </td>
              <td z-table-cell class="text-right font-semibold">{{ totalScore() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    }
  `,
})
export class CdiReportDialogComponent implements OnInit {
  private readonly reportService = inject(CallTypeReportService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly data = inject<CdiReportDialogData>(Z_MODAL_DATA);

  readonly lang = this.i18n.language;

  readonly rows = signal<CdiQaMapping[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  /** Sum of the per-question scores (legacy "Total Weightage"). */
  readonly totalScore = computed(() =>
    this.rows().reduce((total, row) => total + (row.score ?? 0), 0),
  );

  ngOnInit(): void {
    this.reportService
      .getCallReports(this.data.beneficiaryRegID, this.data.benCallID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.loading.set(false);
          this.rows.set(rows);
        },
        error: (err: ReportError) => {
          this.loading.set(false);
          this.errorMessage.set(err.errorMessage || this.i18n.instant('reports.cdi.error'));
        },
      });
  }

  /** Free-text answers carry no weightage (legacy shows "NA"). */
  weightageOf(row: CdiQaMapping): string {
    return row.m_questionnaire?.answerType === 'Free Text'
      ? this.i18n.instant('reports.cdi.na')
      : String(row.score ?? 0);
  }
}
