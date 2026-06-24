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

import { APP_VERSION } from '@/app-modules/core/app-version';
import { I18nService } from '@/app-modules/core/i18n/i18n.service';
import { TranslatePipe } from '@/app-modules/core/i18n/translate.pipe';

/** Organisation shown in the copyright line (not translatable). */
const ORGANISATION = 'PSMRI';

/**
 * Shared footer used by the role-selection and dashboard screens: the
 * organisation copyright line and the app version (read dynamically from
 * `package.json`). Screen-specific controls (feedback link, CZentrix toggle, …)
 * are projected into the trailing actions slot via `<ng-content>`.
 */
@Component({
  selector: 'app-shell-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <footer
      class="flex flex-wrap items-center justify-between gap-2 bg-foreground px-4 py-2 text-xs text-background sm:px-6"
    >
      <span class="flex items-center gap-1">
        <span>{{ copyrightYear }}</span>
        <span aria-hidden="true">&copy;</span>
        <span>{{ organisation }}</span>
      </span>

      <div class="flex items-center gap-4">
        <ng-content />
        <span>{{ 'dashboard.footer.version' | translate: lang() }} {{ appVersion }}</span>
      </div>
    </footer>
  `,
})
export class AppFooterComponent {
  private readonly i18n = inject(I18nService);

  readonly lang = this.i18n.language;
  readonly organisation = ORGANISATION;
  /** Current calendar year, shown as the copyright year. */
  readonly copyrightYear = new Date().getFullYear();
  readonly appVersion = APP_VERSION;
}
