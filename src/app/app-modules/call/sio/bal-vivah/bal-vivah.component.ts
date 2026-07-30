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
import { lucideShieldAlert } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CallStore } from '../../call.store';
import { BeneficiaryService } from '../../beneficiary/beneficiary.service';
import {
  BlockOption,
  DistrictOption,
  Gender,
  StateOption,
  VillageOption,
} from '../../beneficiary/beneficiary.models';
import { SIO_SELECT_CLASS } from '../shared/sio-ui';
import { SioError } from '../shared/sio-api';
import { BalVivahService } from './bal-vivah.service';
import { BalVivahRow } from './bal-vivah.models';

/**
 * Bal Vivah (child-marriage reporting) service tab. The agent captures the
 * subject of the complaint, the child (name, age, gender), the child's father,
 * the intended marriage date and TWO independent location cascades — one for the
 * child and one for the father — then saves the complaint; prior complaints for
 * the beneficiary are listed below.
 *
 * Ported (inbound-focused) from the legacy SIO bal-vivah complaint flow.
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only. The
 * legacy outbound dialling / follow-up flow is a separate outbound concern and
 * is intentionally out of scope here.
 *
 * The child and father cascades are independent: they keep separate option
 * signals (childDistricts/childSubDistricts/childVillages and their father
 * counterparts) and separate onChange handlers. States are loaded once and
 * reused for both state selects.
 */
