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
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { OtherHelplineService } from './other-helpline.service';
import { MmuVisitRow, OtherHelplineError } from './other-helpline.models';

/**
 * MMU/TM case-sheet history tab: lists the beneficiary's prior MMU (or TM, when
 * `isTm`) visits. Selecting a visit emits it via {@link selectVisit} so the
 * parent can open the appropriate detailed case sheet (the elaborate
 * Cancer/General detail views are separate, out-of-scope components).
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only; read-only list.
 */
@Component({
  selector: 'app-casesheet-history-mmu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TranslatePipe, ZardButtonComponent],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h3 class="mb-3 text-sm font-semibold text-foreground">
        {{ (isTm() ? 'casesheetHistory.mmu.titleTm' : 'casesheetHistory.mmu.title') | translate: lang() }}
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
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.mmu.date' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.mmu.visitReason' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.mmu.visitCategory' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.mmu.visitCode' | translate: lang() }}</th>
                <th class="px-3 py-2 text-right font-medium">{{ 'casesheetHistory.action' | translate: lang() }}</th>
              </tr>
            </thead>
            <tbody>
              @for (visit of rows(); track $index) {
                <tr class="border-t border-border align-top">
                  <td class="px-3 py-2">{{ (visit.benVisitDate | date: 'dd/MM/yyyy hh:mm a') || '—' }}</td>
                  <td class="px-3 py-2">{{ visit.VisitReason || '—' }}</td>
                  <td class="px-3 py-2">{{ visit.VisitCategory || '—' }}</td>
                  <td class="px-3 py-2">{{ visit.visitCode || '—' }}</td>
                  <td class="px-3 py-2 text-right">
                    <button z-button type="button" zType="outline" zSize="sm" (click)="selectVisit.emit(visit)">
                      {{ 'casesheetHistory.mmu.view' | translate: lang() }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class CasesheetHistoryMmuComponent {
  private readonly helpline = inject(OtherHelplineService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** Beneficiary whose MMU history to show; reloads when it changes. */
  readonly benRegID = input<number | null>(null);
  /** Query the TM base instead of the MMU base. */
  readonly isTm = input(false);

  /** Emits the visit the agent chose to view in detail. */
  readonly selectVisit = output<MmuVisitRow>();

  readonly lang = this.i18n.language;
  readonly rows = signal<MmuVisitRow[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  constructor() {
    effect(() => {
      const id = this.benRegID();
      const tm = this.isTm();
      if (id != null) {
        this.load(id, tm);
      } else {
        this.rows.set([]);
        this.errorMessage.set('');
      }
    });
  }

  private load(beneficiaryRegID: number, isTm: boolean): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.helpline
      .getMmuBenCasesheet(beneficiaryRegID, isTm)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          // Drop a stale response if the beneficiary/isTm changed mid-flight.
          if (this.benRegID() !== beneficiaryRegID || this.isTm() !== isTm) {
            return;
          }
          this.loading.set(false);
          this.rows.set(rows);
        },
        error: (err: OtherHelplineError) => {
          if (this.benRegID() !== beneficiaryRegID || this.isTm() !== isTm) {
            return;
          }
          this.loading.set(false);
          this.rows.set([]);
          this.errorMessage.set(err.errorMessage || this.i18n.instant('casesheetHistory.loadError'));
        },
      });
  }
}
