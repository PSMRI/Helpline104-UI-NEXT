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

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationKey } from '../../core/i18n/locales';
import { ReportFormBase } from './report-form-base';
import { ReportDateRangeComponent } from './report-date-range.component';
import { ReportShellComponent } from './report-shell.component';
import {
  AgentOption,
  CallTypeOption,
  RoleOption,
  WorkLocationOption,
} from './reports.models';
import { rangeEndIso, rangeStartIso } from './reports.util';

/** The legacy search criteria and the extra filter each one drives. */
interface SearchCriteria {
  readonly value: string;
  readonly labelKey: TranslationKey;
}

const SEARCH_CRITERIAS: readonly SearchCriteria[] = [
  { value: 'LocationWiseReport', labelKey: 'supReports.callQuality.criteria.location' },
  { value: 'callTypeWise', labelKey: 'supReports.callQuality.criteria.callType' },
  { value: 'AgentWiseReport', labelKey: 'supReports.callQuality.criteria.agent' },
  { value: 'SkillsetWiseReport', labelKey: 'supReports.callQuality.criteria.skillset' },
  { value: 'DateWiseReport', labelKey: 'supReports.callQuality.criteria.date' },
];

/**
 * Call Quality report (legacy `SupervisorCallQualityReportComponent`): a date
 * range plus a search criteria (location / call type / agent / skillset /
 * date wise) with one dependent filter, POSTed to the common API's
 * `crmReports/getCallQualityReport` which streams the workbook.
 */
@Component({
  selector: 'app-call-quality-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, ReportDateRangeComponent, ReportShellComponent],
  template: `
    <app-report-shell
      titleKey="supReports.callQuality.title"
      [runner]="runner"
      [disabled]="form.invalid"
      (view)="view()"
      (export)="export()"
    >
      <form [formGroup]="form" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <app-report-date-range
          idPrefix="cq"
          [start]="form.controls.startDate"
          [end]="form.controls.endDate"
          [maxDate]="maxDate"
        />
        <div>
          <label for="cq-criteria" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.searchCriteria' | translate: lang() }}
          </label>
          <select
            id="cq-criteria"
            [class]="selectClass"
            formControlName="searchCriteria"
            (change)="onCriteriaChange()"
          >
            <option [ngValue]="null" disabled>
              {{ 'supReports.filter.select' | translate: lang() }}
            </option>
            @for (criteria of searchCriterias; track criteria.value) {
              <option [ngValue]="criteria.value">
                {{ criteria.labelKey | translate: lang() }}
              </option>
            }
          </select>
        </div>

        @switch (criteria()) {
          @case ('callTypeWise') {
            <div>
              <label for="cq-calltype" class="mb-1 block text-xs font-medium text-muted-foreground">
                {{ 'supReports.filter.callType' | translate: lang() }}
              </label>
              <select id="cq-calltype" [class]="selectClass" formControlName="callTypeID">
                <option [ngValue]="null">
                  {{ 'supReports.filter.select' | translate: lang() }}
                </option>
                @for (callType of callTypes(); track callType.callTypeID) {
                  <option [ngValue]="callType.callTypeID">{{ callType.callType }}</option>
                }
              </select>
            </div>
          }
          @case ('AgentWiseReport') {
            <div>
              <label for="cq-agent" class="mb-1 block text-xs font-medium text-muted-foreground">
                {{ 'supReports.filter.agent' | translate: lang() }}
              </label>
              <select id="cq-agent" [class]="selectClass" formControlName="userID">
                <option [ngValue]="null">
                  {{ 'supReports.filter.select' | translate: lang() }}
                </option>
                @for (user of agents(); track user.agentID) {
                  <option [ngValue]="user.agentID">{{ user.agentID }}</option>
                }
              </select>
            </div>
          }
          @case ('LocationWiseReport') {
            <div>
              <label for="cq-office" class="mb-1 block text-xs font-medium text-muted-foreground">
                {{ 'supReports.filter.office' | translate: lang() }}
              </label>
              <select id="cq-office" [class]="selectClass" formControlName="workLocationID">
                <option [ngValue]="null">
                  {{ 'supReports.filter.select' | translate: lang() }}
                </option>
                @for (location of workLocations(); track location.pSAddMapID) {
                  <option [ngValue]="location.pSAddMapID">{{ location.locationName }}</option>
                }
              </select>
            </div>
          }
          @case ('SkillsetWiseReport') {
            <div>
              <label for="cq-role" class="mb-1 block text-xs font-medium text-muted-foreground">
                {{ 'supReports.filter.skillset' | translate: lang() }}
              </label>
              <select id="cq-role" [class]="selectClass" formControlName="roleID">
                <option [ngValue]="null">
                  {{ 'supReports.filter.select' | translate: lang() }}
                </option>
                @for (role of roles(); track role.roleID) {
                  <option [ngValue]="role.roleID">{{ role.roleName }}</option>
                }
              </select>
            </div>
          }
        }
      </form>
    </app-report-shell>
  `,
})
export class CallQualityReportComponent extends ReportFormBase {
  readonly searchCriterias = SEARCH_CRITERIAS;

