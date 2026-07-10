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

import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SUP_SELECT_CLASS } from '../shared/supervisor-ui';
import { clampEndDate, maxEndFor, todayInput } from './reports.util';

/**
 * The start/end date pair every supervisor report begins with, including the
 * legacy clamping: the end date may trail the start by at most 30 days and
 * never pass the report's cap (`maxDate`). The host uses `display: contents`
 * so both fields sit directly in the report form's grid.
 */
@Component({
  selector: 'app-report-date-range',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe],
  host: { class: 'contents' },
  template: `
    <div>
      <label [for]="idPrefix() + '-start'" class="mb-1 block text-xs font-medium text-muted-foreground">
        {{ 'supReports.startDate' | translate: lang() }}
      </label>
      <input
        [id]="idPrefix() + '-start'"
        type="date"
        [class]="selectClass"
        [formControl]="start()"
        [max]="maxDate()"
        (change)="onStartChange()"
      />
    </div>
    <div>
      <label [for]="idPrefix() + '-end'" class="mb-1 block text-xs font-medium text-muted-foreground">
        {{ 'supReports.endDate' | translate: lang() }}
      </label>
      <input
        [id]="idPrefix() + '-end'"
        type="date"
        [class]="selectClass"
        [formControl]="end()"
        [min]="start().value"
        [max]="endMax() ?? maxDate()"
      />
    </div>
  `,
})
export class ReportDateRangeComponent {
  private readonly i18n = inject(I18nService);
  readonly lang = this.i18n.language;
  readonly selectClass = SUP_SELECT_CLASS;

  /** Unique per screen so the input ids/labels stay unique in the DOM. */
  readonly idPrefix = input.required<string>();
  readonly start = input.required<FormControl<string>>();
  readonly end = input.required<FormControl<string>>();
  /** Latest selectable date; defaults to today (district report: yesterday). */
  readonly maxDate = input(todayInput());

  /** Cap on the end date once a start is chosen (start + 30, at most maxDate). */
  readonly endMax = signal<string | null>(null);

  onStartChange(): void {
    const startDate = this.start().value;
    const endDate = this.end().value;
    this.endMax.set(maxEndFor(startDate, this.maxDate()));
    const clamped = clampEndDate(startDate, endDate, this.maxDate());
    if (clamped) {
      this.end().setValue(clamped);
    }
  }
}
