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
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CaseSheetHistoryEntry } from '../hao.models';
import { HaoService } from '../hao.service';

/**
 * 104 case-sheet history tab: the beneficiary's prior 104 case sheets from
 * earlier calls (legacy `case-sheet-history.html`, fed by
 * `beneficiary/get104BenMedHistory`). Read-only.
 *
 * All 15 of legacy's columns, in legacy's order, bound to legacy's fields —
 * including three pairings whose header does not describe the field behind it.
 * These are inherited legacy quirks, reproduced deliberately rather than
 * corrected, so the table reads the same as the app it replaces:
 *
 *   - "Present Chief Complaint" renders `diseaseSummary`;
 *   - "Symptoms" renders `algorithm`;
 *   - "Information Given" repeats the "Disease Summary" expression verbatim,
 *     so those two columns always show the same value.
 *
 * `isChiefComplaint` is legacy's switch on `selecteDiagnosis`: when set, the
 * value shows under "Provisional / Selected Diagnosis"; when not, under
 * "Disease Summary" and "Information Given". Legacy's 16th column (a second
 * "Action by MO") and its `actionByCO` cell are commented out upstream and so
 * are not rendered here either.
 *
 * Standalone, OnPush + signals, mirroring the MCTS/MMU history tab
 * components' load-on-input-change convention.
 */
@Component({
  selector: 'app-case-sheet-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TranslatePipe],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h3 class="mb-3 text-sm font-semibold text-foreground">
        {{ 'casesheetHistory.own.title' | translate: lang() }}
      </h3>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      @if (loading()) {
        <p class="py-6 text-center text-sm text-muted-foreground">
          {{ 'casesheetHistory.loading' | translate: lang() }}
        </p>
      } @else if (rows().length === 0) {
        <p class="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          {{ 'casesheetHistory.empty' | translate: lang() }}
        </p>
      } @else {
        <div class="overflow-x-auto rounded-md border border-border">
          <table class="w-full text-left text-sm">
            <thead class="bg-muted/50 text-xs text-muted-foreground">
              <tr class="whitespace-nowrap">
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.own.id' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.own.name' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.own.age' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.own.date' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">
                  {{ 'casesheetHistory.own.presentChiefComplaint' | translate: lang() }}
                </th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.own.diseaseSummary' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.own.symptoms' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">
                  {{ 'casesheetHistory.own.provisionalSelectedDiagnosis' | translate: lang() }}
                </th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.own.riskLevel' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.own.informationGiven' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">
                  {{ 'casesheetHistory.own.recommendedAction' | translate: lang() }}
                </th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.own.actionByHao' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.own.actionByMo' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">
                  {{ 'casesheetHistory.own.treatmentRecommendation' | translate: lang() }}
                </th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.own.actionByPd' | translate: lang() }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track $index) {
                <tr class="border-t border-border align-top">
                  <td class="px-3 py-2">{{ row.requestID || row.benHistoryID || '—' }}</td>
                  <td class="px-3 py-2">{{ row.patientName || '—' }}</td>
                  <td class="px-3 py-2">{{ row.patientAge || '—' }}</td>
                  <td class="px-3 py-2">{{ (row.createdDate | date: 'dd/MM/yyyy hh:mm a') || '—' }}</td>
                  <!-- Header/field pairings 5, 7 and 10 look wrong because they are
                       wrong in legacy; see the class doc comment. Ported as-is. -->
                  <td class="px-3 py-2" [title]="row.diseaseSummaryID || ''">{{ row.diseaseSummary || '—' }}</td>
                  <td class="px-3 py-2" [title]="row.selecteDiagnosisID || ''">
                    {{ (row.isChiefComplaint ? '' : row.selecteDiagnosis) || '—' }}
                  </td>
                  <td class="px-3 py-2">{{ row.algorithm || '—' }}</td>
                  <td class="px-3 py-2" [title]="row.selecteDiagnosisID || ''">
                    {{ (row.isChiefComplaint ? row.selecteDiagnosis : '') || '—' }}
                  </td>
                  <td class="px-3 py-2">{{ row.riskLevel || '—' }}</td>
                  <td class="px-3 py-2" [title]="row.selecteDiagnosisID || ''">
                    {{ (row.isChiefComplaint ? '' : row.selecteDiagnosis) || '—' }}
                  </td>
                  <td class="px-3 py-2">{{ row.addedAdvice || '—' }}</td>
                  <td class="px-3 py-2">{{ row.actionByHAO || '—' }}</td>
                  <td class="px-3 py-2">{{ row.actionByMO || '—' }}</td>
                  <td class="px-3 py-2">{{ row.treatmentRecommendation || '—' }}</td>
                  <td class="px-3 py-2">{{ row.actionByPD || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class CaseSheetHistoryComponent {
  private readonly haoService = inject(HaoService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** Beneficiary whose 104 case-sheet history to show; reloads when it changes. */
  readonly benRegID = input<number | null>(null);

  readonly lang = this.i18n.language;

  readonly rows = signal<CaseSheetHistoryEntry[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  constructor() {
    effect(() => {
      const id = this.benRegID();
      if (id != null) {
        this.load(id);
      } else {
        this.rows.set([]);
        this.errorMessage.set('');
      }
    });
  }

  private load(beneficiaryRegID: number): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.haoService
      .getCaseSheetHistory(beneficiaryRegID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          // Drop a stale response if the beneficiary changed mid-flight.
          if (this.benRegID() !== beneficiaryRegID) {
            return;
          }
          this.loading.set(false);
          this.rows.set(rows);
        },
        error: () => {
          if (this.benRegID() !== beneficiaryRegID) {
            return;
          }
          this.loading.set(false);
          this.rows.set([]);
          this.errorMessage.set(this.i18n.instant('casesheetHistory.loadError'));
        },
      });
  }
}
