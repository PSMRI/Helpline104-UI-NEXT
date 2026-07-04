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
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { FeedbackLogService } from './feedback-log.service';
import { FeedbackLogRow } from './feedback-log.models';

/**
 * Change-log modal: the change history of a grievance/feedback (the legacy
 * `change-log-modal`, which is a feedback change-log — not an app changelog).
 * Loads the log for the `feedbackID` input and shows it as a read-only table.
 * Emits {@link closed}.
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-change-log-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideX })],
  template: `
    <section class="rounded-lg border border-border bg-card">
      <header class="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 class="text-sm font-semibold text-foreground">
          {{ 'changeLog.title' | translate: lang() }}
        </h3>
        <button
          type="button"
          class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          [attr.aria-label]="'changeLog.close' | translate: lang()"
          (click)="closed.emit()"
        >
          <ng-icon name="lucideX" size="16" aria-hidden="true" />
        </button>
      </header>

      <div class="p-5">
        @if (errorMessage()) {
          <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
        }
        @if (loading()) {
          <p class="py-6 text-center text-sm text-muted-foreground">{{ 'changeLog.loading' | translate: lang() }}</p>
        } @else if (rows().length === 0) {
          <p class="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            {{ 'changeLog.empty' | translate: lang() }}
          </p>
        } @else {
          <div class="overflow-x-auto rounded-md border border-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">{{ 'changeLog.sno' | translate: lang() }}</th>
                  <th scope="col" class="px-3 py-2 font-medium">{{ 'changeLog.log' | translate: lang() }}</th>
                  <th scope="col" class="px-3 py-2 font-medium">{{ 'changeLog.modifiedBy' | translate: lang() }}</th>
                  <th scope="col" class="px-3 py-2 font-medium">{{ 'changeLog.modifiedDate' | translate: lang() }}</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track $index; let i = $index) {
                  <tr class="border-t border-border align-top">
                    <td class="px-3 py-2">{{ i + 1 }}</td>
                    <td class="px-3 py-2">{{ row.feedbackLogs || '—' }}</td>
                    <td class="px-3 py-2">{{ row.createdBy || '—' }}</td>
                    <td class="px-3 py-2">{{ (row.createdDate | date: 'dd/MM/yyyy hh:mm a') || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
  `,
})
export class ChangeLogModalComponent {
  private readonly feedbackLog = inject(FeedbackLogService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** The grievance/feedback whose change-log to show; reloads when it changes. */
  readonly feedbackID = input<number | null>(null);

  readonly closed = output<void>();

  readonly lang = this.i18n.language;
  readonly rows = signal<FeedbackLogRow[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  constructor() {
    effect(() => {
      const id = this.feedbackID();
      if (id != null) {
        this.load(id);
      } else {
        this.rows.set([]);
      }
    });
  }

  private load(feedbackID: number): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.feedbackLog
      .getFeedbackLogs(feedbackID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          if (this.feedbackID() !== feedbackID) {
            return;
          }
          this.loading.set(false);
          this.rows.set(rows);
        },
        error: (err: { errorMessage?: string }) => {
          if (this.feedbackID() !== feedbackID) {
            return;
          }
          this.loading.set(false);
          this.rows.set([]);
          this.errorMessage.set(err.errorMessage || this.i18n.instant('changeLog.loadError'));
        },
      });
  }
}
