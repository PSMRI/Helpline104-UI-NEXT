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

import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';

import { I18nService } from '../../app-modules/core/i18n/i18n.service';
import { TranslatePipe } from '../../app-modules/core/i18n/translate.pipe';

/** Version + commit for one side (API or UI). */
export interface VersionInfo {
  Version?: string;
  Commit?: string;
}

/**
 * App version-details modal: shows the API and UI Version/Commit side by side.
 * Pure display — the values are inputs (fetched by the parent). Emits
 * {@link closed}.
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-view-version-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideX })],
  template: `
    <section class="rounded-lg border border-border bg-card">
      <header class="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 class="text-sm font-semibold text-foreground">
          {{ 'versionDetails.title' | translate: lang() }}
        </h3>
        <button
          type="button"
          class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          [attr.aria-label]="'versionDetails.close' | translate: lang()"
          (click)="closed.emit()"
        >
          <ng-icon name="lucideX" size="16" aria-hidden="true" />
        </button>
      </header>

      <div class="p-5">
        <div class="overflow-x-auto rounded-md border border-border">
          <table class="w-full text-left text-sm">
            <thead class="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th scope="col" class="px-3 py-2 font-medium"></th>
                <th scope="col" class="px-3 py-2 font-medium">{{ 'versionDetails.api' | translate: lang() }}</th>
                <th scope="col" class="px-3 py-2 font-medium">{{ 'versionDetails.ui' | translate: lang() }}</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-t border-border">
                <th scope="row" class="px-3 py-2 font-medium text-foreground">
                  {{ 'versionDetails.version' | translate: lang() }}
                </th>
                <td class="px-3 py-2">{{ api()?.Version || '—' }}</td>
                <td class="px-3 py-2">{{ ui()?.Version || '—' }}</td>
              </tr>
              <tr class="border-t border-border">
                <th scope="row" class="px-3 py-2 font-medium text-foreground">
                  {{ 'versionDetails.commit' | translate: lang() }}
                </th>
                <td class="px-3 py-2">{{ api()?.Commit || '—' }}</td>
                <td class="px-3 py-2">{{ ui()?.Commit || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `,
})
export class ViewVersionDetailsComponent {
  private readonly i18n = inject(I18nService);

  /** API-side version details. */
  readonly api = input<VersionInfo | null>(null);
  /** UI-side version details. */
  readonly ui = input<VersionInfo | null>(null);

  readonly closed = output<void>();

  readonly lang = this.i18n.language;
}
