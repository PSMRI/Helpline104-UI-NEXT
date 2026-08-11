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

import { ZardButtonComponent } from '@common-ui/ui/button';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { OtherHelplineService } from './other-helpline.service';
import { MctsCallRow, MctsQaRow, OtherHelplineError } from './other-helpline.models';

/**
 * MCTS call-history tab: lists the beneficiary's prior MCTS outbound calls and,
 * on demand, the question/answer detail for a call (shown inline). Read-only.
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only. The beneficiary id is
 * an input; history reloads whenever it changes.
 */
@Component({
  selector: 'app-casesheet-history-mcts',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TranslatePipe, ZardButtonComponent],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h3 class="mb-3 text-sm font-semibold text-foreground">
        {{ 'casesheetHistory.mcts.title' | translate: lang() }}
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
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.mcts.callType' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.mcts.callDate' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.mcts.status' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.mcts.smsAdvice' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'casesheetHistory.mcts.remarks' | translate: lang() }}</th>
                <th class="px-3 py-2 text-right font-medium">{{ 'casesheetHistory.action' | translate: lang() }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track $index; let i = $index) {
                <tr class="border-t border-border align-top">
                  <td class="px-3 py-2">
                    {{ row.mctsOutboundCall?.displayOBCallType || row.callType?.callType || '—' }}
                  </td>
                  <td class="px-3 py-2">{{ (row.createdDate | date: 'dd/MM/yyyy hh:mm a') || '—' }}</td>
                  <td class="px-3 py-2">{{ row.callType?.callGroupType || '—' }}</td>
                  <td class="px-3 py-2">{{ row.smsAdvice || '—' }}</td>
                  <td class="px-3 py-2">{{ row.remark || '—' }}</td>
                  <td class="px-3 py-2 text-right">
                    @if (row.callDetailID != null) {
                      <button z-button type="button" zType="outline" zSize="sm" (click)="toggleQa(row.callDetailID)">
                        {{
                          (qaOpenFor() === row.callDetailID
                            ? 'casesheetHistory.mcts.hideQa'
                            : 'casesheetHistory.mcts.viewQa'
                          ) | translate: lang()
                        }}
                      </button>
                    }
                  </td>
                </tr>
                @if (qaOpenFor() === row.callDetailID) {
                  <tr class="border-t border-border bg-muted/30">
                    <td colspan="6" class="px-3 py-3">
                      @if (qaLoading()) {
                        <p class="text-sm text-muted-foreground">
                          {{ 'casesheetHistory.loading' | translate: lang() }}
                        </p>
                      } @else if (qaError()) {
                        <p class="text-sm font-medium text-destructive" role="alert">{{ qaError() }}</p>
                      } @else if (qaRows().length === 0) {
                        <p class="text-sm text-muted-foreground">
                          {{ 'casesheetHistory.mcts.noQa' | translate: lang() }}
                        </p>
                      } @else {
                        <p class="mb-2 text-xs font-medium text-muted-foreground">
                          {{ 'casesheetHistory.mcts.qaTitle' | translate: lang() }}
                        </p>
                        <ul class="flex flex-col gap-2">
                          @for (qa of qaRows(); track $index) {
                            <li class="text-sm">
                              <span class="font-medium text-foreground">{{
                                qa.questionnaireDetail?.question || '—'
                              }}</span>
                              <span class="text-muted-foreground"> — {{ qa.answer || '—' }}</span>
                            </li>
                          }
                        </ul>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class CasesheetHistoryMctsComponent {
  private readonly helpline = inject(OtherHelplineService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** Beneficiary whose MCTS history to show; history reloads when it changes. */
  readonly benRegID = input<number | null>(null);

  readonly lang = this.i18n.language;

  readonly rows = signal<MctsCallRow[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly qaRows = signal<MctsQaRow[]>([]);
  readonly qaOpenFor = signal<number | null>(null);
  readonly qaLoading = signal(false);
  readonly qaError = signal('');

  constructor() {
    // Reload the history whenever the beneficiary id input changes.
    effect(() => {
      const id = this.benRegID();
      this.qaOpenFor.set(null);
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
    this.helpline
      .getMctsCallHistory(beneficiaryRegID)
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
        error: (err: OtherHelplineError) => {
          if (this.benRegID() !== beneficiaryRegID) {
            return;
          }
          this.loading.set(false);
          this.rows.set([]);
          this.errorMessage.set(err.errorMessage || this.i18n.instant('casesheetHistory.loadError'));
        },
      });
  }

  toggleQa(callDetailID: number): void {
    if (this.qaOpenFor() === callDetailID) {
      this.qaOpenFor.set(null);
      return;
    }
    this.qaOpenFor.set(callDetailID);
    this.qaRows.set([]);
    this.qaError.set('');
    this.qaLoading.set(true);
    this.helpline
      .getMctsCallResponse(callDetailID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          // Ignore a stale response if the agent collapsed/switched meanwhile.
          if (this.qaOpenFor() !== callDetailID) {
            return;
          }
          this.qaLoading.set(false);
          this.qaRows.set(rows);
        },
        error: (err: OtherHelplineError) => {
          if (this.qaOpenFor() !== callDetailID) {
            return;
          }
          this.qaLoading.set(false);
          this.qaRows.set([]);
          // Surface the fetch failure instead of a misleading "no records" state.
          this.qaError.set(err.errorMessage || this.i18n.instant('casesheetHistory.loadError'));
        },
      });
  }
}
