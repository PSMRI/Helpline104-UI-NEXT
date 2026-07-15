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

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideEye } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SUP_SELECT_CLASS } from '../shared/supervisor-ui';
import { ReportRunner } from './report-runner';
import { ReportResultsComponent } from './report-results.component';
import { QaReportType, RoleOption } from './reports.models';
import { SupervisorReportsService } from './reports.service';
import { clampEndDate, maxEndFor, rangeEndIso, rangeStartIso, todayInput } from './reports.util';

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
    NgIcon,
    TranslatePipe,
    ZardButtonComponent,
    ZardInputDirective,
    ReportResultsComponent,
  ],
  viewProviders: [provideIcons({ lucideDownload, lucideEye })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h3 class="mb-4 text-base font-semibold text-foreground">
        {{ 'supReports.qa.title' | translate: lang() }}
      </h3>

      @if (runner.errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">
          {{ runner.errorMessage() }}
        </p>
      }

      <form [formGroup]="form" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label for="qa-start" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.startDate' | translate: lang() }}
          </label>
          <input
            id="qa-start"
            type="date"
            [class]="selectClass"
            formControlName="startDate"
            [max]="maxDate"
            (change)="onStartChange()"
          />
        </div>
        <div>
          <label for="qa-end" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.endDate' | translate: lang() }}
          </label>
          <input
            id="qa-end"
            type="date"
            [class]="selectClass"
            formControlName="endDate"
            [min]="form.controls.startDate.value"
            [max]="endMax()"
          />
        </div>
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

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button
          z-button
          type="button"
          [zLoading]="runner.loading()"
          [zDisabled]="form.invalid"
          (click)="view()"
        >
          <ng-icon name="lucideEye" size="16" aria-hidden="true" />
          {{ 'supReports.view' | translate: lang() }}
        </button>
        <button
          z-button
          type="button"
          zType="outline"
          [zLoading]="runner.exporting()"
          [zDisabled]="form.invalid"
          (click)="export()"
        >
          <ng-icon name="lucideDownload" size="16" aria-hidden="true" />
          {{ 'supReports.export' | translate: lang() }}
        </button>
      </div>

      <app-report-results [runner]="runner" />
    </section>
  `,
})
export class QaReportComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SupervisorReportsService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly selectClass = SUP_SELECT_CLASS;
  readonly maxDate = todayInput();
  readonly runner = new ReportRunner(this.i18n, this.destroyRef);

  readonly form = this.fb.group({
    startDate: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    report: this.fb.control<QaReportType | null>(null, Validators.required),
    roleName: this.fb.control<string | null>(null),
    agentID: this.fb.control<string>('', { nonNullable: true }),
  });

  readonly endMax = signal(this.maxDate);
  readonly reportTypes = signal<QaReportType[]>([]);
  readonly roles = signal<RoleOption[]>([]);
  readonly showAgentFilters = signal(false);

  private readonly providerServiceMapID = computed(
    () => this.authStore.currentRole()?.providerServiceMapID ?? null,
  );

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

  onStartChange(): void {
    const { startDate, endDate } = this.form.getRawValue();
    this.endMax.set(maxEndFor(startDate, this.maxDate));
    const clamped = clampEndDate(startDate, endDate, this.maxDate);
    if (clamped) {
      this.form.patchValue({ endDate: clamped });
    }
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

  view(): void {
    this.runner.view(this.request());
  }

  export(): void {
    const report = this.form.controls.report.value;
    const fileName = (report?.ReportType ?? 'QA_Report').replace(/ /g, '_');
    this.runner.export(this.request(), fileName);
  }

  private request(): Observable<Blob> {
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
      fileName: (report?.ReportType ?? 'QA_Report').replace(/ /g, '_'),
    });
  }
}
