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

import { ZardButtonComponent } from '@common-ui/ui/button';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SUP_SELECT_CLASS } from '../shared/supervisor-ui';
import { ReportRunner } from './report-runner';
import { ReportResultsComponent } from './report-results.component';
import { ComplaintDetailRequest, FeedbackNatureOption, FeedbackTypeOption } from './reports.models';
import { SupervisorReportsService } from './reports.service';
import { clampEndDate, maxEndFor, rangeEndIso, rangeStartIso, todayInput } from './reports.util';

const FILE_NAME = 'Complaint_Details_Report';

/**
 * Complaint Detail report (legacy `SupervisorComplaintDetailReportComponent`):
 * a date range with optional feedback type / nature filters. The common API's
 * `crmReports/getComplaintDetailReport` takes an ARRAY body — one entry per
 * feedback type when none is chosen — and streams the workbook.
 */
@Component({
  selector: 'app-complaint-detail-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NgIcon,
    TranslatePipe,
    ZardButtonComponent,
    ReportResultsComponent,
  ],
  viewProviders: [provideIcons({ lucideDownload, lucideEye })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h3 class="mb-4 text-base font-semibold text-foreground">
        {{ 'supReports.complaint.title' | translate: lang() }}
      </h3>

      @if (runner.errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">
          {{ runner.errorMessage() }}
        </p>
      }

      <form [formGroup]="form" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label for="cd-start" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.startDate' | translate: lang() }}
          </label>
          <input
            id="cd-start"
            type="date"
            [class]="selectClass"
            formControlName="startDate"
            [max]="maxDate"
            (change)="onStartChange()"
          />
        </div>
        <div>
          <label for="cd-end" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.endDate' | translate: lang() }}
          </label>
          <input
            id="cd-end"
            type="date"
            [class]="selectClass"
            formControlName="endDate"
            [min]="form.controls.startDate.value"
            [max]="endMax()"
          />
        </div>
        <div>
          <label for="cd-fbtype" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.feedbackType' | translate: lang() }}
          </label>
          <select
            id="cd-fbtype"
            [class]="selectClass"
            formControlName="feedbackType"
            (change)="onFeedbackTypeChange()"
          >
            <option [ngValue]="null">{{ 'supReports.all' | translate: lang() }}</option>
            @for (type of feedbackTypes(); track type.feedbackTypeID) {
              <option [ngValue]="type">{{ type.feedbackTypeName }}</option>
            }
          </select>
        </div>
        <div>
          <label for="cd-fbnature" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.feedbackNature' | translate: lang() }}
          </label>
          <select id="cd-fbnature" [class]="selectClass" formControlName="feedbackNatureID">
            <option [ngValue]="null">
              {{ 'supReports.filter.select' | translate: lang() }}
            </option>
            @for (nature of feedbackNatures(); track $index) {
              <option [ngValue]="nature.m_feedbackNature?.[0]?.feedbackNatureID">
                {{ nature.m_feedbackNature?.[0]?.feedbackNature }}
              </option>
            }
          </select>
        </div>
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
export class ComplaintDetailReportComponent implements OnInit {
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
    feedbackType: this.fb.control<FeedbackTypeOption | null>(null),
    feedbackNatureID: this.fb.control<number | null>(null),
  });

  readonly endMax = signal(this.maxDate);
  readonly feedbackTypes = signal<FeedbackTypeOption[]>([]);
  readonly feedbackNatures = signal<FeedbackNatureOption[]>([]);

  private readonly providerServiceMapID = computed(
    () => this.authStore.currentRole()?.providerServiceMapID ?? null,
  );

  ngOnInit(): void {
    this.service
      .getFeedbackTypes(this.providerServiceMapID())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (types) => this.feedbackTypes.set(types), error: () => undefined });
  }

  onStartChange(): void {
    const { startDate, endDate } = this.form.getRawValue();
    this.endMax.set(maxEndFor(startDate, this.maxDate));
    const clamped = clampEndDate(startDate, endDate, this.maxDate);
    if (clamped) {
      this.form.patchValue({ endDate: clamped });
    }
  }

  onFeedbackTypeChange(): void {
    const type = this.form.controls.feedbackType.value;
    this.form.patchValue({ feedbackNatureID: null });
    this.feedbackNatures.set([]);
    if (type?.feedbackTypeID != null) {
      this.service
        .getFeedbackNatureTypes(this.providerServiceMapID(), type.feedbackTypeID)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (list) => this.feedbackNatures.set(list), error: () => undefined });
    }
  }

  view(): void {
    this.runner.view(this.request());
  }

  export(): void {
    this.runner.export(this.request(), FILE_NAME);
  }

  private request(): Observable<Blob> {
    const value = this.form.getRawValue();
    const start = rangeStartIso(value.startDate);
    const end = rangeEndIso(value.endDate);
    const psmID = this.providerServiceMapID();
    const selected = value.feedbackType;
    const types = selected ? [selected] : this.feedbackTypes();
    const requests: ComplaintDetailRequest[] = types.map((type) => ({
      startDate: start,
      endDate: end,
      providerServiceMapID: psmID,
      feedbackTypeID: type.feedbackTypeID ?? null,
      feedbackNatureID: selected ? value.feedbackNatureID : null,
      feedbackTypeName: type.feedbackTypeName ?? null,
      fileName: FILE_NAME,
    }));
    return this.service.getComplaintDetailReport(requests);
  }
}
