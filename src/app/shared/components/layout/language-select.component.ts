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

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideGlobe } from '@ng-icons/lucide';

import { I18nService } from '@/app-modules/core/i18n/i18n.service';
import { TranslatePipe } from '@/app-modules/core/i18n/translate.pipe';
import { ConfirmationService } from '@/app-modules/core/services/confirmation.service';

/**
 * EN/HI/AS language switcher, shared by {@link AppHeaderComponent} and the
 * on-call workspace shell ({@link InnerpageComponent}) so an agent can switch
 * languages both outside and throughout a live call.
 */
@Component({
  selector: 'app-language-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideGlobe })],
  template: `
    <label class="flex items-center gap-1.5 text-sm">
      <ng-icon name="lucideGlobe" size="18" aria-hidden="true" />
      <span class="sr-only">
        {{ 'dashboard.header.languageLabel' | translate: lang() }}
      </span>
      <select
        class="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        [value]="lang()"
        (change)="onLanguageChange($event)"
      >
        @for (option of languages; track option.code) {
          <option [value]="option.code" [selected]="option.code === lang()">
            {{ option.label }}
          </option>
        }
      </select>
    </label>
  `,
})
export class LanguageSelectComponent {
  private readonly i18n = inject(I18nService);
  private readonly confirmation = inject(ConfirmationService);

  readonly lang = this.i18n.language;
  readonly languages = this.i18n.availableLanguages;

  onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const code = select.value;
    if (this.i18n.isImplemented(code)) {
      this.i18n.setLanguage(code);
      return;
    }
    // Not yet translated: notify and revert the selection to the active
    // language. Revert first — the ZardUI notice is async, unlike the old
    // blocking `window.alert`, so the select must not linger on the
    // unimplemented option while the dialog is open.
    const label = this.languages.find((option) => option.code === code)?.label ?? code;
    select.value = this.lang();
    void this.confirmation.alert(`${this.i18n.instant('dashboard.header.languageComingSoon')} ${label}`);
  }
}