@Component({
  selector: 'app-sio-bal-vivah',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucideShieldAlert })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon name="lucideShieldAlert" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-foreground">
          {{ 'sio.balVivah.title' | translate: lang() }}
        </h3>
      </header>

      @if (!hasContext()) {
        <p
          class="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground"
        >
          {{ 'sio.common.noContext' | translate: lang() }}
        </p>
      } @else {
        @if (errorMessage()) {
          <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
        }

        <form [formGroup]="form" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div class="sm:col-span-2 lg:col-span-3">
            <label for="bv-subject" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.balVivah.subject' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <textarea
              id="bv-subject"
              [class]="textareaClass"
              rows="2"
              maxlength="100"
              formControlName="subjectOfComplaint"
            ></textarea>
          </div>

          <div>
            <label for="bv-child-name" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.balVivah.childName' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="bv-child-name"
              z-input
              class="w-full"
              type="text"
              maxlength="50"
              formControlName="childName"
            />
          </div>

          <div>
            <label
              for="bv-father-name"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'sio.balVivah.childFatherName' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="bv-father-name"
              z-input
              class="w-full"
              type="text"
              maxlength="50"
              formControlName="childFatherName"
            />
          </div>

          <div>
            <label for="bv-child-age" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.balVivah.childAge' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="bv-child-age"
              z-input
              class="w-full"
              type="number"
              inputmode="numeric"
              min="1"
              max="17"
              formControlName="childAge"
            />
          </div>

          <div>
            <label
              for="bv-child-gender"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'sio.common.gender' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="bv-child-gender" [class]="selectClass" formControlName="childGender">
              <option [ngValue]="null" disabled>
                {{ 'sio.common.select' | translate: lang() }}
              </option>
              @for (g of genders(); track g.genderID) {
                <option [ngValue]="g.genderID">{{ g.genderName }}</option>
              }
            </select>
          </div>

          <div>
            <label
              for="bv-marriage-date"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'sio.balVivah.marriageDate' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="bv-marriage-date"
              z-input
              class="w-full"
              type="date"
              formControlName="marriageDate"
            />
          </div>

          <!-- Child location cascade -->
          <div class="sm:col-span-2 lg:col-span-3">
            <h4 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {{ 'sio.balVivah.childLocation' | translate: lang() }}
            </h4>
          </div>

          <div>
            <label
              for="bv-child-state"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'sio.common.state' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select
              id="bv-child-state"
              [class]="selectClass"
              formControlName="childState"
              (change)="onChildStateChange()"
            >
              <option [ngValue]="null" disabled>
                {{ 'sio.common.select' | translate: lang() }}
              </option>
              @for (s of states(); track s.stateID) {
                <option [ngValue]="s.stateID">{{ s.stateName }}</option>
              }
            </select>
          </div>

          <div>
            <label
              for="bv-child-district"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'sio.common.district' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <select
              id="bv-child-district"
              [class]="selectClass"
              formControlName="childDistrict"
              (change)="onChildDistrictChange()"
            >
              <option [ngValue]="null" disabled>
                {{ 'sio.common.select' | translate: lang() }}
              </option>
              @for (d of childDistricts(); track d.districtID) {
                <option [ngValue]="d.districtID">{{ d.districtName }}</option>
              }
            </select>
          </div>

          <div>
            <label
              for="bv-child-subdistrict"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'sio.common.subDistrict' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <select
              id="bv-child-subdistrict"
              [class]="selectClass"
              formControlName="childSubDistrict"
              (change)="onChildSubDistrictChange()"
            >
              <option [ngValue]="null" disabled>
                {{ 'sio.common.select' | translate: lang() }}
              </option>
              @for (b of childSubDistricts(); track b.blockID) {
                <option [ngValue]="b.blockID">{{ b.blockName }}</option>
              }
            </select>
          </div>

          <div>
            <label
              for="bv-child-village"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'sio.common.village' | translate: lang() }}
            </label>
            <select id="bv-child-village" [class]="selectClass" formControlName="childVillage">
              <option [ngValue]="null">{{ 'sio.common.select' | translate: lang() }}</option>
              @for (v of childVillages(); track v.districtBranchID) {
                <option [ngValue]="v.districtBranchID">{{ v.villageName }}</option>
              }
            </select>
          </div>

          <!-- Father location cascade -->
          <div class="sm:col-span-2 lg:col-span-3">
            <h4 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {{ 'sio.balVivah.fatherLocation' | translate: lang() }}
            </h4>
          </div>

          <div>
            <label
              for="bv-father-state"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'sio.common.state' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select
              id="bv-father-state"
              [class]="selectClass"
              formControlName="fatherState"
              (change)="onFatherStateChange()"
            >
              <option [ngValue]="null" disabled>
                {{ 'sio.common.select' | translate: lang() }}
              </option>
              @for (s of states(); track s.stateID) {
                <option [ngValue]="s.stateID">{{ s.stateName }}</option>
              }
            </select>
          </div>

          <div>
            <label
              for="bv-father-district"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'sio.common.district' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <select
              id="bv-father-district"
              [class]="selectClass"
              formControlName="fatherDistrict"
              (change)="onFatherDistrictChange()"
            >
              <option [ngValue]="null" disabled>
                {{ 'sio.common.select' | translate: lang() }}
              </option>
              @for (d of fatherDistricts(); track d.districtID) {
                <option [ngValue]="d.districtID">{{ d.districtName }}</option>
              }
            </select>
          </div>

          <div>
            <label
              for="bv-father-subdistrict"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'sio.common.subDistrict' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <select
              id="bv-father-subdistrict"
              [class]="selectClass"
              formControlName="fatherSubDistrict"
              (change)="onFatherSubDistrictChange()"
            >
              <option [ngValue]="null" disabled>
                {{ 'sio.common.select' | translate: lang() }}
              </option>
              @for (b of fatherSubDistricts(); track b.blockID) {
                <option [ngValue]="b.blockID">{{ b.blockName }}</option>
              }
            </select>
          </div>

          <div>
            <label
              for="bv-father-village"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'sio.common.village' | translate: lang() }}
            </label>
            <select id="bv-father-village" [class]="selectClass" formControlName="fatherVillage">
              <option [ngValue]="null">{{ 'sio.common.select' | translate: lang() }}</option>
              @for (v of fatherVillages(); track v.districtBranchID) {
                <option [ngValue]="v.districtBranchID">{{ v.villageName }}</option>
              }
            </select>
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
          <h4 class="mb-2 text-sm font-medium text-foreground">
            {{ 'sio.common.history' | translate: lang() }}
          </h4>
          @if (history().length === 0) {
            <p class="text-sm text-muted-foreground">
              {{ 'sio.common.noHistory' | translate: lang() }}
            </p>
          } @else {
            <div class="overflow-x-auto rounded-md border border-border">
              <table class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th class="px-3 py-2 font-medium">
                      {{ 'sio.balVivah.colComplaintId' | translate: lang() }}
                    </th>
                    <th class="px-3 py-2 font-medium">
                      {{ 'sio.balVivah.childName' | translate: lang() }}
                    </th>
                    <th class="px-3 py-2 font-medium">
                      {{ 'sio.balVivah.childFatherName' | translate: lang() }}
                    </th>
                    <th class="px-3 py-2 font-medium">
                      {{ 'sio.balVivah.subject' | translate: lang() }}
                    </th>
                    <th class="px-3 py-2 font-medium">
                      {{ 'sio.common.district' | translate: lang() }}
                    </th>
                    <th class="px-3 py-2 font-medium">
                      {{ 'sio.balVivah.complaintDate' | translate: lang() }}
                    </th>
                    <th class="px-3 py-2 font-medium">
                      {{ 'sio.balVivah.marriageDate' | translate: lang() }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of history(); track $index) {
                    <tr class="border-t border-border align-top">
                      <td class="px-3 py-2">{{ row.requestID ?? '—' }}</td>
                      <td class="px-3 py-2">{{ row.childName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.childFatherName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.subjectOfComplaint || '—' }}</td>
                      <td class="px-3 py-2">{{ row.district?.districtName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.ComplaintDate || '—' }}</td>
                      <td class="px-3 py-2">{{ row.marriageDate || '—' }}</td>
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
export class BalVivahComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly balVivah = inject(BalVivahService);
  private readonly beneficiary = inject(BeneficiaryService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted after a complaint is saved (marks the call service-availed). */
  readonly serviceProvided = output<void>();

  readonly lang = this.i18n.language;
  readonly selectClass = SIO_SELECT_CLASS;
  readonly textareaClass = SIO_SELECT_CLASS + ' min-h-[3.5rem]';

  readonly genders = signal<Gender[]>([]);
  /** States are loaded once and reused for both (child + father) state selects. */
  readonly states = signal<StateOption[]>([]);

  // Child location cascade (independent of the father cascade).
  readonly childDistricts = signal<DistrictOption[]>([]);
  readonly childSubDistricts = signal<BlockOption[]>([]);
  readonly childVillages = signal<VillageOption[]>([]);

  // Father location cascade (independent of the child cascade).
  readonly fatherDistricts = signal<DistrictOption[]>([]);
  readonly fatherSubDistricts = signal<BlockOption[]>([]);
  readonly fatherVillages = signal<VillageOption[]>([]);

  readonly history = signal<BalVivahRow[]>([]);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    subjectOfComplaint: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.maxLength(100),
    ]),
    childName: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.maxLength(50),
    ]),
    childFatherName: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.maxLength(50),
    ]),
    childAge: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(17),
    ]),
    childGender: this.fb.control<number | null>(null, Validators.required),
    marriageDate: this.fb.control<string | null>(null, Validators.required),
    childState: this.fb.control<number | null>(null, Validators.required),
    childDistrict: this.fb.control<number | null>(null, Validators.required),
    childSubDistrict: this.fb.control<number | null>(null, Validators.required),
    childVillage: this.fb.control<number | null>(null),
    fatherState: this.fb.control<number | null>(null, Validators.required),
    fatherDistrict: this.fb.control<number | null>(null, Validators.required),
    fatherSubDistrict: this.fb.control<number | null>(null, Validators.required),
    fatherVillage: this.fb.control<number | null>(null),
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

  // --- Child cascade handlers -------------------------------------------------

  onChildStateChange(): void {
    this.form.patchValue({ childDistrict: null, childSubDistrict: null, childVillage: null });
    this.childDistricts.set([]);
    this.childSubDistricts.set([]);
    this.childVillages.set([]);
    const stateID = this.form.controls.childState.value;
    if (stateID == null) {
      return;
    }
    this.beneficiary
      .getDistricts(stateID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => this.childDistricts.set(d),
        error: (e: SioError) => this.setError(e),
      });
  }

  onChildDistrictChange(): void {
    this.form.patchValue({ childSubDistrict: null, childVillage: null });
    this.childSubDistricts.set([]);
    this.childVillages.set([]);
    const districtID = this.form.controls.childDistrict.value;
    if (districtID == null) {
      return;
    }
    this.beneficiary
      .getSubDistricts(districtID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => this.childSubDistricts.set(b),
        error: (e: SioError) => this.setError(e),
      });
  }

  onChildSubDistrictChange(): void {
    this.form.patchValue({ childVillage: null });
    this.childVillages.set([]);
    const subDistrictID = this.form.controls.childSubDistrict.value;
    if (subDistrictID == null) {
      return;
    }
    this.beneficiary
      .getVillages(subDistrictID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (v) => this.childVillages.set(v),
        error: (e: SioError) => this.setError(e),
      });
  }

  // --- Father cascade handlers ------------------------------------------------

  onFatherStateChange(): void {
    this.form.patchValue({ fatherDistrict: null, fatherSubDistrict: null, fatherVillage: null });
    this.fatherDistricts.set([]);
    this.fatherSubDistricts.set([]);
    this.fatherVillages.set([]);
    const stateID = this.form.controls.fatherState.value;
    if (stateID == null) {
      return;
    }
    this.beneficiary
      .getDistricts(stateID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => this.fatherDistricts.set(d),
        error: (e: SioError) => this.setError(e),
      });
  }

  onFatherDistrictChange(): void {
    this.form.patchValue({ fatherSubDistrict: null, fatherVillage: null });
    this.fatherSubDistricts.set([]);
    this.fatherVillages.set([]);
    const districtID = this.form.controls.fatherDistrict.value;
    if (districtID == null) {
      return;
    }
    this.beneficiary
      .getSubDistricts(districtID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => this.fatherSubDistricts.set(b),
        error: (e: SioError) => this.setError(e),
      });
  }

  onFatherSubDistrictChange(): void {
    this.form.patchValue({ fatherVillage: null });
    this.fatherVillages.set([]);
    const subDistrictID = this.form.controls.fatherSubDistrict.value;
    if (subDistrictID == null) {
      return;
    }
    this.beneficiary
      .getVillages(subDistrictID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (v) => this.fatherVillages.set(v),
        error: (e: SioError) => this.setError(e),
      });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set('');
    this.balVivah
      .saveComplaint({
        beneficiaryRegID: this.callStore.beneficiaryId(),
        benCallID: this.callStore.callId(),
        subjectOfComplaint: v.subjectOfComplaint?.trim() || null,
        childName: v.childName ?? '',
        childFatherName: v.childFatherName ?? '',
        childAge: v.childAge,
        childGender: v.childGender,
        childState: v.childState,
        childFatherState: v.fatherState,
        childDistrict: v.childDistrict,
        childFatherDistrict: v.fatherDistrict,
        childSubDistrict: v.childSubDistrict,
        childFatherSubDistrict: v.fatherSubDistrict,
        childVillage: v.childVillage,
        childFatherVillage: v.fatherVillage,
        marriageDate: v.marriageDate,
        ComplaintDate: new Date().toISOString(),
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
    this.childDistricts.set([]);
    this.childSubDistricts.set([]);
    this.childVillages.set([]);
    this.fatherDistricts.set([]);
    this.fatherSubDistricts.set([]);
    this.fatherVillages.set([]);
  }

  private loadHistory(): void {
    this.balVivah
      .getHistory(this.callStore.beneficiaryId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (rows) => this.history.set(rows), error: () => this.history.set([]) });
  }

  private setError(err: SioError): void {
    this.errorMessage.set(err.errorMessage || this.i18n.instant('sio.common.loadError'));
  }
}
