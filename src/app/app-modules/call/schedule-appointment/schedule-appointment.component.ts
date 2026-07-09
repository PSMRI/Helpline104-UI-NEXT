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
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendarClock, lucideX } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../core/auth/auth.store';
import { CallStore } from '../call.store';
import { BeneficiaryService } from '../beneficiary/beneficiary.service';
import { BlockOption } from '../beneficiary/beneficiary.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AppointmentService } from './appointment.service';
import { AppointmentError, FacilityOption } from './appointment.models';

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

const PHONE_PATTERN = /^[0-9]{10}$/;
/** Legacy allowed appointment slot window: 10:00–13:00. */
const SLOT_MIN_MINUTES = 10 * 60;
const SLOT_MAX_MINUTES = 13 * 60;

/**
 * Schedule-appointment modal, ported from the legacy `ScheduleAppointmentComponent`.
 * The agent picks a block → facility (CHO centre; code/CHO auto-filled), a
 * date-time within the 10:00–13:00 slot, and optionally an alternate mobile,
 * then submits. Beneficiary/call/agent context — including the district whose
 * blocks are loaded — is read from the stores. Emits {@link saved} /
 * {@link cancelled} for the host (which owns the dialog chrome).
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-schedule-appointment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucideCalendarClock, lucideX })],
  template: `
    <section class="rounded-lg border border-border bg-card">
      <header class="flex items-center justify-between border-b border-border px-5 py-3">
        <div class="flex items-center gap-2">
          <ng-icon name="lucideCalendarClock" size="18" class="text-primary" aria-hidden="true" />
          <h3 class="text-sm font-semibold text-foreground">
            {{ 'appointment.title' | translate: lang() }}
          </h3>
        </div>
        <button
          type="button"
          class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          [attr.aria-label]="'appointment.close' | translate: lang()"
          (click)="cancelled.emit()"
        >
          <ng-icon name="lucideX" size="16" aria-hidden="true" />
        </button>
      </header>

      <div class="p-5">
        @if (errorMessage()) {
          <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
        }

        <form [formGroup]="form" class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="appt-block" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'appointment.block' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="appt-block" [class]="selectClass" formControlName="subDistrict" (change)="onBlockChange()">
              <option [ngValue]="null" disabled>{{ 'appointment.selectBlock' | translate: lang() }}</option>
              @for (b of blocks(); track b.blockID) {
                <option [ngValue]="b.blockName">{{ b.blockName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="appt-facility" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'appointment.facility' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="appt-facility" [class]="selectClass" formControlName="facilityName" (change)="onFacilityChange()">
              <option [ngValue]="null" disabled>{{ 'appointment.selectFacility' | translate: lang() }}</option>
              @for (f of facilities(); track $index) {
                <option [ngValue]="f.facilityName">{{ f.facilityName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="appt-code" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'appointment.facilityCode' | translate: lang() }}
            </label>
            <input id="appt-code" z-input class="w-full" formControlName="facilityCode" readonly />
          </div>

          <div>
            <label for="appt-cho" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'appointment.choName' | translate: lang() }}
            </label>
            <input id="appt-cho" z-input class="w-full" formControlName="choName" readonly />
          </div>

          <div class="sm:col-span-2">
            <label for="appt-datetime" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'appointment.dateTime' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input
              id="appt-datetime"
              z-input
              class="w-full"
              type="datetime-local"
              formControlName="appointmentDateTime"
              [min]="minDate"
              step="900"
              (change)="onDateChange()"
            />
            @if (timeInvalid()) {
              <p class="mt-0.5 text-xs text-destructive">{{ 'appointment.slotHint' | translate: lang() }}</p>
            }
          </div>

          <div class="sm:col-span-2">
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                formControlName="altMobile"
              />
              {{ 'appointment.altMobile' | translate: lang() }}
            </label>
            @if (form.controls.altMobile.value) {
              <div class="mt-2 max-w-xs">
                <input
                  z-input
                  class="w-full"
                  formControlName="altMobileNumber"
                  inputmode="numeric"
                  maxlength="10"
                  [attr.aria-label]="'appointment.enterMobile' | translate: lang()"
                  [placeholder]="'appointment.enterMobile' | translate: lang()"
                />
                @if (form.controls.altMobile.value && !isAltMobileValid()) {
                  <p class="mt-0.5 text-xs text-destructive">{{ 'appointment.mobileError' | translate: lang() }}</p>
                }
              </div>
            }
          </div>
        </form>

        <div class="mt-5 flex justify-end gap-2">
          <button z-button type="button" zType="outline" (click)="cancelled.emit()">
            {{ 'appointment.cancel' | translate: lang() }}
          </button>
          <button z-button type="button" zType="default" [zLoading]="saving()" [zDisabled]="!canSubmit()" (click)="submit()">
            {{ 'appointment.submit' | translate: lang() }}
          </button>
        </div>
      </div>
    </section>
  `,
})
export class ScheduleAppointmentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly appointments = inject(AppointmentService);
  private readonly beneficiary = inject(BeneficiaryService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly lang = this.i18n.language;
  readonly selectClass = SELECT_CLASS;

  readonly blocks = signal<BlockOption[]>([]);
  readonly facilities = signal<FacilityOption[]>([]);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly timeInvalid = signal(false);

  /** Earliest selectable slot: tomorrow (datetime-local format). */
  readonly minDate = this.computeMinDate();

  readonly form = this.fb.group({
    subDistrict: this.fb.control<string | null>(null, Validators.required),
    facilityName: this.fb.control<string | null>(null, Validators.required),
    facilityCode: this.fb.control('', { nonNullable: true }),
    choName: this.fb.control('', { nonNullable: true }),
    employeeCode: this.fb.control('', { nonNullable: true }),
    hfrId: this.fb.control('', { nonNullable: true }),
    facilityPhoneNo: this.fb.control('', { nonNullable: true }),
    appointmentDateTime: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    altMobile: this.fb.control(false, { nonNullable: true }),
    altMobileNumber: this.fb.control('', { nonNullable: true }),
  });

  ngOnInit(): void {
    // District is captured on the CallStore when the caller's beneficiary is
    // resolved during registration; without it the block list stays empty.
    const districtID = this.callStore.districtID();
    if (districtID == null) {
      return;
    }
    this.beneficiary
      .getSubDistricts(districtID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blocks) => this.blocks.set(blocks),
        error: (err: AppointmentError) =>
          this.errorMessage.set(err.errorMessage || this.i18n.instant('appointment.loadError')),
      });
  }

  /** Whether the alternate-mobile entry is valid (only checked when enabled). */
  isAltMobileValid(): boolean {
    if (!this.form.controls.altMobile.value) {
      return true;
    }
    return PHONE_PATTERN.test(this.form.controls.altMobileNumber.value.trim());
  }

  canSubmit(): boolean {
    return this.form.valid && !this.timeInvalid() && !this.saving() && this.isAltMobileValid();
  }

  onBlockChange(): void {
    const block = this.form.controls.subDistrict.value;
    this.resetFacilityFields();
    this.facilities.set([]);
    if (!block) {
      return;
    }
    const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;
    this.appointments
      .getFacilityMaster(providerServiceMapID, block)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.facilities.set(list),
        error: (err: AppointmentError) =>
          this.errorMessage.set(err.errorMessage || this.i18n.instant('appointment.loadError')),
      });
  }

  onFacilityChange(): void {
    const name = this.form.controls.facilityName.value;
    const facility = this.facilities().find((f) => f.facilityName === name);
    this.form.patchValue({
      facilityCode: facility?.facilityCode ?? '',
      choName: facility?.employeeName ?? '',
      employeeCode: facility?.employeeCode ?? '',
      hfrId: facility?.hfrId ?? '',
      facilityPhoneNo: facility?.presentMobileNo ?? '',
    });
  }

  onDateChange(): void {
    const value = this.form.controls.appointmentDateTime.value;
    const time = value.split('T')[1];
    if (!time) {
      this.timeInvalid.set(true);
      return;
    }
    const [h, m] = time.split(':').map((n) => parseInt(n, 10));
    const minutes = h * 60 + m;
    this.timeInvalid.set(!(minutes >= SLOT_MIN_MINUTES && minutes <= SLOT_MAX_MINUTES));
  }

  submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const alt = v.altMobileNumber.trim();
    this.saving.set(true);
    this.errorMessage.set('');
    this.appointments
      .saveAppointment({
        blockName: v.subDistrict ?? '',
        facilityName: v.facilityName ?? '',
        facilityCode: v.facilityCode,
        choName: v.choName,
        employeeCode: v.employeeCode,
        hfrId: v.hfrId,
        facilityPhoneNo: v.facilityPhoneNo,
        appointmentDate: v.appointmentDateTime + ':00.000Z',
        benRegId: this.callStore.beneficiaryId(),
        benCallId: this.callStore.callId(),
        alternateMobNo: v.altMobile && alt ? alt : this.callStore.cli(),
        createdBy: this.authStore.user()?.userName ?? '',
        providerServiceMapID: this.authStore.currentRole()?.providerServiceMapID ?? null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          toast.success(this.i18n.instant('appointment.scheduled'));
          this.saved.emit();
        },
        error: (err: AppointmentError) => {
          this.saving.set(false);
          const msg = err.errorMessage || this.i18n.instant('appointment.saveError');
          this.errorMessage.set(msg);
          toast.error(msg);
        },
      });
  }

  private resetFacilityFields(): void {
    this.form.patchValue({
      facilityName: null,
      facilityCode: '',
      choName: '',
      employeeCode: '',
      hfrId: '',
      facilityPhoneNo: '',
    });
  }

  private computeMinDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    // Floor to tomorrow 00:00 so the 10:00–13:00 slot validation is the only
    // time gate (a current-time floor would block next-day slots on afternoon calls).
    d.setHours(0, 0, 0, 0);
    const pad = (n: number) => `${n}`.padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
