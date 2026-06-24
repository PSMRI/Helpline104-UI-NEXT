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

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideGlobe } from '@ng-icons/lucide';

import { I18nService } from '@/app-modules/core/i18n/i18n.service';
import { TranslatePipe } from '@/app-modules/core/i18n/translate.pipe';

/**
 * Shared branded top bar used by the role-selection and dashboard screens so
 * both wear the same chrome: the white Piramal Swasthya wordmark, a centered
 * screen title, the language selector and the signed-in agent. Screen-specific
 * controls (contacts, profile, help, logout, …) are projected into the trailing
 * actions slot via `<ng-content>`, keeping this component purely presentational.
 */
@Component({
  selector: 'app-shell-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideGlobe })],
  template: `
    <header
      class="grid grid-cols-[1fr_auto] items-center gap-3 bg-primary px-4 py-2.5 text-primary-foreground shadow-md sm:grid-cols-[1fr_auto_1fr] sm:gap-4 sm:px-6"
    >
      <div class="flex items-center gap-2.5">
        <img
          class="h-9 w-auto shrink-0 brightness-0 invert"
          src="images/piramal-swasthya.png"
          [alt]="'dashboard.header.logoAlt' | translate: lang()"
          width="120"
          height="55"
        />
        <span class="text-base font-bold tracking-wide sm:text-lg">AMRIT</span>
      </div>

      <h1
        class="order-last col-span-2 text-center text-base font-semibold sm:order-none sm:col-span-1 sm:text-xl"
      >
        {{ title() }}
      </h1>

      <div class="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
        <label class="flex items-center gap-1.5 text-sm">
          <ng-icon name="lucideGlobe" size="18" aria-hidden="true" />
          <span class="sr-only">
            {{ 'dashboard.header.languageLabel' | translate: lang() }}
          </span>
          <select
            class="rounded-md border border-white/30 bg-primary px-2 py-1 text-sm text-primary-foreground focus:outline-none focus:ring-2 focus:ring-white/60"
            [value]="lang()"
            (change)="onLanguageChange($event)"
          >
            @for (option of languages; track option.code) {
              <option
                class="text-foreground"
                [value]="option.code"
                [selected]="option.code === lang()"
              >
                {{ option.label }}
              </option>
            }
          </select>
        </label>

        @if (userName(); as name) {
          <span class="hidden text-sm sm:inline">
            {{ 'dashboard.header.welcome' | translate: lang() }} {{ name }}
          </span>
        }

        <ng-content />
      </div>
    </header>
  `,
})
export class AppHeaderComponent {
  private readonly i18n = inject(I18nService);

  /** Centered screen title, e.g. "RO Dashboard" or "Select your role". */
  readonly title = input('');
  /** Signed-in agent name shown as "Welcome {name}", or null to hide it. */
  readonly userName = input<string | null>(null);

  readonly lang = this.i18n.language;
  readonly languages = this.i18n.availableLanguages;

  onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const code = select.value;
    if (this.i18n.isImplemented(code)) {
      this.i18n.setLanguage(code);
      return;
    }
    // Not yet translated: notify and revert the selection to the active language.
    const label =
      this.languages.find((option) => option.code === code)?.label ?? code;
    window.alert(
      `${this.i18n.instant('dashboard.header.languageComingSoon')} ${label}`,
    );
    select.value = this.lang();
  }
}
