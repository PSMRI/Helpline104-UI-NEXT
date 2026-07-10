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

import { DestroyRef, computed, inject } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { SUP_SELECT_CLASS } from '../shared/supervisor-ui';
import { ReportRunner } from './report-runner';
import { SupervisorReportsService } from './reports.service';
import { todayInput } from './reports.util';

/** The required start/end controls every report's date range shares. */
export interface ReportDateRangeControls {
  startDate: FormControl<string>;
  endDate: FormControl<string>;
}

/**
 * Everything the supervisor report screens have in common: the injected
 * services, the {@link ReportRunner}, the required date-range controls and the
 * view/export actions. A concrete report contributes only its own filters
 * (form controls + lookups) and the request body via {@link request} /
 * {@link exportFileName}; the shared shell and date-range components render
 * everything except those filters.
 */
export abstract class ReportFormBase {
  protected readonly fb = inject(FormBuilder);
  protected readonly service = inject(SupervisorReportsService);
  protected readonly authStore = inject(AuthStore);
  protected readonly i18n = inject(I18nService);
  protected readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly selectClass = SUP_SELECT_CLASS;
  readonly runner = new ReportRunner(this.i18n, this.destroyRef);

  /**
   * Latest selectable date. Override in reports whose data lags (the
   * district-wise report caps at yesterday). A field rather than a constructor
   * parameter: an inherited parameterized constructor trips NG2006 on the
   * undecorated base, and nothing reads this during construction.
   */
  readonly maxDate: string = todayInput();

  protected readonly providerServiceMapID = computed(
    () => this.authStore.currentRole()?.providerServiceMapID ?? null,
  );

  /** Start/end controls to spread into the concrete report's form group. */
  protected dateRangeControls(): ReportDateRangeControls {
    return {
      startDate: this.fb.control<string>('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      endDate: this.fb.control<string>('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    };
  }

  view(): void {
    const request$ = this.request();
    if (request$) {
      this.runner.view(request$);
    }
  }

  export(): void {
    const request$ = this.request();
    if (request$) {
      this.runner.export(request$, this.exportFileName());
    }
  }

  /** The report request for the current filters (`null` when not runnable). */
  protected abstract request(): Observable<Blob> | null;

  /** Workbook file name for the export action (current filters may drive it). */
  protected abstract exportFileName(): string;
}
