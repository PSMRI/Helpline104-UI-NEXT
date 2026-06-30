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
  computed,
  inject,
} from '@angular/core';

import { RouterOutlet } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleDot, lucidePhoneIncoming } from '@ng-icons/lucide';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CallStore } from '../call.store';
import { CallDurationTimerComponent } from './call-duration-timer.component';

/**
 * On-call workspace shell (`/innerpage`), reached only while a call is connected
 * (see {@link inboundGuard}).
 *
 * Renders the caller header (the inbound phone number / CLI), the agent's
 * on-call status, a live call-duration timer, and hosts the role dispatcher that
 * will switch to the RO/HAO workspaces. This is the shell only — the dispatcher
 * is currently a placeholder.
 */
@Component({
  selector: 'app-innerpage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    NgIcon,
    TranslatePipe,
    CallDurationTimerComponent,
  ],
  viewProviders: [provideIcons({ lucidePhoneIncoming, lucideCircleDot })],
  template: `
    <div class="flex min-h-screen flex-col bg-background text-foreground">
      <header class="border-b border-border bg-card">
        <div
          class="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"
        >
          <div class="flex items-center gap-3">
            <span
              class="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <ng-icon name="lucidePhoneIncoming" size="22" aria-hidden="true" />
            </span>
            <div class="flex flex-col">
              <span class="text-xs uppercase tracking-wide text-muted-foreground">
                {{ 'innerpage.callerNumber' | translate: lang() }}
              </span>
              <span class="text-xl font-semibold leading-tight">
                {{ callerNumber() }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-6">
            <app-call-duration-timer />

            <span
              class="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-600"
            >
              <ng-icon name="lucideCircleDot" size="16" aria-hidden="true" />
              {{ 'innerpage.statusOnCall' | translate: lang() }}
            </span>
          </div>
        </div>
      </header>

      <main class="flex-1 bg-muted/40 py-6">
        <div class="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class InnerpageComponent {
  private readonly i18n = inject(I18nService);
  private readonly callStore = inject(CallStore);

  readonly lang = this.i18n.language;

  /** The caller's phone number, or a dash when unavailable. */
  readonly callerNumber = computed(() => this.callStore.cli() ?? '—');
}
