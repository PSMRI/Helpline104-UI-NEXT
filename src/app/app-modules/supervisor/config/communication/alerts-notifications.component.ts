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
  WritableSignal,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideSearch } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

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
  NotificationCreateRequest,
  NotificationRow,
  NotificationType,
  OfficeLocation,
  ProviderRole,
} from './notification.models';
import { SupervisorNotificationService } from './notification.service';

type ViewMode = 'search' | 'create' | 'edit';

/**
 * Supervisor alerts & notifications (legacy
 * `SupervisorAlertsNotificationsComponent`): search Alert / Notification
 * messages for the service by validity window, create one targeted at a role
 * and optionally specific offices (with optional start/end times), and edit an
 * existing message.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-alerts-notifications',
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
  viewProviders: [provideIcons({ lucidePencil, lucideSearch })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        @if (mode() === 'edit') {
          {{ 'supComm.edit' | translate: lang() }} {{ editTypeName() }}
        } @else {
          {{ 'supComm.alertsNotifications' | translate: lang() }}
        }
      </h1>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      <!-- Search + list -->
      @if (mode() === 'search') {
        <form
          [formGroup]="searchForm"
          (ngSubmit)="search()"
          autocomplete="off"
          class="mb-4 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label for="an-type" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.communicationType' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <select id="an-type" [class]="selectClass" formControlName="notificationTypeID">
              <option [ngValue]="null" disabled>
                {{ 'supComm.select' | translate: lang() }}
              </option>
              @for (t of types(); track t.notificationTypeID) {
                <option [ngValue]="t.notificationTypeID">{{ t.notificationType }}</option>
              }
            </select>
          </div>
          <div>
            <label for="an-start" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.validFrom' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="an-start" z-input class="w-full" type="date" formControlName="startDate" />
          </div>
          <div>
            <label for="an-end" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.validTill' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="an-end" z-input class="w-full" type="date" formControlName="endDate" />
            @if (searchRangeInvalid()) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supComm.endBeforeStart' | translate: lang() }}
              </p>
            }
          </div>
          <div>
            <button
              z-button
              type="submit"
              zType="default"
              [zDisabled]="searchForm.invalid || searchRangeInvalid() || loading()"
            >
              <ng-icon name="lucideSearch" size="16" aria-hidden="true" />
              {{ 'supComm.search' | translate: lang() }}
            </button>
          </div>
        </form>

        @if (loading()) {
          <p class="py-8 text-center text-sm text-muted-foreground">
            {{ 'supComm.loading' | translate: lang() }}
          </p>
        } @else {
          <div class="overflow-x-auto rounded-md border border-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supComm.sno' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supComm.type' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supComm.role' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supComm.offices' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supComm.subject' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supComm.description' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supComm.validFrom' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supComm.validTill' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supComm.actions' | translate: lang() }}
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (row of notifications(); track row.notificationID) {
                  <tr class="border-t border-border align-top">
                    <td class="px-3 py-2">{{ $index + 1 }}</td>
                    <td class="px-3 py-2">{{ row.notificationType?.notificationType || '—' }}</td>
                    <td class="px-3 py-2">{{ row.role?.RoleName || allLabel() }}</td>
                    <td class="px-3 py-2">
                      {{ row.workingLocation?.locationName || allLabel() }}
                    </td>
                    <td class="px-3 py-2">{{ row.notification || '—' }}</td>
                    <td class="px-3 py-2">{{ row.notificationDesc || '—' }}</td>
                    <td class="px-3 py-2">
                      {{ row.validFrom ? (row.validFrom | date: 'dd/MM/yyyy' : 'UTC') : '—' }}
                    </td>
                    <td class="px-3 py-2">
                      {{ row.validTill ? (row.validTill | date: 'dd/MM/yyyy' : 'UTC') : '—' }}
                    </td>
                    <td class="px-3 py-2">
                      <button
                        z-button
                        type="button"
                        zType="ghost"
                        zSize="sm"
                        [attr.aria-label]="'supComm.edit' | translate: lang()"
                        (click)="openEdit(row)"
                      >
                        <ng-icon name="lucidePencil" size="16" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="9" class="px-3 py-8 text-center text-muted-foreground">
                      {{ 'supComm.noRecords' | translate: lang() }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="mt-4 flex justify-end">
            <button z-button type="button" zType="default" (click)="openCreate()">
              {{ 'supComm.createNew' | translate: lang() }}
            </button>
          </div>
        }
      }

      <!-- Create -->
      @if (mode() === 'create') {
        <form [formGroup]="createForm" autocomplete="off" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label for="an-c-type" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.communicationType' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <select id="an-c-type" [class]="selectClass" formControlName="notificationTypeID">
              <option [ngValue]="null" disabled>
                {{ 'supComm.select' | translate: lang() }}
              </option>
              @for (t of types(); track t.notificationTypeID) {
                <option [ngValue]="t.notificationTypeID">{{ t.notificationType }}</option>
              }
            </select>
          </div>
          <div>
            <label for="an-c-role" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.selectRole' | translate: lang() }}
            </label>
            <select id="an-c-role" [class]="selectClass" formControlName="roleID" (change)="onRoleChange()">
              <option [ngValue]="'All'">{{ 'supComm.all' | translate: lang() }}</option>
              @for (r of roles(); track r.roleID) {
                <option [ngValue]="r.roleID">{{ r.roleName }}</option>
              }
            </select>
          </div>
          <div>
            <span class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.selectOffice' | translate: lang() }}
            </span>
            <ul
              class="max-h-40 space-y-1 overflow-y-auto rounded-md border border-input px-3 py-2"
              [class.opacity-50]="roleIsAll()"
            >
              @for (office of offices(); track office.pSAddMapID) {
                <li>
                  <label class="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      class="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      [checked]="selectedOffices().has(office.pSAddMapID)"
                      [disabled]="roleIsAll()"
                      (change)="toggleOffice(office.pSAddMapID)"
                    />
                    {{ office.locationName }}
                  </label>
                </li>
              } @empty {
                <li class="text-sm text-muted-foreground">
                  {{ 'supComm.noOffices' | translate: lang() }}
                </li>
              }
            </ul>
          </div>
          <div>
            <label for="an-c-start" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.validFrom' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="an-c-start"
              z-input
              class="w-full"
              type="date"
              [min]="today"
              formControlName="startDate"
            />
          </div>
          <div>
            <label for="an-c-stime" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.startTime' | translate: lang() }}
            </label>
            <input id="an-c-stime" z-input class="w-full" type="time" formControlName="startTime" />
          </div>
          <div></div>
          <div>
            <label for="an-c-end" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.validTill' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="an-c-end"
              z-input
              class="w-full"
              type="date"
              [min]="createForm.controls.startDate.value || today"
              formControlName="endDate"
            />
            @if (createRangeInvalid()) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supComm.endBeforeStart' | translate: lang() }}
              </p>
            }
          </div>
          <div>
            <label for="an-c-etime" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.endTime' | translate: lang() }}
            </label>
            <input id="an-c-etime" z-input class="w-full" type="time" formControlName="endTime" />
            @if (invalidTime()) {
              <p class="mt-1 text-xs font-medium text-destructive">
                @if (sameTime()) {
                  {{ 'supComm.startEndTimeSame' | translate: lang() }}
                } @else {
                  {{ 'supComm.endTimeBeforeStart' | translate: lang() }}
                }
              </p>
            }
          </div>
          <div></div>
          <div class="sm:col-span-2">
            <label for="an-c-subject" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.subject' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="an-c-subject" z-input class="w-full" maxlength="100" formControlName="subject" />
            <div class="mt-1 flex justify-between text-xs">
              <span class="font-medium text-destructive">
                @if (createForm.controls.subject.invalid && createForm.controls.subject.touched) {
                  {{ 'supComm.subjectMin' | translate: lang() }}
                }
              </span>
              <span class="text-muted-foreground">{{ createSubjectLength() }}/100</span>
            </div>
          </div>
          <div class="sm:col-span-2 lg:col-span-3">
            <label for="an-c-message" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.message' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <textarea
              id="an-c-message"
              [class]="textareaClass"
              rows="2"
              maxlength="300"
              formControlName="message"
            ></textarea>
            <div class="mt-1 flex justify-between text-xs">
              <span class="font-medium text-destructive">
                @if (createForm.controls.message.invalid && createForm.controls.message.touched) {
                  {{ 'supComm.messageMin' | translate: lang() }}
                }
              </span>
              <span class="text-muted-foreground">{{ createMessageLength() }}/300</span>
            </div>
          </div>
          <div class="sm:col-span-2 lg:col-span-3 flex justify-between">
            <button z-button type="button" zType="outline" (click)="backToTable()">
              {{ 'supComm.back' | translate: lang() }}
            </button>
            <button
              z-button
              type="button"
              zType="default"
              [zLoading]="saving()"
              [zDisabled]="createForm.invalid || invalidTime() || createRangeInvalid() || saving()"
              (click)="create()"
            >
              {{ 'supComm.save' | translate: lang() }}
            </button>
          </div>
        </form>
      }

      <!-- Edit -->
      @if (mode() === 'edit') {
        <form [formGroup]="editForm" autocomplete="off" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label for="an-e-start" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.validFrom' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="an-e-start"
              z-input
              class="w-full"
              type="date"
              [min]="today"
              formControlName="startDate"
            />
          </div>
          <div>
            <label for="an-e-end" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.validTill' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="an-e-end"
              z-input
              class="w-full"
              type="date"
              [min]="editForm.controls.startDate.value || today"
              formControlName="endDate"
            />
            @if (editRangeInvalid()) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supComm.endMustBeAfterStart' | translate: lang() }}
              </p>
            }
          </div>
          <div class="sm:col-span-2">
            <label for="an-e-subject" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.subject' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="an-e-subject" z-input class="w-full" maxlength="100" formControlName="subject" />
            <div class="mt-1 flex justify-between text-xs">
              <span class="font-medium text-destructive">
                @if (editForm.controls.subject.invalid && editForm.controls.subject.touched) {
                  {{ 'supComm.subjectMin' | translate: lang() }}
                }
              </span>
              <span class="text-muted-foreground">{{ editSubjectLength() }}/100</span>
            </div>
          </div>
          <div class="sm:col-span-2 lg:col-span-3">
            <label for="an-e-message" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.message' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <textarea
              id="an-e-message"
              [class]="textareaClass"
              rows="2"
              maxlength="300"
              formControlName="message"
            ></textarea>
            <div class="mt-1 flex justify-between text-xs">
              <span class="font-medium text-destructive">
                @if (editForm.controls.message.invalid && editForm.controls.message.touched) {
                  {{ 'supComm.messageMin' | translate: lang() }}
                }
              </span>
              <span class="text-muted-foreground">{{ editMessageLength() }}/300</span>
            </div>
          </div>
          <div class="sm:col-span-2 lg:col-span-3 flex justify-between">
            <button z-button type="button" zType="outline" (click)="backToTable()">
              {{ 'supComm.back' | translate: lang() }}
            </button>
            <button
              z-button
              type="button"
              zType="default"
              [zLoading]="saving()"
              [zDisabled]="editForm.invalid || editRangeInvalid() || saving()"
              (click)="update()"
            >
              {{ 'supComm.update' | translate: lang() }}
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class AlertsNotificationsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SupervisorNotificationService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly selectClass = SUP_SELECT_CLASS;
  readonly textareaClass = SUP_TEXTAREA_CLASS;
  readonly today = toDateInputValue(new Date());

  readonly mode = signal<ViewMode>('search');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  /** Notification types filtered to Alert / Notification (legacy). */
  readonly types = signal<NotificationType[]>([]);
  readonly roles = signal<ProviderRole[]>([]);
  readonly offices = signal<OfficeLocation[]>([]);
  readonly selectedOffices = signal<ReadonlySet<number>>(new Set());
  readonly notifications = signal<NotificationRow[]>([]);
  readonly editTypeName = signal('');
  readonly roleIsAll = signal(true);
  readonly invalidTime = signal(false);
  readonly sameTime = signal(false);

  private allRoleIDs: number[] = [];
  private editingRow: NotificationRow | null = null;
  private loadReqId = 0;
  private officesReqId = 0;

  readonly searchForm = this.fb.group({
    notificationTypeID: this.fb.control<number | null>(null, [Validators.required]),
    startDate: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    endDate: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly createForm = this.fb.group({
    notificationTypeID: this.fb.control<number | null>(null, [Validators.required]),
    roleID: this.fb.control<number | 'All'>('All'),
    startDate: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    startTime: this.fb.control('', { nonNullable: true }),
    endDate: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    endTime: this.fb.control('', { nonNullable: true }),
    subject: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(100)],
    }),
    message: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(300)],
    }),
  });

  readonly editForm = this.fb.group({
    startDate: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    endDate: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    subject: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(100)],
    }),
    message: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(300)],
    }),
  });

  readonly searchRangeInvalid = signal(false);
  readonly createRangeInvalid = signal(false);
  readonly editRangeInvalid = signal(false);
  readonly createSubjectLength = signal(0);
  readonly createMessageLength = signal(0);
  readonly editSubjectLength = signal(0);
  readonly editMessageLength = signal(0);

  ngOnInit(): void {
    this.watchRange(this.searchForm, this.searchRangeInvalid);
    this.watchRange(this.createForm, this.createRangeInvalid);
    this.watchRange(this.editForm, this.editRangeInvalid);
    this.createForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => {
      this.createSubjectLength.set(v.subject?.length ?? 0);
      this.createMessageLength.set(v.message?.length ?? 0);
      this.validateTimes();
    });
    this.editForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => {
      this.editSubjectLength.set(v.subject?.length ?? 0);
      this.editMessageLength.set(v.message?.length ?? 0);
    });

    const psmID = this.psmID();
    this.service
      .getNotificationTypes(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => {
          const filtered = types.filter((t) => {
            const upper = t.notificationType.toUpperCase();
            return upper === 'ALERT' || upper === 'NOTIFICATION';
          });
          this.types.set(filtered);
          if (types.length === 0) {
            this.errorMessage.set(this.i18n.instant('supComm.noNotificationTypes'));
          }
        },
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
    this.service
      .getRoles(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          this.roles.set(roles);
          this.allRoleIDs = roles.map((r) => r.roleID);
          if (roles.length === 0) {
            this.errorMessage.set(this.i18n.instant('supComm.noRoles'));
          }
        },
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
  }

  private psmID(): number | null {
    return this.authStore.currentRole()?.providerServiceMapID ?? null;
  }

  allLabel(): string {
    return this.i18n.instant('supComm.all');
  }

  private watchRange(
    form: {
      valueChanges: Observable<unknown>;
      getRawValue: () => { startDate: string; endDate: string };
    },
    flag: WritableSignal<boolean>,
  ): void {
    form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const { startDate, endDate } = form.getRawValue();
      flag.set(!!startDate && !!endDate && endDate < startDate);
    });
  }

  /** Legacy `validateTime`: same-day messages need endTime after startTime. */
  private validateTimes(): void {
    const { startDate, endDate, startTime, endTime } = this.createForm.getRawValue();
    if (!startDate || !endDate || !startTime || !endTime || startDate !== endDate) {
      this.invalidTime.set(false);
      this.sameTime.set(false);
      return;
    }
    this.sameTime.set(startTime === endTime);
    this.invalidTime.set(startTime >= endTime);
  }

  toggleOffice(id: number): void {
    const next = new Set(this.selectedOffices());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedOffices.set(next);
  }

  onRoleChange(): void {
    const roleID = this.createForm.controls.roleID.value;
    const isAll = roleID === 'All' || roleID == null;
    this.roleIsAll.set(isAll);
    this.selectedOffices.set(new Set());
    // Legacy fetched offices for the role (or all roles when 'All' was picked,
    // though the office picker is disabled in that case).
    const reqId = ++this.officesReqId;
    this.service
      .getOfficesByRole(this.psmID(), isAll ? undefined : (roleID as number))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (offices) => {
          if (reqId !== this.officesReqId) {
            return;
          }
          this.offices.set(offices);
          if (offices.length === 0) {
            this.errorMessage.set(this.i18n.instant('supComm.noOfficesForRole'));
          }
        },
        error: (err: SupervisorError) => {
          if (reqId === this.officesReqId) {
            this.errorMessage.set(err.errorMessage);
          }
        },
      });
  }

  search(): void {
    if (this.searchForm.invalid || this.searchRangeInvalid()) {
      this.searchForm.markAllAsTouched();
      return;
    }
    this.load();
  }

  private load(): void {
    const { notificationTypeID, startDate, endDate } = this.searchForm.getRawValue();
    const start = fromDateInputValue(startDate);
    const end = fromDateInputValue(endDate);
    if (!start || !end) {
      return;
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 0);
    const reqId = ++this.loadReqId;
    this.loading.set(true);
    this.errorMessage.set('');
    this.service
      .getSupervisorNotifications({
        providerServiceMapID: this.psmID(),
        notificationTypeID,
        roleIDs: this.allRoleIDs,
        // The legacy alerts search offset-adjusted both bounds.
        validStartDate: toOffsetIsoString(start),
        validEndDate: toOffsetIsoString(end),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          if (reqId !== this.loadReqId) {
            return;
          }
          this.loading.set(false);
          this.notifications.set(rows);
        },
        error: (err: SupervisorError) => {
          if (reqId !== this.loadReqId) {
            return;
          }
          this.loading.set(false);
          this.notifications.set([]);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }

  openCreate(): void {
    this.createForm.reset({ roleID: 'All' });
    this.selectedOffices.set(new Set());
    this.roleIsAll.set(true);
    this.errorMessage.set('');
    this.mode.set('create');
    // Pre-load the all-roles office list so the (disabled) picker isn't empty.
    this.onRoleChange();
  }

  openEdit(row: NotificationRow): void {
    this.editingRow = row;
    this.editTypeName.set(row.notificationType?.notificationType ?? '');
    this.errorMessage.set('');
    this.editForm.reset({
      startDate: row.validFrom ? toDateInputValue(this.utcDay(row.validFrom)) : '',
      endDate: row.validTill ? toDateInputValue(this.utcDay(row.validTill)) : '',
      subject: row.notification ?? '',
      message: row.notificationDesc ?? '',
    });
    this.mode.set('edit');
  }

  private utcDay(value: string): Date {
    const d = new Date(value);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  backToTable(): void {
    this.mode.set('search');
    this.errorMessage.set('');
  }

  create(): void {
    if (this.createForm.invalid || this.invalidTime() || this.createRangeInvalid()) {
      this.createForm.markAllAsTouched();
      return;
    }
    const value = this.createForm.getRawValue();
    const start = fromDateInputValue(value.startDate);
    const end = fromDateInputValue(value.endDate);
    if (!start || !end) {
      return;
    }
    // Optional times override the default 00:00 / 23:59:59 bounds (legacy).
    if (value.startTime) {
      const [h, m] = value.startTime.split(':');
      start.setHours(Number(h), Number(m), 0, 0);
    } else {
      start.setHours(0, 0, 0, 0);
    }
    if (value.endTime) {
      const [h, m] = value.endTime.split(':');
      end.setHours(Number(h), Number(m), 0, 0);
    } else {
      end.setHours(23, 59, 59, 0);
    }

    const roleID =
      value.roleID === 'All' || value.roleID == null ? undefined : (value.roleID as number);
    const base: NotificationCreateRequest = {
      providerServiceMapID: this.psmID(),
      notificationTypeID: value.notificationTypeID,
      createdBy: this.authStore.user()?.userName ?? null,
      notification: value.subject.trim() || null,
      notificationDesc: value.message.trim() || null,
      validFrom: toOffsetIsoString(start),
      validTill: toOffsetIsoString(end),
      roleID,
    };
    const officeIDs = [...this.selectedOffices()];
    const body =
      officeIDs.length > 0
        ? officeIDs.map((workingLocationID) => ({ ...base, workingLocationID }))
        : [base];

    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .createNotifications(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.saving.set(false);
          if (created.length > 0) {
            const createdType = this.types().find(
              (t) => t.notificationTypeID === created[0].notificationTypeID,
            );
            const isAlert = createdType?.notificationType.toUpperCase() === 'ALERT';
            toast.success(
              this.i18n.instant(
                isAlert ? 'supComm.alertCreated' : 'supComm.notificationCreated',
              ),
            );
            this.createForm.reset({ roleID: 'All' });
            this.selectedOffices.set(new Set());
            this.roleIsAll.set(true);
          }
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set(this.i18n.instant('supComm.createFailed'));
        },
      });
  }

  update(): void {
    const row = this.editingRow;
    if (!row || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const { startDate, endDate, subject, message } = this.editForm.getRawValue();
    const start = fromDateInputValue(startDate);
    const end = fromDateInputValue(endDate);
    if (!start || !end) {
      return;
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 0);
    if (end <= start) {
      this.errorMessage.set(this.i18n.instant('supComm.endMustBeAfterStart'));
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .updateNotification({
        providerServiceMapID: this.psmID(),
        notificationTypeID: row.notificationTypeID,
        notificationID: row.notificationID,
        roleID: row.roleID,
        notification: subject.trim() || null,
        notificationDesc: message.trim() || null,
        // The legacy alerts edit offset-adjusted both bounds.
        validFrom: toOffsetIsoString(start),
        validTill: toOffsetIsoString(end),
        deleted: row.deleted,
        modifiedBy: this.authStore.user()?.userName ?? null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          toast.success(`${this.editTypeName()} ${this.i18n.instant('supComm.editedSuccessfully')}`);
          this.backToTable();
          if (this.searchForm.valid) {
            this.load();
          }
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set(this.i18n.instant('supComm.editFailed'));
        },
      });
  }
}
