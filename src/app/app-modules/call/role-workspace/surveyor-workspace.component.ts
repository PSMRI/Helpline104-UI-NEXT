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
import { CallTypeReportComponent } from '../../reports/call-type-report.component';

/**
 * Surveyor on-call workspace (route `/innerpage/surveyor`).
 *
 * Unlike the other role workspaces, the legacy `104-surveyor` is not a
 * case-sheet/closure wizard — it simply hosts the surveyor call-type reports
 * (`<app-surveyor-calltype-reports>`), rebuilt as
 * {@link CallTypeReportComponent}.
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-surveyor-workspace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, CallTypeReportComponent],
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

      <app-call-type-report />
    </section>
  `,
})
export class SurveyorWorkspaceComponent {
  private readonly i18n = inject(I18nService);
  readonly lang = this.i18n.language;
}
