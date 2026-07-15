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

import { DatePipe } from '@angular/common';
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

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideSearch, lucideUpload } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';
import { ZardDialogService } from '@common-ui/ui/dialog';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SupervisorError } from '../../shared/supervisor-api';
import {
  SUP_SELECT_CLASS,
  SUP_TEXTAREA_CLASS,
  fromDateInputValue,
  toDateInputValue,
  toOffsetIsoString,
} from '../../shared/supervisor-ui';
import {
  AlternateEmailDialogComponent,
  AlternateEmailDialogData,
} from './alternate-email-dialog.component';
import { ChangeLogDialogComponent, ChangeLogDialogData } from './change-log-dialog.component';
import {
  Designation,
  EmailStatus,
  FeedbackNature,
  FeedbackRow,
  FeedbackStatus,
  FeedbackType,
  InstituteName,
  InstituteType,
  SaveFeedbackRequest,
  Severity,
} from './grievance.models';
import { SupervisorGrievanceService } from './grievance.service';

/** Allowed attachment extensions (legacy `valid_file_extensions`). */
const VALID_FILE_EXTENSIONS = ['msg', 'pdf', 'doc', 'docx', 'txt'];
/** Max attachment size in MB (legacy `maxFileSize`). */
const MAX_FILE_SIZE_MB = 5;

type GrievanceAction = 'view' | 'edit' | 'update';

