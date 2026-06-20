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
  computed,
  inject,
  signal,
} from '@angular/core';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/locales';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { DashboardStore } from '../dashboard.store';

/** How often the displayed date is refreshed so it survives a midnight rollover. */
const DATE_REFRESH_MS = 60_000;

/** A single statistic tile: its label key and pre-formatted value. */
interface StatisticCard {
  readonly labelKey: TranslationKey;
  readonly value: string;
}

/** Format a whole-second duration as zero-padded `HH:MM:SS`. */
function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number): string => value.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Call-statistics panel: today's duration, break, free time and call count. */
@Component({
  selector: 'app-call-statistics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TranslatePipe],
  template: `
    <section
      class="rounded-lg border border-border bg-card text-card-foreground shadow-sm"
    >
      <header
        class="flex items-center justify-between border-b border-border px-4 py-3"
      >
        <h2 class="text-base font-semibold">
          {{ 'dashboard.callStatistics.title' | translate: lang() }}
        </h2>
        <span class="text-sm text-muted-foreground">
          {{ today() | date: 'dd/MM/yyyy' }}
        </span>
      </header>

      <dl class="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
        @for (card of cards(); track card.labelKey) {
          <div class="flex flex-col items-center gap-1 bg-card px-4 py-6">
            <dd class="text-3xl font-bold tabular-nums text-primary">
              {{ card.value }}
            </dd>
            <dt class="text-center text-sm text-muted-foreground">
              {{ card.labelKey | translate: lang() }}
            </dt>
          </div>
        }
      </dl>
    </section>
  `,
})
export class CallStatisticsComponent {
  private readonly store = inject(DashboardStore);
  private readonly i18n = inject(I18nService);

  private readonly _today = signal(new Date());

  readonly lang = this.i18n.language;
  /** Today's date, refreshed periodically so it stays correct across midnight. */
  readonly today = this._today.asReadonly();

  constructor() {
    const intervalId = setInterval(
      () => this._today.set(new Date()),
      DATE_REFRESH_MS,
    );
    inject(DestroyRef).onDestroy(() => clearInterval(intervalId));
  }

  readonly cards = computed<StatisticCard[]>(() => {
    const stats = this.store.callStatistics();
    return [
      {
        labelKey: 'dashboard.callStatistics.callDuration',
        value: formatDuration(stats.callDurationSeconds),
      },
      {
        labelKey: 'dashboard.callStatistics.breakTime',
        value: formatDuration(stats.breakTimeSeconds),
      },
      {
        labelKey: 'dashboard.callStatistics.freeTime',
        value: formatDuration(stats.freeTimeSeconds),
      },
      {
        labelKey: 'dashboard.callStatistics.totalCalls',
        value: stats.totalCalls.toString(),
      },
    ];
  });
}
