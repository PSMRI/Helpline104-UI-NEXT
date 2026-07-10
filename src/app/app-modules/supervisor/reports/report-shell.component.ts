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
import { lucideDownload, lucideEye } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationKey } from '../../core/i18n/locales';
import { ReportRunner } from './report-runner';
import { ReportResultsComponent } from './report-results.component';

/**
 * The card every supervisor report screen shares: title, error banner, the
 * projected filter form, the View/Export actions and the parsed results table.
 * Reports project only their filters and react to the `view`/`export` outputs.
 */
@Component({
  selector: 'app-report-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe, ZardButtonComponent, ReportResultsComponent],
  viewProviders: [provideIcons({ lucideDownload, lucideEye })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h3 class="mb-4 text-base font-semibold text-foreground">
        {{ titleKey() | translate: lang() }}
      </h3>

      @if (runner().errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">
          {{ runner().errorMessage() }}
        </p>
      }

      <ng-content />

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button
          z-button
          type="button"
          [zLoading]="runner().loading()"
          [zDisabled]="disabled()"
          (click)="view.emit()"
        >
          <ng-icon name="lucideEye" size="16" aria-hidden="true" />
          {{ 'supReports.view' | translate: lang() }}
        </button>
        <button
          z-button
          type="button"
          zType="outline"
          [zLoading]="runner().exporting()"
          [zDisabled]="disabled()"
          (click)="export.emit()"
        >
          <ng-icon name="lucideDownload" size="16" aria-hidden="true" />
          {{ 'supReports.export' | translate: lang() }}
        </button>
      </div>

      <app-report-results [runner]="runner()" />
    </section>
  `,
})
export class ReportShellComponent {
  private readonly i18n = inject(I18nService);
  readonly lang = this.i18n.language;

  /** The report card's heading. */
  readonly titleKey = input.required<TranslationKey>();
  /** The owning report's runner (drives spinners, error and results). */
  readonly runner = input.required<ReportRunner>();
  /** Disables both actions (bind the filter form's validity). */
  readonly disabled = input(false);

  readonly view = output<void>();
  readonly export = output<void>();
}
