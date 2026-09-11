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
 * `beneficiary/get104BenMedHistory`). Read-only, a flat list rather than the
 * legacy's full multi-column table — the same four fields the workspace's
 * closure/case-sheet views already surface elsewhere (date, chief complaint,
 * diagnosis, advice).
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
              <tr>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.own.date' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.own.chiefComplaint' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.own.diagnosis' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.own.advice' | translate: lang() }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track $index) {
                <tr class="border-t border-border align-top">
                  <td class="px-3 py-2">{{ (row.createdDate | date: 'dd/MM/yyyy hh:mm a') || '—' }}</td>
                  <td class="px-3 py-2">{{ row.diseaseSummary || '—' }}</td>
                  <td class="px-3 py-2">{{ row.selecteDiagnosis || '—' }}</td>
                  <td class="px-3 py-2">{{ row.addedAdvice || '—' }}</td>
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
