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

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

import { ReportFormBase } from './report-form-base';
import { ReportDateRangeComponent } from './report-date-range.component';
import { ReportShellComponent } from './report-shell.component';
import { rangeEndIso, rangeStartIso } from './reports.util';

const FILE_NAME = 'Unblock_User_Report';

/**
 * Unblock-user report (legacy `SupervisorUnblockUserReportComponent`): just a
 * block-date range, POSTed to the common API's
 * `crmReports/getUnblockedUserReport` which streams the workbook.
 */
@Component({
  selector: 'app-unblock-user-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ReportDateRangeComponent, ReportShellComponent],
  template: `
    <app-report-shell
      titleKey="supReports.unblock.title"
      [runner]="runner"
      [disabled]="form.invalid"
      (view)="view()"
      (export)="export()"
    >
      <form [formGroup]="form" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <app-report-date-range
          idPrefix="ub"
          [start]="form.controls.startDate"
          [end]="form.controls.endDate"
          [maxDate]="maxDate"
        />
      </form>
    </app-report-shell>
  `,
})
export class UnblockUserReportComponent extends ReportFormBase {
  readonly form = this.fb.group(this.dateRangeControls());

  protected exportFileName(): string {
    return FILE_NAME;
  }

  /** Legacy body keys: `blockStartDate` / `blockEndDate`. */
  protected request(): Observable<Blob> {
    const value = this.form.getRawValue();
    return this.service.getUnblockedUserReport({
      blockStartDate: rangeStartIso(value.startDate),
      blockEndDate: rangeEndIso(value.endDate),
      providerServiceMapID: this.providerServiceMapID(),
      fileName: FILE_NAME,
    });
  }
}
