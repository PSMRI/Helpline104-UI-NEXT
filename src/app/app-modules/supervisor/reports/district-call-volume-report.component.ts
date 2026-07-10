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

import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ReportFormBase } from './report-form-base';
import { ReportDateRangeComponent } from './report-date-range.component';
import { ReportShellComponent } from './report-shell.component';
import { DistrictOption } from './reports.models';
import { rangeEndIso, rangeStartIso, stateIDForRole, yesterdayInput } from './reports.util';

const FILE_NAME = 'District_Wise_Call_Volume_Report';

/**
 * District-wise call volume report (legacy
 * `SupervisorDistrictWiseCallVolumeReportComponent`): a date range capped at
 * YESTERDAY (the volumes are aggregated nightly) with an optional district
 * filter, POSTed to the common API's `crmReports/getDistrictWiseCallReport`
 * which streams the workbook.
 */
@Component({
  selector: 'app-district-call-volume-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, ReportDateRangeComponent, ReportShellComponent],
  template: `
    <app-report-shell
      titleKey="supReports.district.title"
      [runner]="runner"
      [disabled]="form.invalid"
      (view)="view()"
      (export)="export()"
    >
      <form [formGroup]="form" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <app-report-date-range
          idPrefix="dv"
          [start]="form.controls.startDate"
          [end]="form.controls.endDate"
          [maxDate]="maxDate"
        />
        <div>
          <label for="dv-district" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.district' | translate: lang() }}
          </label>
          <select id="dv-district" [class]="selectClass" formControlName="district">
            <option [ngValue]="null">{{ 'supReports.all' | translate: lang() }}</option>
            @for (district of districts(); track district.districtID) {
              <option [ngValue]="district">{{ district.districtName }}</option>
            }
          </select>
        </div>
      </form>
    </app-report-shell>
  `,
})
export class DistrictCallVolumeReportComponent extends ReportFormBase implements OnInit {
  readonly form = this.fb.group({
    ...this.dateRangeControls(),
    district: this.fb.control<DistrictOption | null>(null),
  });

  readonly districts = signal<DistrictOption[]>([]);

  /** Aggregation runs nightly, so the report is available up to yesterday. */
  override readonly maxDate: string = yesterdayInput();

  ngOnInit(): void {
    const stateID = stateIDForRole(this.authStore.privileges(), this.authStore.currentRole());
    if (stateID != null) {
      this.service
        .getDistricts(stateID)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (list) => this.districts.set(list), error: () => undefined });
    }
  }

  protected exportFileName(): string {
    return FILE_NAME;
  }

  protected request(): Observable<Blob> {
    const value = this.form.getRawValue();
    return this.service.getDistrictWiseCallReport({
      startDate: rangeStartIso(value.startDate),
      endDate: rangeEndIso(value.endDate),
      providerServiceMapID: this.providerServiceMapID(),
      districtID: value.district?.districtID ?? null,
      district: value.district?.districtName ?? null,
      fileName: FILE_NAME,
    });
  }
}
