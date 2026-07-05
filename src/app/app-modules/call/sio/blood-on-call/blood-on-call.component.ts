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
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideDroplet } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CallStore } from '../../call.store';
import { BeneficiaryService } from '../../beneficiary/beneficiary.service';
import {
  DistrictOption,
  Gender,
  StateOption,
} from '../../beneficiary/beneficiary.models';
import { SIO_SELECT_CLASS } from '../shared/sio-ui';
import { SioError } from '../shared/sio-api';
import { BloodOnCallService } from './blood-on-call.service';
import {
  BloodComponentType,
  BloodGroup,
  BloodRequestRow,
} from './blood-on-call.models';

/**
 * Blood-on-Call (blood request) service tab. The agent captures the recipient,
 * the required blood group / component / units, the hospital and location, then
 * saves the request; prior requests for the beneficiary are listed below.
 *
 * Ported (inbound-focused) from the legacy `SioBloodOnCallServiceComponent`.
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only. The
 * legacy outbound dialling, blood-bank contact FormArray and SMS flow are a
 * separate outbound concern and are intentionally out of scope here.
 */
@Component({
  selector: 'app-sio-blood-on-call',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucideDroplet })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon name="lucideDroplet" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-foreground">{{ 'sio.blood.title' | translate: lang() }}</h3>
      </header>

      @if (!hasContext()) {
        <p class="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          {{ 'sio.common.noContext' | translate: lang() }}
        </p>
      } @else {
        @if (errorMessage()) {
          <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
        }

        @if (bankUrl(); as url) {
          <a [href]="url" target="_blank" rel="noopener noreferrer" class="mb-4 inline-block text-sm font-medium text-primary underline">
            {{ 'sio.blood.bankLink' | translate: lang() }}
          </a>
        }

        <form [formGroup]="form" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label for="blood-recipient" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.blood.recipientName' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input id="blood-recipient" z-input class="w-full" type="text" maxlength="25" formControlName="recipientName" />
          </div>

          <div>
            <label for="blood-age" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.age' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input id="blood-age" z-input class="w-full" type="number" inputmode="numeric" min="1" max="120" formControlName="recipientAge" />
          </div>

          <div>
            <label for="blood-gender" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.gender' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="blood-gender" [class]="selectClass" formControlName="recipientGenderID">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (g of genders(); track g.genderID) {
                <option [ngValue]="g.genderID">{{ g.genderName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="blood-group" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.blood.bloodGroup' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="blood-group" [class]="selectClass" formControlName="bloodGroupID">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (b of bloodGroups(); track b.bloodGroupID) {
                <option [ngValue]="b.bloodGroupID">{{ b.bloodGroup }}</option>
              }
            </select>
          </div>

          <div>
            <label for="blood-component" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.blood.componentType' | translate: lang() }}
            </label>
            <select id="blood-component" [class]="selectClass" formControlName="componentTypeID">
              <option [ngValue]="null">{{ 'sio.common.select' | translate: lang() }}</option>
              @for (c of componentTypes(); track c.componentTypeID) {
                <option [ngValue]="c.componentTypeID">{{ c.componentType }}</option>
              }
            </select>
          </div>

          <div>
            <label for="blood-units" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.blood.unitsRequired' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input id="blood-units" z-input class="w-full" type="number" inputmode="numeric" min="1" formControlName="unitRequired" />
          </div>

          <div class="sm:col-span-2 lg:col-span-1">
            <label for="blood-hospital" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.blood.hospital' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input id="blood-hospital" z-input class="w-full" type="text" maxlength="150" formControlName="hospitalAdmitted" />
          </div>

          <div>
            <label for="blood-state" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.state' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="blood-state" [class]="selectClass" formControlName="stateID" (change)="onStateChange()">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (s of states(); track s.stateID) {
                <option [ngValue]="s.stateID">{{ s.stateName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="blood-district" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.district' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="blood-district" [class]="selectClass" formControlName="districtID">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (d of districts(); track d.districtID) {
                <option [ngValue]="d.districtID">{{ d.districtName }}</option>
              }
            </select>
          </div>

          <div class="sm:col-span-2 lg:col-span-3">
            <label for="blood-remarks" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.remarks' | translate: lang() }}
            </label>
            <textarea id="blood-remarks" [class]="textareaClass" rows="2" maxlength="500" formControlName="remarks"></textarea>
          </div>
        </form>

        <div class="mt-4">
          <button z-button type="button" zType="default" [zLoading]="saving()" [zDisabled]="form.invalid || saving()" (click)="save()">
            {{ 'sio.common.save' | translate: lang() }}
          </button>
        </div>

        <div class="mt-6">
          <h4 class="mb-2 text-sm font-medium text-foreground">{{ 'sio.common.history' | translate: lang() }}</h4>
          @if (history().length === 0) {
            <p class="text-sm text-muted-foreground">{{ 'sio.common.noHistory' | translate: lang() }}</p>
          } @else {
            <div class="overflow-x-auto rounded-md border border-border">
              <table class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th class="px-3 py-2 font-medium">{{ 'sio.blood.colRequestId' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.blood.colRecipient' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.common.age' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.blood.bloodGroup' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.blood.componentType' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.blood.hospital' | translate: lang() }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of history(); track $index) {
                    <tr class="border-t border-border align-top">
                      <td class="px-3 py-2">{{ row.requestID ?? '—' }}</td>
                      <td class="px-3 py-2">{{ row.recipientName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.recipientAge ?? '—' }}</td>
                      <td class="px-3 py-2">{{ row.m_bloodGroup?.bloodGroup || '—' }}</td>
                      <td class="px-3 py-2">{{ row.m_componentType?.componentType || '—' }}</td>
                      <td class="px-3 py-2">{{ row.hospitalAdmitted || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class BloodOnCallComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly blood = inject(BloodOnCallService);
  private readonly beneficiary = inject(BeneficiaryService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted after a blood request is saved (marks the call service-availed). */
  readonly serviceProvided = output<void>();

  readonly lang = this.i18n.language;
  readonly selectClass = SIO_SELECT_CLASS;
  readonly textareaClass = SIO_SELECT_CLASS + ' min-h-[3.5rem]';

  readonly genders = signal<Gender[]>([]);
  readonly bloodGroups = signal<BloodGroup[]>([]);
  readonly componentTypes = signal<BloodComponentType[]>([]);
  readonly states = signal<StateOption[]>([]);
  readonly districts = signal<DistrictOption[]>([]);
  readonly history = signal<BloodRequestRow[]>([]);
  readonly bankUrl = signal<string | null>(null);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    recipientName: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(25),
    ]),
    recipientAge: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(120),
    ]),
    recipientGenderID: this.fb.control<number | null>(null, Validators.required),
    bloodGroupID: this.fb.control<number | null>(null, Validators.required),
    componentTypeID: this.fb.control<number | null>(null),
    unitRequired: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    hospitalAdmitted: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(150),
    ]),
    stateID: this.fb.control<number | null>(null, Validators.required),
    districtID: this.fb.control<number | null>(null, Validators.required),
    remarks: this.fb.control<string | null>(null, Validators.maxLength(500)),
  });

  readonly hasContext = computed(() => this.callStore.beneficiaryId() !== null);

  ngOnInit(): void {
    if (!this.hasContext()) {
      return;
    }
    const role = this.authStore.currentRole();
    const providerServiceMapID = role?.providerServiceMapID ?? null;

    this.blood.getComponentTypes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (list) => this.componentTypes.set(list),
      error: (err: SioError) => this.setError(err),
    });
    this.blood.getBloodGroups().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (list) => this.bloodGroups.set(list),
      error: (err: SioError) => this.setError(err),
    });
    this.blood.getBloodBankUrl(providerServiceMapID).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (url) => this.bankUrl.set(url),
      error: () => this.bankUrl.set(null),
    });
    this.beneficiary
      .getRegistrationData(providerServiceMapID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (master) => this.genders.set(master?.m_genders ?? []),
        error: (err: SioError) => this.setError(err),
      });
    this.beneficiary
      .getProviderStates(role?.serviceProviderID ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (states) => this.states.set(states),
        error: (err: SioError) => this.setError(err),
      });

    this.loadHistory();
  }

  onStateChange(): void {
    this.form.patchValue({ districtID: null });
    this.districts.set([]);
    const stateID = this.form.controls.stateID.value;
    if (stateID == null) {
      return;
    }
    this.beneficiary
      .getDistricts(stateID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d) => this.districts.set(d), error: (e: SioError) => this.setError(e) });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set('');
    this.blood
      .saveRequest({
        beneficiaryRegID: this.callStore.beneficiaryId(),
        benCallID: this.callStore.callId(),
        recipientName: v.recipientName ?? '',
        recipientAge: v.recipientAge,
        recipientGenderID: v.recipientGenderID,
        bloodGroupID: v.bloodGroupID,
        componentTypeID: v.componentTypeID,
        unitRequired: v.unitRequired != null ? String(v.unitRequired) : null,
        hospitalAdmitted: v.hospitalAdmitted ?? '',
        districtID: v.districtID,
        outboundNeeded: '0',
        deleted: false,
        isSelf: false,
        remarks: v.remarks?.trim() || null,
        providerServiceMapID: this.authStore.currentRole()?.providerServiceMapID ?? null,
        createdBy: this.authStore.user()?.userName ?? '',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          toast.success(this.i18n.instant('sio.common.saved'));
          this.resetForm();
          this.serviceProvided.emit();
          this.loadHistory();
        },
        error: (err: SioError) => {
          this.saving.set(false);
          const msg = err.errorMessage || this.i18n.instant('sio.common.saveError');
          this.errorMessage.set(msg);
          toast.error(msg);
        },
      });
  }

  private resetForm(): void {
    this.form.reset();
    this.districts.set([]);
  }

  private loadHistory(): void {
    this.blood
      .getHistory(this.callStore.beneficiaryId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (rows) => this.history.set(rows), error: () => this.history.set([]) });
  }

  private setError(err: SioError): void {
    this.errorMessage.set(err.errorMessage || this.i18n.instant('sio.common.loadError'));
  }
}
