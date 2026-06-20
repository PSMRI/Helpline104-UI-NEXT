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
import { lucideActivity, lucideBookOpen } from '@ng-icons/lucide';

import { ZardDialogService } from '@common-ui/ui/dialog';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { KmDocsDialogComponent } from './dialogs/km-docs-dialog.component';

/**
 * Activity-for-this-week panel. The Training Resources row opens the KM Docs
 * modal (empty); a count badge shows pending items. "More" is not yet wired.
 */
@Component({
  selector: 'app-activity-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideActivity, lucideBookOpen })],
  template: `
    <section
      class="flex h-full flex-col rounded-lg border border-border bg-card text-card-foreground shadow-sm"
    >
      <header
        class="flex items-center justify-between border-b border-border px-4 py-3"
      >
        <h2 class="text-base font-semibold">
          {{ 'dashboard.activity.title' | translate: lang() }}
        </h2>
        <ng-icon
          name="lucideActivity"
          size="18"
          class="text-primary"
          aria-hidden="true"
        />
      </header>

      <div class="flex flex-1 flex-col px-4 py-3">
        <button
          type="button"
          class="flex items-center justify-between rounded-md px-1 py-2 text-left hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          (click)="openKmDocs()"
        >
          <span class="flex items-center gap-2 text-sm">
            <ng-icon name="lucideBookOpen" size="18" aria-hidden="true" />
            {{ 'dashboard.activity.trainingResources' | translate: lang() }}
          </span>
          @if (count() > 0) {
            <span
              class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground"
            >
              {{ count() }}
            </span>
          }
        </button>

        <div class="mt-auto pt-2 text-right">
          <button
            type="button"
            class="text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {{ 'dashboard.activity.more' | translate: lang() }}
          </button>
        </div>
      </div>
    </section>
  `,
})
export class ActivityPanelComponent {
  private readonly i18n = inject(I18nService);
  private readonly dialog = inject(ZardDialogService);

  readonly lang = this.i18n.language;

  /** Pending training-resource count shown as a badge (0 hides the badge). */
  readonly count = input(0);

  openKmDocs(): void {
    this.dialog.create({
      zTitle: this.i18n.instant('dashboard.activity.kmDocsTitle'),
      zContent: KmDocsDialogComponent,
      zHideFooter: true,
      zWidth: '32rem',
    });
  }
}
