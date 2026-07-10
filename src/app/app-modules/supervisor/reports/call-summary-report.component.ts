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

import { ZardInputDirective } from '@common-ui/ui/input';

import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ReportFormBase } from './report-form-base';
import { ReportDateRangeComponent } from './report-date-range.component';
import { ReportShellComponent } from './report-shell.component';
import { CallTypeGroup, CallTypeOption, RoleOption } from './reports.models';
import { rangeEndIso, rangeStartIso } from './reports.util';

const FILE_NAME = 'Call_Summary_Report';

/**
 * Call Summary report (legacy `SupervisorCallSummaryReportComponent`): a date
 * range with optional skillset, agent id and call type/sub-type filters,
 * POSTed to the common API's `crmReports/getCallSummaryReport` which streams
 * the workbook.
 */
@Component({
  selector: 'app-call-summary-report',
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
      titleKey="supReports.callSummary.title"
      [runner]="runner"
      [disabled]="form.invalid"
      (view)="view()"
      (export)="export()"
    >
      <form [formGroup]="form" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <app-report-date-range
          idPrefix="cs"
          [start]="form.controls.startDate"
          [end]="form.controls.endDate"
          [maxDate]="maxDate"
        />
        <div>
          <label for="cs-role" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.skillset' | translate: lang() }}
          </label>
          <select id="cs-role" [class]="selectClass" formControlName="roleName">
            <option [ngValue]="null">
              {{ 'supReports.filter.select' | translate: lang() }}
            </option>
            @for (role of roles(); track role.roleID) {
              <option [ngValue]="role.roleName">{{ role.roleName }}</option>
            }
          </select>
        </div>
        <div>
          <label for="cs-agent" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.agentId' | translate: lang() }}
          </label>
          <input
            id="cs-agent"
            z-input
            formControlName="agentID"
            [placeholder]="'supReports.filter.agentId' | translate: lang()"
          />
        </div>
        <div>
          <label for="cs-calltype" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.callType' | translate: lang() }}
          </label>
          <select
            id="cs-calltype"
            [class]="selectClass"
            formControlName="callType"
            (change)="onCallTypeChange()"
          >
            <option [ngValue]="null">
              {{ 'supReports.filter.select' | translate: lang() }}
            </option>
            @for (group of callTypeGroups(); track group.callGroupType) {
              <option [ngValue]="group">{{ group.callGroupType }}</option>
            }
          </select>
        </div>
        <div>
          <label for="cs-subtype" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.callSubType' | translate: lang() }}
          </label>
          <select id="cs-subtype" [class]="selectClass" formControlName="subCallType">
            <option [ngValue]="null">
              {{ 'supReports.filter.select' | translate: lang() }}
            </option>
            @for (sub of callSubTypes(); track sub.callTypeID) {
              <option [ngValue]="sub">{{ sub.callType }}</option>
            }
          </select>
        </div>
      </form>
    </app-report-shell>
  `,
})
export class CallSummaryReportComponent extends ReportFormBase implements OnInit {
  readonly form = this.fb.group({
    ...this.dateRangeControls(),
    roleName: this.fb.control<string | null>(null),
    agentID: this.fb.control<string>('', { nonNullable: true }),
    callType: this.fb.control<CallTypeGroup | null>(null),
    subCallType: this.fb.control<CallTypeOption | null>(null),
  });

  readonly roles = signal<RoleOption[]>([]);
  readonly callTypeGroups = signal<CallTypeGroup[]>([]);
  readonly callSubTypes = signal<CallTypeOption[]>([]);

  ngOnInit(): void {
    const psmID = this.providerServiceMapID();
    this.service
      .getRoles(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (roles) => this.roles.set(roles), error: () => undefined });
    this.service
      .getCallTypeGroups(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (groups) => this.callTypeGroups.set(groups), error: () => undefined });
  }

  /** Repopulate the sub-type options from the chosen group (legacy). */
  onCallTypeChange(): void {
    const group = this.form.controls.callType.value;
    this.form.patchValue({ subCallType: null });
    this.callSubTypes.set(group?.callTypes ?? []);
  }

  protected exportFileName(): string {
    return FILE_NAME;
  }

  protected request(): Observable<Blob> {
    const value = this.form.getRawValue();
    return this.service.getCallSummaryReport({
      startDate: rangeStartIso(value.startDate),
      endDate: rangeEndIso(value.endDate),
      providerServiceMapID: this.providerServiceMapID(),
      agentID: value.agentID ? value.agentID : null,
      roleName: value.roleName,
      callTypeName: value.callType?.callGroupType ?? null,
      callTypeID: value.subCallType?.callTypeID ?? null,
      fileName: FILE_NAME,
    });
  }
}
