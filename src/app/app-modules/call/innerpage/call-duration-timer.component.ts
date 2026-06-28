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
  computed,
  inject,
  signal,
} from '@angular/core';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock } from '@ng-icons/lucide';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CallStore } from '../call.store';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const TICK_MS = 1000;

/** Zero-pad a time part to two digits. */
function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * Live call-duration timer rendered as `HH:MM:SS`.
 *
 * Counts up from the call's connect time (held in {@link CallStore}, so the
 * duration stays correct across an `/innerpage` reload — not just from when this
 * component mounted). A 1-second interval, torn down with the component, drives
 * an elapsed-seconds signal so the OnPush view updates each tick.
 */
@Component({
  selector: 'app-call-duration-timer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideClock })],
  template: `
    <span
      class="inline-flex items-center gap-2 font-mono text-lg tabular-nums"
      role="timer"
      aria-live="off"
      [attr.aria-label]="
        ('innerpage.timer.ariaLabel' | translate: lang()) + ' ' + elapsed()
      "
    >
      <ng-icon name="lucideClock" size="18" aria-hidden="true" />
      {{ elapsed() }}
    </span>
  `,
})
export class CallDurationTimerComponent {
  private readonly i18n = inject(I18nService);
  private readonly callStore = inject(CallStore);

  readonly lang = this.i18n.language;
  // Fall back to "now" if the connect time is somehow missing, so the timer
  // shows 00:00:00 rather than a nonsensical value.
  private readonly startedAt = this.callStore.startedAt() ?? Date.now();
  private readonly _elapsedSeconds = signal(this.computeElapsed());

  /** Elapsed call time formatted as `HH:MM:SS`. */
  readonly elapsed = computed(() => {
    const total = this._elapsedSeconds();
    const hours = Math.floor(total / SECONDS_PER_HOUR);
    const minutes = Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    const seconds = total % SECONDS_PER_MINUTE;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  });

  constructor() {
    const intervalId = setInterval(() => {
      this._elapsedSeconds.set(this.computeElapsed());
    }, TICK_MS);

    inject(DestroyRef).onDestroy(() => clearInterval(intervalId));
  }

  /** Whole seconds elapsed since the call connected (never negative). */
  private computeElapsed(): number {
    return Math.max(0, Math.floor((Date.now() - this.startedAt) / TICK_MS));
  }
}
