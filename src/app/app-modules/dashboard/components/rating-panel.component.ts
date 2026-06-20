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

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** Rating panel. Display-only; the rating widget is not yet wired. */
@Component({
  selector: 'app-rating-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <section
      class="flex h-full flex-col rounded-lg border border-border bg-card text-card-foreground shadow-sm"
    >
      <header class="border-b border-border px-4 py-3">
        <h2 class="text-base font-semibold">
          {{ 'dashboard.rating.title' | translate: lang() }}
        </h2>
      </header>
      <div class="px-4 py-3 text-sm text-muted-foreground">
        {{ 'dashboard.rating.panelContent' | translate: lang() }}
      </div>
    </section>
  `,
})
export class RatingPanelComponent {
  private readonly i18n = inject(I18nService);
  readonly lang = this.i18n.language;
}