  readonly form = this.fb.group({
    ...this.dateRangeControls(),
    searchCriteria: this.fb.control<string | null>(null, Validators.required),
    callTypeID: this.fb.control<number | null>(null),
    userID: this.fb.control<number | string | null>(null),
    workLocationID: this.fb.control<number | null>(null),
    roleID: this.fb.control<number | null>(null),
  });

  readonly criteria = signal<string | null>(null);

  readonly callTypes = signal<CallTypeOption[]>([]);
  readonly agents = signal<AgentOption[]>([]);
  readonly workLocations = signal<WorkLocationOption[]>([]);
  readonly roles = signal<RoleOption[]>([]);

  /** Load the lookup behind the chosen criteria and clear the other filters. */
  onCriteriaChange(): void {
    const criteria = this.form.controls.searchCriteria.value;
    this.criteria.set(criteria);
    this.form.patchValue({ callTypeID: null, userID: null, workLocationID: null, roleID: null });
    const psmID = this.providerServiceMapID();
    if (criteria === 'callTypeWise' && !this.callTypes().length) {
      this.service
        .getCallTypes(psmID)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (list) => this.callTypes.set(list), error: () => undefined });
    } else if (criteria === 'AgentWiseReport' && !this.agents().length) {
      this.service
        .getAgents(psmID)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (list) => this.agents.set(list), error: () => undefined });
    } else if (criteria === 'LocationWiseReport' && !this.workLocations().length) {
      this.service
        .getWorkLocations(psmID)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (list) => this.workLocations.set(list), error: () => undefined });
    } else if (criteria === 'SkillsetWiseReport' && !this.roles().length) {
      this.service
        .getRoles(psmID)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (list) => this.roles.set(list), error: () => undefined });
    }
  }

  protected exportFileName(): string {
    return this.form.controls.searchCriteria.value ?? 'CallQualityReport';
  }

  /** Legacy request: dates + criteria + the criteria's dependent filter. */
  protected request(): Observable<Blob> {
    const value = this.form.getRawValue();
    const body: Record<string, unknown> = {
      startDate: rangeStartIso(value.startDate),
      endDate: rangeEndIso(value.endDate),
      providerServiceMapID: this.providerServiceMapID(),
      searchCriteria: value.searchCriteria,
      fileName: value.searchCriteria,
    };
    if (value.searchCriteria === 'callTypeWise') {
      body['callTypeID'] = value.callTypeID;
    } else if (value.searchCriteria === 'AgentWiseReport') {
      body['userID'] = value.userID;
    } else if (value.searchCriteria === 'SkillsetWiseReport') {
      body['roleID'] = value.roleID;
    } else if (value.searchCriteria === 'LocationWiseReport') {
      body['workingLocationID'] = value.workLocationID;
    }
    return this.service.getCallQualityReport(body);
  }
}
