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
import { lucideBell } from '@ng-icons/lucide';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationKey } from '../../core/i18n/locales';

/** One alert category row: its label and its empty-state message key. */
interface AlertRow {
  readonly labelKey: TranslationKey;
  readonly emptyKey: TranslationKey;
}

const ALERT_ROWS: readonly AlertRow[] = [
  { labelKey: 'dashboard.alerts.alerts', emptyKey: 'dashboard.alerts.noAlerts' },
  {
    labelKey: 'dashboard.alerts.officeBulletin',
    emptyKey: 'dashboard.alerts.noOfficeBulletin',
  },
  {
    labelKey: 'dashboard.alerts.notifications',
    emptyKey: 'dashboard.alerts.noNotifications',
  },
];

/**
 * Alerts & Notifications panel. Lists the three message categories; clicking a
 * category bell opens an info notice (there are no messages in any category).
 * The panel-header bell is decorative.
 */
@Component({
  selector: 'app-alerts-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideBell })],
  template: `
    <section
      class="flex h-full flex-col rounded-lg bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md"
    >
      <header
        class="flex items-center justify-between border-b border-border px-4 py-3"
      >
        <h2 class="text-lg font-semibold">
          {{ 'dashboard.alerts.title' | translate: lang() }}
        </h2>
        <ng-icon name="lucideBell" size="18" class="text-primary" aria-hidden="true" />
      </header>

      <ul class="divide-y divide-border">
        @for (row of rows; track row.labelKey) {
          <li class="flex items-center justify-between px-4 py-3">
            <span class="text-sm">{{ row.labelKey | translate: lang() }}</span>
            <button
              type="button"
              class="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              [attr.aria-label]="row.labelKey | translate: lang()"
              (click)="showEmpty(row.emptyKey)"
            >
              <ng-icon name="lucideBell" size="18" aria-hidden="true" />
            </button>
          </li>
        }
      </ul>
    </section>
  `,
})
export class AlertsPanelComponent {
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly lang = this.i18n.language;
  readonly rows = ALERT_ROWS;

  showEmpty(emptyKey: TranslationKey): void {
    this.confirmDialog
      .alert({
        title: this.i18n.instant('dashboard.dialog.info'),
        message: this.i18n.instant(emptyKey),
        okText: this.i18n.instant('dashboard.dialog.ok'),
      })
      .subscribe();
  }
}
