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

import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideEye } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationKey } from '../../core/i18n/locales';
import { SupervisorError } from '../shared/supervisor-api';
import { SUP_SELECT_CLASS } from '../shared/supervisor-ui';
import { ReportRunner } from './report-runner';
import { ReportResultsComponent } from './report-results.component';
import { AgentOption, CallTypeOption, RoleOption, WorkLocationOption } from './reports.models';
import { SupervisorReportsService } from './reports.service';
import { clampEndDate, maxEndFor, rangeEndIso, rangeStartIso, todayInput } from './reports.util';

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
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ReportResultsComponent],
  viewProviders: [provideIcons({ lucideDownload, lucideEye })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h3 class="mb-4 text-base font-semibold text-foreground">
        {{ 'supReports.callQuality.title' | translate: lang() }}
      </h3>

      @if (runner.serverError()) {
        <div
          class="mb-3 flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          role="alert"
        >
          <span>{{ runner.errorMessage() }}</span>
          <button z-button type="button" zType="ghost" zSize="sm" (click)="runner.dismissError()">
            {{ 'supReports.dismiss' | translate: lang() }}
          </button>
        </div>
      } @else if (runner.errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">
          {{ runner.errorMessage() }}
        </p>
      }

      <form [formGroup]="form" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label for="cq-start" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.startDate' | translate: lang() }}
          </label>
          <input
            id="cq-start"
            type="date"
            [class]="selectClass"
            formControlName="startDate"
            [max]="maxDate"
            (change)="onStartChange()"
          />
        </div>
        <div>
          <label for="cq-end" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.endDate' | translate: lang() }}
          </label>
          <input
            id="cq-end"
            type="date"
            [class]="selectClass"
            formControlName="endDate"
            [min]="form.controls.startDate.value"
            [max]="endMax()"
          />
        </div>
        <div>
          <label for="cq-criteria" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.searchCriteria' | translate: lang() }}
          </label>
          <select id="cq-criteria" [class]="selectClass" formControlName="searchCriteria" (change)="onCriteriaChange()">
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

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button z-button type="button" [zLoading]="runner.loading()" [zDisabled]="form.invalid" (click)="view()">
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
export class CallQualityReportComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SupervisorReportsService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly selectClass = SUP_SELECT_CLASS;
  readonly maxDate = todayInput();
  readonly searchCriterias = SEARCH_CRITERIAS;
  readonly runner = new ReportRunner(this.i18n, this.destroyRef);

  readonly form = this.fb.group({
    startDate: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    searchCriteria: this.fb.control<string | null>(null, Validators.required),
    callTypeID: this.fb.control<number | null>(null),
    userID: this.fb.control<number | string | null>(null),
    workLocationID: this.fb.control<number | null>(null),
    roleID: this.fb.control<number | null>(null),
  });

  readonly criteria = signal<string | null>(null);
  readonly endMax = signal(this.maxDate);

  readonly callTypes = signal<CallTypeOption[]>([]);
  readonly agents = signal<AgentOption[]>([]);
  readonly workLocations = signal<WorkLocationOption[]>([]);
  readonly roles = signal<RoleOption[]>([]);

  private readonly providerServiceMapID = computed(() => this.authStore.currentRole()?.providerServiceMapID ?? null);

  onStartChange(): void {
    const { startDate, endDate } = this.form.getRawValue();
    this.endMax.set(maxEndFor(startDate, this.maxDate));
    const clamped = clampEndDate(startDate, endDate, this.maxDate);
    if (clamped) {
      this.form.patchValue({ endDate: clamped });
    }
  }

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
        .subscribe({
          next: (list) => this.callTypes.set(list),
          error: (err: SupervisorError) => this.runner.setError(err),
        });
    } else if (criteria === 'AgentWiseReport' && !this.agents().length) {
      this.service
        .getAgents(psmID)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (list) => this.agents.set(list),
          error: (err: SupervisorError) => this.runner.setError(err),
        });
    } else if (criteria === 'LocationWiseReport' && !this.workLocations().length) {
      this.service
        .getWorkLocations(psmID)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (list) => this.workLocations.set(list),
          error: (err: SupervisorError) => this.runner.setError(err),
        });
    } else if (criteria === 'SkillsetWiseReport' && !this.roles().length) {
      this.service
        .getRoles(psmID)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (list) => this.roles.set(list),
          error: (err: SupervisorError) => this.runner.setError(err),
        });
    }
  }

  view(): void {
    this.runner.view(this.request());
  }

  export(): void {
    const criteria = this.form.controls.searchCriteria.value ?? 'CallQualityReport';
    this.runner.export(this.request(), criteria);
  }

  /** Legacy request: dates + criteria + the criteria's dependent filter. */
  private request(): Observable<Blob> {
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
