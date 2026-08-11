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
import { lucideUtensils } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CallStore } from '../../call.store';
import { BeneficiaryService } from '../../beneficiary/beneficiary.service';
import { BlockOption, DistrictOption, Gender, StateOption, VillageOption } from '../../beneficiary/beneficiary.models';
import { SIO_SELECT_CLASS } from '../shared/sio-ui';
import { SioError } from '../shared/sio-api';
import { FoodSafetyService } from './food-safety.service';
import { FoodComplaintRow } from './food-safety.models';

/** Fixed list of food-complaint types (value = the string sent as `typeOfRequest`). */
const COMPLAINT_TYPES = ['Adulteration', 'Mid-Day Meal', 'Function Meal', 'Hotel Related'];

/**
 * Food Safety (food complaint) service tab. The agent captures the affected
 * patient, the complaint type, the diet / food history, the associated
 * symptoms and the incident location, then saves the complaint; prior
 * complaints for the beneficiary are listed below.
 *
 * Ported (inbound-focused) from the legacy food-complaint flow. Standalone,
 * OnPush + signals, Reactive Forms, ZardUI + Tailwind only. The legacy outbound
 * dialling / SMS flow is a separate outbound concern and is intentionally out
 * of scope here.
 */
@Component({
  selector: 'app-sio-food-safety',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucideUtensils })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon name="lucideUtensils" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-foreground">{{ 'sio.food.title' | translate: lang() }}</h3>
      </header>

      @if (!hasContext()) {
        <p class="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          {{ 'sio.common.noContext' | translate: lang() }}
        </p>
      } @else {
        @if (errorMessage()) {
          <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
        }

        <form [formGroup]="form" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label for="food-patient" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.food.patientName' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input id="food-patient" z-input class="w-full" type="text" maxlength="25" formControlName="patientName" />
          </div>

          <div>
            <label for="food-age" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.age' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input
              id="food-age"
              z-input
              class="w-full"
              type="number"
              inputmode="numeric"
              min="1"
              max="120"
              formControlName="patientAge"
            />
          </div>

          <div>
            <label for="food-gender" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.gender' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="food-gender" [class]="selectClass" formControlName="patientGenderID">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (g of genders(); track g.genderID) {
                <option [ngValue]="g.genderID">{{ g.genderName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="food-type" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.food.complaintType' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="food-type" [class]="selectClass" formControlName="complaintType">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (t of complaintTypes; track t) {
                <option [ngValue]="t">{{ t }}</option>
              }
            </select>
          </div>

          <div>
            <label for="food-diet" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.food.historyOfDiet' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input id="food-diet" z-input class="w-full" type="text" maxlength="150" formControlName="historyOfDiet" />
          </div>

          <div>
            <label for="food-food" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.food.typeOfFood' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input id="food-food" z-input class="w-full" type="text" maxlength="150" formControlName="typeOfFood" />
          </div>

          <div>
            <label for="food-source" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.food.foodConsumedFrom' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input
              id="food-source"
              z-input
              class="w-full"
              type="text"
              maxlength="25"
              formControlName="foodConsumedFrom"
            />
          </div>

          <div>
            <label for="food-symptoms" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.food.associatedSymptoms' | translate: lang() }}
            </label>
            <input
              id="food-symptoms"
              z-input
              class="w-full"
              type="text"
              maxlength="50"
              formControlName="associatedSymptoms"
            />
          </div>

          <div>
            <label for="food-incident" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.food.incidentDate' | translate: lang() }}
            </label>
            <input id="food-incident" z-input class="w-full" type="date" [max]="today" formControlName="incidentDate" />
          </div>

          <fieldset class="sm:col-span-2 lg:col-span-3">
            <legend class="mb-2 text-xs font-medium text-muted-foreground">
              {{ 'sio.food.symptoms' | translate: lang() }}
            </legend>
            <div class="flex flex-wrap gap-3">
              @for (s of symptomFields; track s.key) {
                <label class="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    [formControlName]="s.key"
                  />
                  <span>{{ s.labelKey | translate: lang() }}</span>
                </label>
              }
            </div>
          </fieldset>

          <div>
            <label for="food-state" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.state' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="food-state" [class]="selectClass" formControlName="stateID" (change)="onStateChange()">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (s of states(); track s.stateID) {
                <option [ngValue]="s.stateID">{{ s.stateName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="food-district" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.district' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="food-district" [class]="selectClass" formControlName="districtID" (change)="onDistrictChange()">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (d of districts(); track d.districtID) {
                <option [ngValue]="d.districtID">{{ d.districtName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="food-subdistrict" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.subDistrict' | translate: lang() }}
            </label>
            <select
              id="food-subdistrict"
              [class]="selectClass"
              formControlName="subDistrictID"
              (change)="onSubDistrictChange()"
            >
              <option [ngValue]="null">{{ 'sio.common.select' | translate: lang() }}</option>
              @for (b of subDistricts(); track b.blockID) {
                <option [ngValue]="b.blockID">{{ b.blockName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="food-village" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.village' | translate: lang() }}
            </label>
            <select id="food-village" [class]="selectClass" formControlName="villageID">
              <option [ngValue]="null">{{ 'sio.common.select' | translate: lang() }}</option>
              @for (v of villages(); track v.districtBranchID) {
                <option [ngValue]="v.districtBranchID">{{ v.villageName }}</option>
              }
            </select>
          </div>

          <div class="sm:col-span-2 lg:col-span-3">
            <label for="food-remarks" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.remarks' | translate: lang() }}
            </label>
            <textarea
              id="food-remarks"
              [class]="textareaClass"
              rows="2"
              maxlength="500"
              formControlName="remarks"
            ></textarea>
          </div>
        </form>

        <div class="mt-4">
          <button
            z-button
            type="button"
            zType="default"
            [zLoading]="saving()"
            [zDisabled]="form.invalid || saving()"
            (click)="save()"
          >
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
                    <th class="px-3 py-2 font-medium">{{ 'sio.food.colComplaintId' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.food.colHistoryOfDiet' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.food.colConsumedFood' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.food.colTypeOfFood' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.food.colConsumedFrom' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.food.colNature' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.common.remarks' | translate: lang() }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of history(); track $index) {
                    <tr class="border-t border-border align-top">
                      <td class="px-3 py-2">{{ row.requestID ?? '—' }}</td>
                      <td class="px-3 py-2">{{ row.historyOfDiet || '—' }}</td>
                      <td class="px-3 py-2">
                        {{ (row.isFoodConsumed === '1' ? 'sio.common.yes' : 'sio.common.no') | translate: lang() }}
                      </td>
                      <td class="px-3 py-2">{{ row.typeOfFood || '—' }}</td>
                      <td class="px-3 py-2">{{ row.foodConsumedFrom || '—' }}</td>
                      <td class="px-3 py-2">{{ row.typeOfRequest || '—' }}</td>
                      <td class="px-3 py-2">{{ row.remarks || '—' }}</td>
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
export class FoodSafetyComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly food = inject(FoodSafetyService);
  private readonly beneficiary = inject(BeneficiaryService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted after a food complaint is saved (marks the call service-availed). */
  readonly serviceProvided = output<void>();

  readonly lang = this.i18n.language;
  readonly selectClass = SIO_SELECT_CLASS;
  readonly textareaClass = SIO_SELECT_CLASS + ' min-h-[3.5rem]';

  /** Fixed complaint types (value = the string sent as `typeOfRequest`). */
  readonly complaintTypes = COMPLAINT_TYPES;
  /** Today's date (yyyy-MM-dd) used to cap the incident-date picker. */
  readonly today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  /** Symptom checkbox fields: form-control key → label key. */
  readonly symptomFields = [
    { key: 'diarrhea', labelKey: 'sio.food.diarrhea' },
    { key: 'vomiting', labelKey: 'sio.food.vomiting' },
    { key: 'abdominalPain', labelKey: 'sio.food.abdominalPain' },
    { key: 'chillsRigors', labelKey: 'sio.food.chillsRigors' },
    { key: 'giddiness', labelKey: 'sio.food.giddiness' },
    { key: 'dehydration', labelKey: 'sio.food.dehydration' },
    { key: 'rashes', labelKey: 'sio.food.rashes' },
    { key: 'foodConsumed', labelKey: 'sio.food.foodConsumed' },
  ] as const;

  readonly genders = signal<Gender[]>([]);
  readonly states = signal<StateOption[]>([]);
  readonly districts = signal<DistrictOption[]>([]);
  readonly subDistricts = signal<BlockOption[]>([]);
  readonly villages = signal<VillageOption[]>([]);
  readonly history = signal<FoodComplaintRow[]>([]);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    patientName: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(25),
    ]),
    patientAge: this.fb.control<number | null>(null, [Validators.required, Validators.min(1), Validators.max(120)]),
    patientGenderID: this.fb.control<number | null>(null, Validators.required),
    complaintType: this.fb.control<string | null>(null, Validators.required),
    historyOfDiet: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(150),
    ]),
    typeOfFood: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(150),
    ]),
    foodConsumedFrom: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(25),
    ]),
    associatedSymptoms: this.fb.control<string | null>(null, Validators.maxLength(50)),
    incidentDate: this.fb.control<string | null>(null),
    diarrhea: this.fb.control(false),
    vomiting: this.fb.control(false),
    abdominalPain: this.fb.control(false),
    chillsRigors: this.fb.control(false),
    giddiness: this.fb.control(false),
    dehydration: this.fb.control(false),
    rashes: this.fb.control(false),
    foodConsumed: this.fb.control(false),
    stateID: this.fb.control<number | null>(null, Validators.required),
    districtID: this.fb.control<number | null>(null, Validators.required),
    subDistrictID: this.fb.control<number | null>(null),
    villageID: this.fb.control<number | null>(null),
    remarks: this.fb.control<string | null>(null, Validators.maxLength(500)),
  });

  readonly hasContext = computed(() => this.callStore.beneficiaryId() !== null);

  ngOnInit(): void {
    if (!this.hasContext()) {
      return;
    }
    const role = this.authStore.currentRole();
    const providerServiceMapID = role?.providerServiceMapID ?? null;

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
    this.form.patchValue({ districtID: null, subDistrictID: null, villageID: null });
    this.districts.set([]);
    this.subDistricts.set([]);
    this.villages.set([]);
    const stateID = this.form.controls.stateID.value;
    if (stateID == null) {
      return;
    }
    this.beneficiary
      .getDistricts(stateID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d) => this.districts.set(d), error: (e: SioError) => this.setError(e) });
  }

  onDistrictChange(): void {
    this.form.patchValue({ subDistrictID: null, villageID: null });
    this.subDistricts.set([]);
    this.villages.set([]);
    const districtID = this.form.controls.districtID.value;
    if (districtID == null) {
      return;
    }
    this.beneficiary
      .getSubDistricts(districtID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (b) => this.subDistricts.set(b), error: (e: SioError) => this.setError(e) });
  }

  onSubDistrictChange(): void {
    this.form.patchValue({ villageID: null });
    this.villages.set([]);
    const subDistrictID = this.form.controls.subDistrictID.value;
    if (subDistrictID == null) {
      return;
    }
    this.beneficiary
      .getVillages(subDistrictID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (v) => this.villages.set(v), error: (e: SioError) => this.setError(e) });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set('');
    this.food
      .saveComplaint({
        beneficiaryRegID: this.callStore.beneficiaryId(),
        benCallID: this.callStore.callId(),
        patientName: v.patientName ?? '',
        patientAge: v.patientAge,
        patientGenderID: v.patientGenderID,
        typeOfRequest: v.complaintType ?? '',
        historyOfDiet: v.historyOfDiet ?? '',
        typeOfFood: v.typeOfFood ?? '',
        foodConsumedFrom: v.foodConsumedFrom ?? '',
        associatedSymptoms: v.associatedSymptoms?.trim() || null,
        fromWhen: v.incidentDate ? new Date(v.incidentDate).toISOString() : null,
        isDiarrhea: this.flag(v.diarrhea),
        isVomiting: this.flag(v.vomiting),
        isAbdominalPain: this.flag(v.abdominalPain),
        isChillsOrRigors: this.flag(v.chillsRigors),
        isGiddiness: this.flag(v.giddiness),
        isDehydration: this.flag(v.dehydration),
        isRashes: this.flag(v.rashes),
        isFoodConsumed: this.flag(v.foodConsumed),
        districtID: v.districtID,
        districtBlockID: v.subDistrictID ?? null,
        villageID: v.villageID ?? null,
        feedbackTypeID: null,
        isSelf: false,
        remarks: v.remarks?.trim() || null,
        serviceID: this.authStore.currentRole()?.providerServiceMapID ?? null,
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

  /** Map a checkbox boolean to the "1"/"0" string the API expects. */
  private flag(checked: boolean | null): string {
    return checked ? '1' : '0';
  }

  private resetForm(): void {
    this.form.reset();
    this.districts.set([]);
    this.subDistricts.set([]);
    this.villages.set([]);
  }

  private loadHistory(): void {
    this.food
      .getHistory(this.callStore.beneficiaryId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (rows) => this.history.set(rows), error: () => this.history.set([]) });
  }

  private setError(err: SioError): void {
    this.errorMessage.set(err.errorMessage || this.i18n.instant('sio.common.loadError'));
  }
}
