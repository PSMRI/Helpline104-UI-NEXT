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

import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TitleCasePipe } from '@angular/common';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { DiseaseSummaryDetail } from './disease-summary.models';

/** One rendered section (label key + value) of the disease detail. */
interface Section {
  labelKey:
    | 'diseaseSummary.summary'
    | 'diseaseSummary.couldBeDangerous'
    | 'diseaseSummary.causes'
    | 'diseaseSummary.dosDonts'
    | 'diseaseSummary.signsSymptoms'
    | 'diseaseSummary.medicalAdvice'
    | 'diseaseSummary.riskFactors'
    | 'diseaseSummary.treatment'
    | 'diseaseSummary.selfCare'
    | 'diseaseSummary.investigations';
  value: string;
}

/**
 * Disease-summary "details" modal: shows one disease's summary, causes, dos &
 * don'ts, signs, advice, risk factors, treatment, self-care and investigations.
 * The backend stores these `$`-delimited (and most with a leading marker char);
 * they are rendered with newlines, mirroring the legacy `setSummaryDetails`.
 * Emits {@link accepted} (OK) / {@link cancelled} (close).
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only; pure display.
 */
@Component({
  selector: 'app-view-disease-summary-details',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TitleCasePipe, NgIcon, TranslatePipe, ZardButtonComponent],
  viewProviders: [provideIcons({ lucideX })],
  template: `
    <section class="rounded-lg border border-border bg-card">
      <header class="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 class="text-sm font-semibold text-foreground">{{ diseaseName() | titlecase }}</h3>
        <button
          type="button"
          class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          [attr.aria-label]="'diseaseSummary.close' | translate: lang()"
          (click)="cancelled.emit()"
        >
          <ng-icon name="lucideX" size="16" aria-hidden="true" />
        </button>
      </header>

      <div class="max-h-[70vh] overflow-y-auto p-5">
        <dl class="flex flex-col gap-3 text-sm">
          @for (s of sections(); track s.labelKey) {
            <div>
              <dt class="font-medium text-foreground">{{ s.labelKey | translate: lang() }}</dt>
              <dd class="whitespace-pre-line text-muted-foreground">{{ s.value }}</dd>
            </div>
          }
        </dl>
      </div>

      <footer class="flex justify-end gap-2 border-t border-border px-5 py-3">
        <button z-button type="button" zType="outline" (click)="cancelled.emit()">
          {{ 'diseaseSummary.cancel' | translate: lang() }}
        </button>
        <button z-button type="button" zType="default" (click)="accepted.emit()">
          {{ 'diseaseSummary.ok' | translate: lang() }}
        </button>
      </footer>
    </section>
  `,
})
export class ViewDiseaseSummaryDetailsComponent {
  private readonly i18n = inject(I18nService);

  /** The disease detail to render. */
  readonly detail = input<DiseaseSummaryDetail | null>(null);

  /** OK — the agent accepts/keeps the detail. */
  readonly accepted = output<void>();
  /** Close/Cancel — the agent dismisses the detail. */
  readonly cancelled = output<void>();

  readonly lang = this.i18n.language;

  readonly diseaseName = computed(() => this.detail()?.diseaseName ?? '');

  readonly sections = computed<Section[]>(() => {
    const d = this.detail();
    if (!d) {
      return [];
    }
    // Legacy: `summary` is comma-joined; the rest newline-joined; most fields
    // drop a leading marker char (substring(1)); `couldbedangerous` does not.
    return [
      { labelKey: 'diseaseSummary.summary', value: this.format(d.summary, ', ', true) },
      {
        labelKey: 'diseaseSummary.couldBeDangerous',
        value: this.format(d.couldbedangerous, '\n', false),
      },
      { labelKey: 'diseaseSummary.causes', value: this.format(d.causes, '\n', true) },
      { labelKey: 'diseaseSummary.dosDonts', value: this.format(d.dos_donts, '\n', true) },
      {
        labelKey: 'diseaseSummary.signsSymptoms',
        value: this.format(d.symptoms_Signs, '\n', true),
      },
      { labelKey: 'diseaseSummary.medicalAdvice', value: this.format(d.medicaladvice, '\n', true) },
      { labelKey: 'diseaseSummary.riskFactors', value: this.format(d.riskfactors, '\n', true) },
      { labelKey: 'diseaseSummary.treatment', value: this.format(d.treatment, '\n', true) },
      { labelKey: 'diseaseSummary.selfCare', value: this.format(d.self_care, '\n', true) },
      {
        labelKey: 'diseaseSummary.investigations',
        value: this.format(d.investigations, '\n', true),
      },
    ];
  });

  /**
   * Format a `$`-delimited field: optionally drop a leading marker char, then
   * replace `$` with the given separator. Returns '' for absent values.
   */
  private format(raw: string | undefined, separator: string, dropLeading: boolean): string {
    if (!raw) {
      return '';
    }
    const body = dropLeading ? raw.substring(1) : raw;
    return body.replace(/\$/g, separator);
  }
}
