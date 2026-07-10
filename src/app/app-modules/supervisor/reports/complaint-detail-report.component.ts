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
import {
  ComplaintDetailRequest,
  FeedbackNatureOption,
  FeedbackTypeOption,
} from './reports.models';
import { rangeEndIso, rangeStartIso } from './reports.util';

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
  imports: [ReactiveFormsModule, TranslatePipe, ReportDateRangeComponent, ReportShellComponent],
  template: `
    <app-report-shell
      titleKey="supReports.complaint.title"
      [runner]="runner"
      [disabled]="form.invalid"
      (view)="view()"
      (export)="export()"
    >
      <form [formGroup]="form" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <app-report-date-range
          idPrefix="cd"
          [start]="form.controls.startDate"
          [end]="form.controls.endDate"
          [maxDate]="maxDate"
        />
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
    </app-report-shell>
  `,
})
export class ComplaintDetailReportComponent extends ReportFormBase implements OnInit {
  readonly form = this.fb.group({
    ...this.dateRangeControls(),
    feedbackType: this.fb.control<FeedbackTypeOption | null>(null),
    feedbackNatureID: this.fb.control<number | null>(null),
  });

  readonly feedbackTypes = signal<FeedbackTypeOption[]>([]);
  readonly feedbackNatures = signal<FeedbackNatureOption[]>([]);

  ngOnInit(): void {
    this.service
      .getFeedbackTypes(this.providerServiceMapID())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (types) => this.feedbackTypes.set(types), error: () => undefined });
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

  protected exportFileName(): string {
    return FILE_NAME;
  }

  protected request(): Observable<Blob> {
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
