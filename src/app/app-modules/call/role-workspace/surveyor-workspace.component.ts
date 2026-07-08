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
import { lucideClipboardList } from '@ng-icons/lucide';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * Surveyor on-call workspace (route `/innerpage/surveyor`).
 *
 * Unlike the other role workspaces, the legacy `104-surveyor` is not a
 * case-sheet/closure wizard — it simply hosts the surveyor call-type reports
 * (`<app-surveyor-calltype-reports>`). That report is part of the reporting
 * suite and is migrated separately; this workspace provides the titled host and
 * a placeholder until the report component lands.
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-surveyor-workspace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideClipboardList })],
  template: `
    <section class="rounded-xl border border-border bg-card p-4 sm:p-6">
      <header class="mb-4 flex flex-col gap-1">
        <h1 class="text-lg font-semibold text-foreground">
          {{ 'roleWorkspace.surveyor.title' | translate: lang() }}
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ 'roleWorkspace.surveyor.subtitle' | translate: lang() }}
        </p>
      </header>

      <div
        class="flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-10 text-center"
      >
        <ng-icon name="lucideClipboardList" size="40" class="text-muted-foreground" aria-hidden="true" />
        <p class="text-base font-medium text-foreground">
          {{ 'roleWorkspace.surveyor.reportsTitle' | translate: lang() }}
        </p>
        <p class="max-w-md text-sm text-muted-foreground">
          {{ 'roleWorkspace.surveyor.reportsPlaceholder' | translate: lang() }}
        </p>
      </div>
    </section>
  `,
})
export class SurveyorWorkspaceComponent {
  private readonly i18n = inject(I18nService);
  readonly lang = this.i18n.language;
}
