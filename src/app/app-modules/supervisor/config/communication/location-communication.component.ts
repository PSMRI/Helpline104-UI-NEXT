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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, WritableSignal, inject, signal } from '@angular/core';
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
import { NotificationRow, OfficeLocation } from './notification.models';
import { SupervisorNotificationService } from './notification.service';

type ViewMode = 'search' | 'create' | 'edit';

/**
 * Location & communication config (legacy
 * `SupervisorLocationCommunicationComponent`): search the service's
 * location-specific messages by validity window, create a message fanned out
 * to the selected offices, and edit an existing message's dates/subject/text.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-location-communication',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucidePencil, lucideSearch })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        @if (mode() === 'edit') {
          {{ 'supComm.edit' | translate: lang() }} {{ editTypeName() }}
        } @else {
          {{ 'supComm.locationMessages' | translate: lang() }}
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
            <label for="lc-start" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.validFrom' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="lc-start" z-input class="w-full" type="date" formControlName="startDate" />
          </div>
          <div>
            <label for="lc-end" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.validTill' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="lc-end" z-input class="w-full" type="date" formControlName="endDate" />
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
                    {{ 'supComm.action' | translate: lang() }}
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (row of messages(); track row.notificationID) {
                  <tr class="border-t border-border align-top">
                    <td class="px-3 py-2">{{ $index + 1 }}</td>
                    <td class="px-3 py-2">{{ row.notificationType?.notificationType || '—' }}</td>
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
                    <td colspan="7" class="px-3 py-8 text-center text-muted-foreground">
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
            <span class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.selectOffice' | translate: lang() }}
              <span class="text-destructive">*</span>
            </span>
            <ul class="max-h-40 space-y-1 overflow-y-auto rounded-md border border-input px-3 py-2">
              @for (office of offices(); track office.pSAddMapID) {
                <li>
                  <label class="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      class="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      [checked]="selectedOffices().has(office.pSAddMapID)"
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
            <label for="lc-c-start" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.validFrom' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="lc-c-start" z-input class="w-full" type="date" [min]="today" formControlName="startDate" />
          </div>
          <div>
            <label for="lc-c-end" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.validTill' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="lc-c-end"
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
          <div class="sm:col-span-2">
            <label for="lc-c-subject" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.subject' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="lc-c-subject" z-input class="w-full" maxlength="100" formControlName="subject" />
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
            <label for="lc-c-message" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.message' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <textarea
              id="lc-c-message"
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
              [zDisabled]="createForm.invalid || selectedOffices().size === 0 || createRangeInvalid() || saving()"
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
            <label for="lc-e-start" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.validFrom' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="lc-e-start" z-input class="w-full" type="date" [min]="today" formControlName="startDate" />
          </div>
          <div>
            <label for="lc-e-end" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.validTill' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="lc-e-end"
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
            <label for="lc-e-subject" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.subject' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="lc-e-subject" z-input class="w-full" maxlength="100" formControlName="subject" />
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
            <label for="lc-e-message" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supComm.message' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <textarea
              id="lc-e-message"
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
export class LocationCommunicationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SupervisorNotificationService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly textareaClass = SUP_TEXTAREA_CLASS;
  readonly selectClass = SUP_SELECT_CLASS;
  readonly today = toDateInputValue(new Date());

  readonly mode = signal<ViewMode>('search');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly offices = signal<OfficeLocation[]>([]);
  readonly selectedOffices = signal<ReadonlySet<number>>(new Set());
  readonly messages = signal<NotificationRow[]>([]);
  readonly editTypeName = signal('');

  /** The `Location Message` notification type id, resolved on init. */
  private locationTypeID: number | null = null;
  /** Every office id — the search always spans all locations (legacy). */
  private allOfficeIDs: number[] = [];
  private editingRow: NotificationRow | null = null;
  private loadReqId = 0;

  readonly searchForm = this.fb.group({
    startDate: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    endDate: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
  });

  readonly createForm = this.fb.group({
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
    this.trackRange(this.searchForm, this.searchRangeInvalid);
    this.trackRange(this.createForm, this.createRangeInvalid);
    this.trackRange(this.editForm, this.editRangeInvalid);
    this.createForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => {
      this.createSubjectLength.set(v.subject?.length ?? 0);
      this.createMessageLength.set(v.message?.length ?? 0);
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
          const match = types.find((t) => t.notificationType.toUpperCase() === 'LOCATION MESSAGE');
          if (!match) {
            this.errorMessage.set(this.i18n.instant('supComm.noNotificationTypes'));
            return;
          }
          this.locationTypeID = match.notificationTypeID;
        },
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
    this.service
      .getOffices(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (offices) => {
          this.offices.set(offices);
          this.allOfficeIDs = offices.map((o) => o.pSAddMapID);
          if (offices.length === 0) {
            this.errorMessage.set(this.i18n.instant('supComm.noOffices'));
          }
        },
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
  }

  private psmID(): number | null {
    return this.authStore.currentRole()?.providerServiceMapID ?? null;
  }

  private trackRange(
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

  toggleOffice(id: number): void {
    const next = new Set(this.selectedOffices());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedOffices.set(next);
  }

  search(): void {
    if (this.searchForm.invalid || this.searchRangeInvalid()) {
      this.searchForm.markAllAsTouched();
      return;
    }
    this.load(this.searchForm.getRawValue().startDate, this.searchForm.getRawValue().endDate);
  }

  /** Runs the notification search; the window spans ALL offices (legacy). */
  private load(startValue: string, endValue: string): void {
    const start = fromDateInputValue(startValue);
    const end = fromDateInputValue(endValue);
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
        notificationTypeID: this.locationTypeID,
        workingLocationIDs: this.allOfficeIDs,
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
          this.messages.set(rows);
        },
        error: (err: SupervisorError) => {
          if (reqId !== this.loadReqId) {
            return;
          }
          this.loading.set(false);
          this.messages.set([]);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }

  openCreate(): void {
    this.createForm.reset();
    this.selectedOffices.set(new Set());
    this.errorMessage.set('');
    this.mode.set('create');
  }

  openEdit(row: NotificationRow): void {
    this.editingRow = row;
    this.editTypeName.set(row.notificationType?.notificationType ?? '');
    this.errorMessage.set('');
    // validFrom/validTill are stored as UTC wall-clock; pre-fill using the UTC
    // calendar day (legacy `transformDatetoUTC`).
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
    if (this.createForm.invalid || this.selectedOffices().size === 0 || this.createRangeInvalid()) {
      this.createForm.markAllAsTouched();
      return;
    }
    const { startDate, endDate, subject, message } = this.createForm.getRawValue();
    const start = fromDateInputValue(startDate);
    const end = fromDateInputValue(endDate);
    if (!start || !end) {
      return;
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 0);

    // One request element per selected office (legacy fan-out).
    const body = [...this.selectedOffices()].map((workingLocationID) => ({
      providerServiceMapID: this.psmID(),
      notificationTypeID: this.locationTypeID,
      createdBy: this.authStore.user()?.userName ?? null,
      notification: subject.trim() || null,
      notificationDesc: message.trim() || null,
      validFrom: toOffsetIsoString(start),
      validTill: toOffsetIsoString(end),
      workingLocationID,
    }));

    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .createNotifications(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.saving.set(false);
          if (created.length > 0) {
            toast.success(this.i18n.instant('supComm.locationMessageCreated'));
            this.createForm.reset();
            this.selectedOffices.set(new Set());
          }
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set(this.i18n.instant('supComm.locationMessageCreateFailed'));
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
        notification: subject.trim() || null,
        notificationDesc: message.trim() || null,
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
          const { startDate: s, endDate: e } = this.searchForm.getRawValue();
          if (s && e) {
            this.load(s, e);
          }
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set(this.i18n.instant('supComm.editFailed'));
        },
      });
  }
}