/**
 * Supervisor grievance tracking (legacy `grievanceComponent`): search the
 * service's grievances by date range / type / id, forward a grievance to the
 * district authorities via email (edit), and record the response received
 * (update), with the request/response history and a change log per grievance.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-supervisor-grievance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    NgIcon,
    TranslatePipe,
    ZardButtonComponent,
    ZardInputDirective,
  ],
  viewProviders: [provideIcons({ lucidePencil, lucideSearch, lucideUpload })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        {{ 'supGrievance.title' | translate: lang() }}
      </h1>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      <!-- Search + list -->
      @if (action() === 'view') {
        <form
          [formGroup]="searchForm"
          (ngSubmit)="onSearch()"
          autocomplete="off"
          class="mb-4 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div>
            <label for="grv-start" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.startDate' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="grv-start" z-input class="w-full" type="date" [max]="today" formControlName="startDate" />
          </div>
          <div>
            <label for="grv-end" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.endDate' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="grv-end" z-input class="w-full" type="date" [max]="today" formControlName="endDate" />
            @if (dateRangeInvalid()) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supGrievance.endBeforeStart' | translate: lang() }}
              </p>
            }
          </div>
          <div>
            <label for="grv-type" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.grievanceType' | translate: lang() }}
            </label>
            <select id="grv-type" [class]="selectClass" formControlName="feedbackTypeID">
              <option [ngValue]="null">{{ 'supGrievance.all' | translate: lang() }}</option>
              @for (t of feedbackTypes(); track t.feedbackTypeID) {
                <option [ngValue]="t.feedbackTypeID">{{ t.feedbackTypeName }}</option>
              }
            </select>
          </div>
          <div>
            <label for="grv-id" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.grievanceId' | translate: lang() }}
            </label>
            <input id="grv-id" z-input class="w-full" maxlength="30" formControlName="requestID" />
          </div>
          <div>
            <button
              z-button
              type="submit"
              zType="default"
              [zDisabled]="searchForm.invalid || dateRangeInvalid() || loading()"
            >
              <ng-icon name="lucideSearch" size="16" aria-hidden="true" />
              {{ 'supGrievance.search' | translate: lang() }}
            </button>
          </div>
        </form>

        @if (loading()) {
          <p class="py-8 text-center text-sm text-muted-foreground">
            {{ 'supGrievance.loading' | translate: lang() }}
          </p>
        } @else {
          <div class="overflow-x-auto rounded-md border border-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supGrievance.grievanceId' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supGrievance.grievanceDate' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supGrievance.beneficiaryName' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supGrievance.grievanceType' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supGrievance.grievanceStatus' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supGrievance.emailStatus' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supGrievance.edit' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supGrievance.update' | translate: lang() }}
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (feedback of feedbackList(); track feedback.feedbackID) {
                  <tr class="border-t border-border align-top">
                    <td class="px-3 py-2">{{ feedback.requestID || '—' }}</td>
                    <td class="px-3 py-2">
                      {{
                        feedback.createdDate != null
                          ? (feedback.createdDate | date: 'dd/MM/yyyy' : 'UTC')
                          : '—'
                      }}
                    </td>
                    <td class="px-3 py-2">{{ beneficiaryName(feedback) }}</td>
                    <td class="px-3 py-2">{{ feedback.feedbackType?.feedbackTypeName || '—' }}</td>
                    <td class="px-3 py-2">{{ feedback.feedbackStatus?.feedbackStatus || '—' }}</td>
                    <td class="px-3 py-2">{{ feedback.emailStatus?.emailStatus || '—' }}</td>
                    <td class="px-3 py-2">
                      <button
                        z-button
                        type="button"
                        zType="ghost"
                        zSize="sm"
                        [attr.aria-label]="'supGrievance.edit' | translate: lang()"
                        (click)="openEdit(feedback)"
                      >
                        <ng-icon name="lucidePencil" size="16" aria-hidden="true" />
                      </button>
                    </td>
                    <td class="px-3 py-2">
                      @if (feedback.feedbackRequests && feedback.feedbackRequests.length > 0) {
                        <button
                          z-button
                          type="button"
                          zType="ghost"
                          zSize="sm"
                          [attr.aria-label]="'supGrievance.update' | translate: lang()"
                          (click)="openUpdate(feedback)"
                        >
                          <ng-icon name="lucideUpload" size="16" aria-hidden="true" />
                        </button>
                      } @else {
                        —
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" class="px-3 py-8 text-center text-muted-foreground">
                      {{ 'supGrievance.noRecords' | translate: lang() }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <!-- Edit (forward) / Update (record response) form -->
      @if (action() !== 'view') {
        <form [formGroup]="detailForm" autocomplete="off" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label for="grv-fid" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.grievanceId' | translate: lang() }}
            </label>
            <input id="grv-fid" z-input class="w-full" formControlName="feedbackID" readonly />
          </div>
          <div>
            <label for="grv-ben" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.beneficiaryName' | translate: lang() }}
            </label>
            <input id="grv-ben" z-input class="w-full" formControlName="beneficiaryName" readonly />
          </div>
          <div>
            <label for="grv-date" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.grievanceDate' | translate: lang() }}
            </label>
            <input id="grv-date" z-input class="w-full" formControlName="feedbackDate" readonly />
          </div>
          <div>
            <label for="grv-dtype" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.grievanceType' | translate: lang() }}
            </label>
            <select id="grv-dtype" [class]="selectClass" formControlName="feedbackTypeID" (change)="onTypeChange()">
              @for (t of feedbackTypes(); track t.feedbackTypeID) {
                <option [ngValue]="t.feedbackTypeID">{{ t.feedbackTypeName }}</option>
              }
            </select>
          </div>
          <div>
            <label for="grv-status-ro" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.grievanceStatus' | translate: lang() }}
            </label>
            <input id="grv-status-ro" z-input class="w-full" formControlName="feedbackStatus" readonly />
          </div>
          <div>
            <label for="grv-insttype" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.institutionType' | translate: lang() }}
            </label>
            <select id="grv-insttype" [class]="selectClass" formControlName="instituteTypeID" (change)="onInstituteTypeChange()">
              @for (t of instituteTypes(); track t.institutionTypeID) {
                <option [ngValue]="t.institutionTypeID">{{ t.institutionType }}</option>
              }
            </select>
          </div>
          <div>
            <label for="grv-emailstatus-ro" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.emailStatus' | translate: lang() }}
            </label>
            <input id="grv-emailstatus-ro" z-input class="w-full" formControlName="emailStatus" readonly />
          </div>
          <div>
            <label for="grv-instname" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.institutionName' | translate: lang() }}
            </label>
            <select id="grv-instname" [class]="selectClass" formControlName="instiName">
              @for (inst of instituteNames(); track inst.institutionName) {
                <option [ngValue]="inst.institutionName">{{ inst.institutionName }}</option>
              }
            </select>
          </div>
          <div>
            <label for="grv-designation" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.designation' | translate: lang() }}
            </label>
            <select id="grv-designation" [class]="selectClass" formControlName="designationID">
              @for (d of designations(); track d.designationID) {
                <option [ngValue]="d.designationID">{{ d.designationName }}</option>
              }
            </select>
          </div>
          <div>
            <label for="grv-severity" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.severity' | translate: lang() }}
            </label>
            <select id="grv-severity" [class]="selectClass" formControlName="severityID">
              @for (s of severities(); track s.severityID) {
                <option [ngValue]="s.severityID">{{ s.severityTypeName }}</option>
              }
            </select>
          </div>
          <div>
            <label for="grv-against" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.complaintAgainst' | translate: lang() }}
            </label>
            <input id="grv-against" z-input class="w-full" maxlength="25" formControlName="feedbackAgainst" />
          </div>
          <div>
            <label for="grv-nature" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.natureOfComplaint' | translate: lang() }}
            </label>
            <select id="grv-nature" [class]="selectClass" formControlName="feedbackNatureID">
              @for (n of natures(); track n.feedbackNatureID) {
                <option [ngValue]="n.feedbackNatureID">{{ n.feedbackNature }}</option>
              }
            </select>
          </div>
          <div>
            <label for="grv-createdby" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.createdBy' | translate: lang() }}
            </label>
            <input id="grv-createdby" z-input class="w-full" formControlName="createdBy" readonly />
          </div>
          <div>
            <label for="grv-modifiedby" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.modifiedBy' | translate: lang() }}
            </label>
            <input id="grv-modifiedby" z-input class="w-full" formControlName="modifiedBy" readonly />
          </div>

          <div class="sm:col-span-2 lg:col-span-3 grid gap-4 lg:grid-cols-2">
            <div>
              <label for="grv-summary" class="mb-1 block text-xs font-medium text-muted-foreground">
                {{ 'supGrievance.grievance' | translate: lang() }}
              </label>
              <textarea
                id="grv-summary"
                [class]="textareaClass"
                rows="3"
                maxlength="500"
                formControlName="feedbackSupSummary"
                [readOnly]="action() === 'update'"
              ></textarea>
              <p class="mt-1 text-right text-xs text-muted-foreground">{{ summaryLength() }}/500</p>
            </div>
            <div>
              <label for="grv-comments" class="mb-1 block text-xs font-medium text-muted-foreground">
                {{
                  (action() === 'edit'
                    ? 'supGrievance.commentsForEmail'
                    : 'supGrievance.responseReceived'
                  ) | translate: lang()
                }}
                <span class="text-destructive">*</span>
              </label>
              <textarea
                id="grv-comments"
                [class]="textareaClass"
                rows="3"
                maxlength="500"
                formControlName="comments"
              ></textarea>
              <p class="mt-1 text-right text-xs text-muted-foreground">{{ commentsLength() }}/500</p>
            </div>
          </div>

          <div>
            <label for="grv-statusid" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.grievanceStatus' | translate: lang() }}
            </label>
            <select id="grv-statusid" [class]="selectClass" formControlName="feedbackStatusID">
              @for (s of feedbackStatuses(); track s.feedbackStatusID) {
                <option [ngValue]="s.feedbackStatusID">{{ s.feedbackStatus }}</option>
              }
            </select>
          </div>
          <div>
            <label for="grv-emailstatusid" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supGrievance.emailStatus' | translate: lang() }}
            </label>
            <select id="grv-emailstatusid" [class]="selectClass" formControlName="emailStatusID">
              @for (s of emailStatuses(); track s.emailStatusID) {
                <option [ngValue]="s.emailStatusID">{{ s.emailStatus }}</option>
              }
            </select>
          </div>

          @if (action() === 'update') {
            <div>
              <label for="grv-file" class="mb-1 block text-xs font-medium text-muted-foreground">
                {{ 'supGrievance.uploadFile' | translate: lang() }}
                ({{ 'supGrievance.sizeLimit' | translate: lang() }}: {{ maxFileSize }}
                {{ 'supGrievance.mb' | translate: lang() }})
              </label>
              <input
                id="grv-file"
                type="file"
                class="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1 file:text-sm file:font-medium"
                (change)="onFileUpload($event)"
              />
              @if (invalidFileType()) {
                <p class="mt-1 text-xs font-medium text-destructive">
                  {{ 'supGrievance.supportedFormats' | translate: lang() }}
                </p>
              }
              @if (noFileChosen()) {
                <p class="mt-1 text-xs font-medium text-destructive">
                  {{ 'supGrievance.chooseFile' | translate: lang() }}
                </p>
              }
              @if (fileTooLarge()) {
                <p class="mt-1 text-xs font-medium text-destructive">
                  {{ 'supGrievance.fileTooLarge' | translate: lang() }} {{ maxFileSize }}
                  {{ 'supGrievance.mb' | translate: lang() }}
                </p>
              }
              @if (invalidFileName()) {
                <p class="mt-1 text-xs font-medium text-destructive">
                  {{ 'supGrievance.invalidFileName' | translate: lang() }}
                </p>
              }
            </div>
          }

          <div class="sm:col-span-2 lg:col-span-3 flex flex-wrap justify-end gap-2">
            @if (action() === 'edit') {
              <button z-button type="button" zType="outline" (click)="showLog()">
                {{ 'supGrievance.changeLog' | translate: lang() }}
              </button>
            }
            <button z-button type="button" zType="outline" (click)="back()">
              {{ 'supGrievance.back' | translate: lang() }}
            </button>
            <button
              z-button
              type="button"
              zType="default"
              [zLoading]="saving()"
              [zDisabled]="detailForm.invalid || fileInvalid() || saving()"
              (click)="onSubmit()"
            >
              {{
                (action() === 'edit' ? 'supGrievance.saveEmail' : 'supGrievance.saveUpdates')
                  | translate: lang()
              }}
            </button>
          </div>
        </form>

        <!-- Request / response history for the selected grievance -->
        @if (requests().length > 0) {
          <div class="mt-6">
            <h2 class="mb-2 text-sm font-semibold text-foreground">
              {{ 'supGrievance.requestResponse' | translate: lang() }}
            </h2>
            <div class="overflow-x-auto rounded-md border border-border">
              <table class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'supGrievance.log.sno' | translate: lang() }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'supGrievance.requestId' | translate: lang() }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'supGrievance.description' | translate: lang() }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'supGrievance.supervisorComments' | translate: lang() }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'supGrievance.responseReceived' | translate: lang() }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'supGrievance.responseAttachment' | translate: lang() }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'supGrievance.emailStatus' | translate: lang() }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'supGrievance.forwardedBy' | translate: lang() }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'supGrievance.forwardedDate' | translate: lang() }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'supGrievance.updatedBy' | translate: lang() }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'supGrievance.updatedDate' | translate: lang() }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (req of requests(); track $index) {
                    <tr class="border-t border-border align-top">
                      <td class="px-3 py-2">{{ $index + 1 }}</td>
                      <td class="px-3 py-2">{{ req.feedbackRequestID ?? '—' }}</td>
                      <td class="px-3 py-2">{{ req.feedbackSupSummary || '—' }}</td>
                      <td class="px-3 py-2">{{ req.comments || '—' }}</td>
                      <td class="px-3 py-2">{{ req.responseComments || '—' }}</td>
                      <td class="px-3 py-2">
                        @if (req.attachmentPath) {
                          <a
                            class="text-primary underline-offset-2 hover:underline"
                            [href]="req.attachmentPath"
                            target="_blank"
                            rel="noopener noreferrer"
                            >{{ req.kmFileManager?.fileName || req.attachmentPath }}</a
                          >
                        } @else {
                          —
                        }
                      </td>
                      <td class="px-3 py-2">{{ req.emailStatus?.emailStatus || '—' }}</td>
                      <td class="px-3 py-2">{{ req.createdBy || '—' }}</td>
                      <td class="px-3 py-2">
                        {{
                          req.createdDate != null
                            ? (req.createdDate | date: 'dd/MM/yyyy hh:mm' : 'UTC')
                            : '—'
                        }}
                      </td>
                      <td class="px-3 py-2">{{ req.responseUpdatedBy || '—' }}</td>
                      <td class="px-3 py-2">
                        {{
                          req.responseDate != null
                            ? (req.responseDate | date: 'dd/MM/yyyy hh:mm' : 'UTC')
                            : '—'
                        }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }
    </section>
  `,
})
export class SupervisorGrievanceComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SupervisorGrievanceService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly dialog = inject(ZardDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly selectClass = SUP_SELECT_CLASS;
  readonly textareaClass = SUP_TEXTAREA_CLASS;
  readonly maxFileSize = MAX_FILE_SIZE_MB;
  readonly today = toDateInputValue(new Date());

  readonly action = signal<GrievanceAction>('view');
  readonly feedbackList = signal<FeedbackRow[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly feedbackTypes = signal<FeedbackType[]>([]);
  readonly feedbackStatuses = signal<FeedbackStatus[]>([]);
  readonly emailStatuses = signal<EmailStatus[]>([]);
  readonly severities = signal<Severity[]>([]);
  readonly designations = signal<Designation[]>([]);
  readonly instituteTypes = signal<InstituteType[]>([]);
  readonly instituteNames = signal<InstituteName[]>([]);
  readonly natures = signal<FeedbackNature[]>([]);

  /** Requests/responses of the grievance being edited. */
  readonly requests = signal<NonNullable<FeedbackRow['feedbackRequests']>>([]);

  // Attachment validation flags (legacy error1/error2/invalid_file_flag/invalidFileNameFlag).
  readonly noFileChosen = signal(false);
  readonly fileTooLarge = signal(false);
  readonly invalidFileType = signal(false);
  readonly invalidFileName = signal(false);
  readonly fileInvalid = computed(
    () => this.fileTooLarge() || this.invalidFileType() || this.invalidFileName(),
  );

  /** Real numeric feedbackID of the row being edited (the form shows requestID). */
  private editingFeedbackID: number | null = null;
  /** District of the grievance's beneficiary, forwarded to the email dialog. */
  private editingDistrictID: number | null = null;

  private loadReqId = 0;
  private namesReqId = 0;
  private naturesReqId = 0;

  readonly searchForm = this.fb.group({
    startDate: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    endDate: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    feedbackTypeID: this.fb.control<number | null>(null),
    requestID: this.fb.control('', { nonNullable: true }),
  });

  readonly detailForm = this.fb.group({
    feedbackID: this.fb.control<string | null>(null),
    beneficiaryName: this.fb.control<string | null>(null),
    feedbackDate: this.fb.control<string | null>(null),
    feedbackTypeID: this.fb.control<number | null>(null),
    feedbackStatus: this.fb.control<string | null>(null),
    emailStatus: this.fb.control<string | null>(null),
    instituteTypeID: this.fb.control<number | null>(null),
    instiName: this.fb.control<string | null>(null),
    designationID: this.fb.control<number | null>(null),
    severityID: this.fb.control<number | null>(null),
    feedbackAgainst: this.fb.control<string | null>(null),
    feedbackNatureID: this.fb.control<number | null>(null),
    createdBy: this.fb.control<string | null>(null),
    modifiedBy: this.fb.control<string | null>(null),
    feedbackSupSummary: this.fb.control<string | null>(null),
    comments: this.fb.control<string | null>(null, [Validators.required]),
    feedbackStatusID: this.fb.control<number | null>(null),
    emailStatusID: this.fb.control<number | null>(null),
    feedbackRequestID: this.fb.control<number | undefined>(undefined),
  });

  readonly summaryLength = signal(0);
  readonly commentsLength = signal(0);
  readonly dateRangeInvalid = signal(false);

  ngOnInit(): void {
    // Default range: the last 7 days, matching the legacy screen.
    const start = new Date();
    start.setDate(start.getDate() - 7);
    this.searchForm.patchValue({
      startDate: toDateInputValue(start),
      endDate: this.today,
    });

    this.searchForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const { startDate, endDate } = this.searchForm.getRawValue();
      this.dateRangeInvalid.set(!!startDate && !!endDate && endDate < startDate);
    });

    this.detailForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.summaryLength.set(value.feedbackSupSummary?.length ?? 0);
      this.commentsLength.set(value.comments?.length ?? 0);
    });

    const psmID = this.serviceID();
    this.service
      .getFeedbackTypes(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => this.feedbackTypes.set(types),
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
    this.service
      .getFeedbackStatuses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => this.feedbackStatuses.set(s),
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
    this.service
      .getEmailStatuses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => this.emailStatuses.set(s),
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
    this.service
      .getSeverities(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => this.severities.set(s),
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
    this.service
      .getDesignations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => this.designations.set(d),
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
    this.service
      .getInstituteTypes(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (t) => this.instituteTypes.set(t),
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });

    this.onSearch();
  }

  /** Legacy `serviceID` — the selected role's providerServiceMapID. */
  private serviceID(): number | null {
    return this.authStore.currentRole()?.providerServiceMapID ?? null;
  }

  beneficiaryName(feedback: FeedbackRow): string {
    const first = feedback.beneficiary?.firstName ?? '';
    const last = feedback.beneficiary?.lastName ?? '';
    return `${first} ${last}`.trim() || '—';
  }

  onSearch(): void {
    if (this.searchForm.invalid || this.dateRangeInvalid()) {
      this.searchForm.markAllAsTouched();
      return;
    }
    const { startDate, endDate, feedbackTypeID, requestID } = this.searchForm.getRawValue();
    const start = fromDateInputValue(startDate);
    const end = fromDateInputValue(endDate);
    if (start) {
      start.setHours(0, 0, 0, 0);
    }
    if (end) {
      end.setHours(23, 59, 59, 0);
    }
    const reqId = ++this.loadReqId;
    this.loading.set(true);
    this.errorMessage.set('');
    this.service
      .getFeedbackList({
        serviceID: this.serviceID(),
        startDate: start ? toOffsetIsoString(start) : undefined,
        endDate: end ? toOffsetIsoString(end) : undefined,
        requestID: requestID.trim() || undefined,
        feedbackTypeID: feedbackTypeID ?? undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          if (reqId !== this.loadReqId) {
            return;
          }
          this.loading.set(false);
          this.feedbackList.set(rows);
        },
        error: (err: SupervisorError) => {
          if (reqId !== this.loadReqId) {
            return;
          }
          this.loading.set(false);
          this.feedbackList.set([]);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }

  openEdit(feedback: FeedbackRow): void {
    this.enterDetail(feedback, 'edit');
    this.detailForm.controls.modifiedBy.setValue(feedback.modifiedBy ?? null);
  }

  openUpdate(feedback: FeedbackRow): void {
    this.enterDetail(feedback, 'update');
    // Update mode shows who last recorded a response, and carries the latest
    // request id so the response lands against it.
    this.detailForm.controls.modifiedBy.setValue(
      feedback.consolidatedRequests?.[0]?.responseUpdatedBy ?? '',
    );
    const requests = feedback.feedbackRequests ?? [];
    this.detailForm.controls.feedbackRequestID.setValue(
      requests.length > 0 ? requests[requests.length - 1].feedbackRequestID : undefined,
    );
  }

  private enterDetail(feedback: FeedbackRow, action: GrievanceAction): void {
    this.detailForm.reset();
    this.resetFileFlags();
    this.action.set(action);
    this.errorMessage.set('');
    this.editingFeedbackID = feedback.feedbackID;
    this.editingDistrictID = feedback.beneficiary?.i_bendemographics?.districtID ?? null;
    this.requests.set(feedback.feedbackRequests ?? []);

    if (feedback.instituteType) {
      this.loadInstituteNames(feedback.instituteType.institutionTypeID);
    } else {
      this.instituteNames.set([]);
    }
    if (feedback.feedbackType) {
      this.loadNatures(feedback.feedbackType.feedbackTypeID);
    } else {
      this.natures.set([]);
    }

    this.detailForm.patchValue({
      // The form shows the display requestID; the real id is used on save.
      feedbackID: feedback.requestID ?? null,
      beneficiaryName: this.beneficiaryName(feedback),
      feedbackDate:
        feedback.createdDate != null
          ? new Date(feedback.createdDate).toLocaleDateString('en-in')
          : null,
      feedbackTypeID: feedback.feedbackType?.feedbackTypeID ?? null,
      feedbackStatus: feedback.feedbackStatus?.feedbackStatus ?? '',
      emailStatus: feedback.emailStatus?.emailStatus ?? null,
      feedbackStatusID: feedback.feedbackStatusID ?? null,
      emailStatusID: feedback.emailStatusID ?? null,
      instituteTypeID: feedback.instituteType?.institutionTypeID ?? null,
      instiName: feedback.instiName ?? null,
      designationID: feedback.designation?.designationID ?? null,
      severityID: feedback.severity?.severityID ?? null,
      feedbackAgainst: feedback.feedbackAgainst ?? '',
      feedbackNatureID: feedback.feedbackNatureDetail?.feedbackNatureID ?? null,
      createdBy: feedback.createdBy ?? null,
      feedbackSupSummary: feedback.feedback ?? null,
    });

    if (action === 'update') {
      this.detailForm.controls.emailStatusID.disable();
    } else {
      this.detailForm.controls.emailStatusID.enable();
    }
  }

  onTypeChange(): void {
    const typeID = this.detailForm.controls.feedbackTypeID.value;
    if (typeID != null) {
      this.detailForm.controls.feedbackNatureID.setValue(null);
      this.loadNatures(typeID);
    }
  }

  onInstituteTypeChange(): void {
    const typeID = this.detailForm.controls.instituteTypeID.value;
    if (typeID != null) {
      this.detailForm.controls.instiName.setValue(null);
      this.loadInstituteNames(typeID);
    }
  }

  private loadInstituteNames(institutionTypeID: number): void {
    const reqId = ++this.namesReqId;
    this.service
      .getInstituteNames(institutionTypeID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (names) => {
          if (reqId === this.namesReqId) {
            this.instituteNames.set(names);
          }
        },
        error: () => undefined,
      });
  }

  private loadNatures(feedbackTypeID: number): void {
    const reqId = ++this.naturesReqId;
    this.service
      .getNatureOfComplaints(this.serviceID(), feedbackTypeID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (natures) => {
          if (reqId === this.naturesReqId) {
            this.natures.set(natures);
          }
        },
        error: () => undefined,
      });
  }

  onSubmit(): void {
    if (this.detailForm.invalid || this.fileInvalid() || this.editingFeedbackID == null) {
      this.detailForm.markAllAsTouched();
      return;
    }
    const value = this.detailForm.getRawValue();
    // Legacy body: the whole form value with the display id swapped back to the
    // numeric feedbackID and the readonly status strings blanked.
    const body: SaveFeedbackRequest = {
      feedbackID: this.editingFeedbackID,
      feedbackSupSummary: value.feedbackSupSummary,
      beneficiaryName: value.beneficiaryName,
      comments: value.comments,
      createdBy: value.createdBy,
      createdDate: null,
      supUserID: null,
      feedbackDate: value.feedbackDate,
      feedbackTypeID: value.feedbackTypeID,
      feedbackStatus: undefined,
      emailStatus: undefined,
      instituteTypeID: value.instituteTypeID,
      instiName: value.instiName,
      designationID: value.designationID,
      severityID: value.severityID,
      feedbackAgainst: value.feedbackAgainst,
      feedbackNatureID: value.feedbackNatureID,
      modifiedBy: this.authStore.user()?.userName ?? null,
      updateResponse: null,
      emailStatusID: value.emailStatusID,
      feedbackStatusID: value.feedbackStatusID,
      feedbackRequestID: value.feedbackRequestID ?? undefined,
      serviceID: this.serviceID(),
    };

    this.saving.set(true);
    this.errorMessage.set('');

    if (this.action() === 'edit') {
      this.service
        .saveFeedbackRequest(body)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            // Refresh the list underneath, then offer the email dialog on top
            // (the legacy screen reloaded once the dialog closed; the end state
            // is identical and survives Escape/mask dismissal).
            this.openEmailDialog();
            this.back();
            this.onSearch();
          },
          error: (err: SupervisorError) => {
            this.saving.set(false);
            this.errorMessage.set(err.errorMessage);
          },
        });
    } else {
      this.service
        .updateResponse(body)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.saving.set(false);
            toast.success(this.i18n.instant('supGrievance.updated'));
            this.resetFileFlags();
            this.back();
            this.onSearch();
          },
          error: (err: SupervisorError) => {
            this.saving.set(false);
            this.errorMessage.set(err.errorMessage);
          },
        });
    }
  }

  private openEmailDialog(): void {
    const data: AlternateEmailDialogData = {
      feedbackID: this.editingFeedbackID as number,
      districtID: this.editingDistrictID,
    };
    this.dialog.create({
      zTitle: this.i18n.instant('supGrievance.email.title'),
      zContent: AlternateEmailDialogComponent,
      zData: data,
      zHideFooter: true,
      zWidth: '32rem',
      zMaskClosable: false,
    });
  }

  showLog(): void {
    if (this.editingFeedbackID == null) {
      return;
    }
    const data: ChangeLogDialogData = { feedbackID: this.editingFeedbackID };
    this.dialog.create({
      zTitle: this.i18n.instant('supGrievance.changeLog'),
      zContent: ChangeLogDialogComponent,
      zData: data,
      zHideFooter: true,
      zWidth: '48rem',
    });
  }

  back(): void {
    this.action.set('view');
    this.resetFileFlags();
  }

  /**
   * Attachment validation, ported from the legacy `readThis`/`checkExtension`.
   * The legacy screen validated the file but never transmitted it (email
   * attachment integration was left WIP), so only the flags are kept.
   */
  onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.resetFileFlags();
    const files = input.files;
    if (!files || files.length === 0) {
      this.noFileChosen.set(true);
      return;
    }
    const file = files[0];
    const parts = file.name.split('.');
    if (!parts[0]) {
      this.invalidFileName.set(true);
      return;
    }
    if (parts.length !== 2 || !VALID_FILE_EXTENSIONS.includes(parts[1].toLowerCase())) {
      this.invalidFileType.set(true);
      return;
    }
    if (file.size / 1000 / 1000 > MAX_FILE_SIZE_MB) {
      this.fileTooLarge.set(true);
    }
  }

  private resetFileFlags(): void {
    this.noFileChosen.set(false);
    this.fileTooLarge.set(false);
    this.invalidFileType.set(false);
    this.invalidFileName.set(false);
  }
}
