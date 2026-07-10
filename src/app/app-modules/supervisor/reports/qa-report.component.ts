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
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { toast } from 'ngx-sonner';

import { ZardInputDirective } from '@common-ui/ui/input';

import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ReportFormBase } from './report-form-base';
import { ReportDateRangeComponent } from './report-date-range.component';
import { ReportShellComponent } from './report-shell.component';
import { QaReportType, RoleOption } from './reports.models';
import { rangeEndIso, rangeStartIso } from './reports.util';

/** Report type id that unlocks the skillset/agent filters (legacy `show`). */
const CALL_ANALYSIS_REPORT_TYPE_ID = 8;

/**
 * QA (quality audit) report (legacy `SupervisorQualityReportComponent`): a
 * date range plus a QA report type from `crmReports/getReportTypes`; the
 * "Call Analysis" type additionally filters by skillset and agent id. POSTs to
 * the common API's `crmReports/getQualityReport` which streams the workbook.
 */
@Component({
  selector: 'app-qa-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ZardInputDirective,
    ReportDateRangeComponent,
    ReportShellComponent,
  ],
  template: `
    <app-report-shell
      titleKey="supReports.qa.title"
      [runner]="runner"
      [disabled]="form.invalid"
      (view)="view()"
      (export)="export()"
    >
      <form [formGroup]="form" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <app-report-date-range
          idPrefix="qa"
          [start]="form.controls.startDate"
          [end]="form.controls.endDate"
          [maxDate]="maxDate"
        />
        <div>
          <label for="qa-report" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.reportType' | translate: lang() }}
          </label>
          <select
            id="qa-report"
            [class]="selectClass"
            formControlName="report"
            (change)="onReportTypeChange()"
          >
            <option [ngValue]="null" disabled>
              {{ 'supReports.filter.select' | translate: lang() }}
            </option>
            @for (type of reportTypes(); track type.QAreportTypeID) {
              <option [ngValue]="type">{{ type.ReportType }}</option>
            }
          </select>
        </div>

        @if (showAgentFilters()) {
          <div>
            <label for="qa-role" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supReports.filter.skillset' | translate: lang() }}
            </label>
            <select id="qa-role" [class]="selectClass" formControlName="roleName">
              <option [ngValue]="null">
                {{ 'supReports.filter.select' | translate: lang() }}
              </option>
              @for (role of roles(); track role.roleID) {
                <option [ngValue]="role.roleName">{{ role.roleName }}</option>
              }
            </select>
          </div>
          <div>
            <label for="qa-agent" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supReports.filter.agentId' | translate: lang() }}
            </label>
            <input
              id="qa-agent"
              z-input
              formControlName="agentID"
              [placeholder]="'supReports.filter.agentId' | translate: lang()"
            />
          </div>
        }
      </form>
    </app-report-shell>
  `,
})
export class QaReportComponent extends ReportFormBase implements OnInit {
  readonly form = this.fb.group({
    ...this.dateRangeControls(),
    report: this.fb.control<QaReportType | null>(null, Validators.required),
    roleName: this.fb.control<string | null>(null),
    agentID: this.fb.control<string>('', { nonNullable: true }),
  });

  readonly reportTypes = signal<QaReportType[]>([]);
  readonly roles = signal<RoleOption[]>([]);
  readonly showAgentFilters = signal(false);

  ngOnInit(): void {
    const psmID = this.providerServiceMapID();
    this.service
      .getQaReportTypes(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => this.reportTypes.set(types),
        // Surface the failure instead of leaving the report-type selector
        // silently empty with no explanation.
        error: () => this.notifyLookupError(),
      });
    this.service
      .getRoles(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => this.roles.set(roles),
        error: () => this.notifyLookupError(),
      });
  }

  /** Tell the agent a filter-options lookup failed (both lookups share this). */
  private notifyLookupError(): void {
    toast.error(this.i18n.instant('supReports.lookupError'));
  }

  /** Only "Call Analysis Report" (type 8) takes skillset/agent filters. */
  onReportTypeChange(): void {
    const report = this.form.controls.report.value;
    const show = report?.QAreportTypeID === CALL_ANALYSIS_REPORT_TYPE_ID;
    this.showAgentFilters.set(show);
    if (!show) {
      this.form.patchValue({ roleName: null, agentID: '' });
    }
  }

  protected exportFileName(): string {
    const report = this.form.controls.report.value;
    return (report?.ReportType ?? 'QA_Report').replace(/ /g, '_');
  }

  protected request(): Observable<Blob> {
    const value = this.form.getRawValue();
    const report = value.report;
    return this.service.getQualityReport({
      startDate: rangeStartIso(value.startDate),
      endDate: rangeEndIso(value.endDate),
      providerServiceMapID: this.providerServiceMapID(),
      agentID: value.agentID ? value.agentID : null,
      roleName: value.roleName,
      reportTypeID: report?.QAreportTypeID,
      reportType: report?.ReportType,
      fileName: this.exportFileName(),
    });
  }
}
