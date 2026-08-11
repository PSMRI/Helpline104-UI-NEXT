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
import { lucideActivity } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CallStore } from '../../call.store';
import { BeneficiaryService } from '../../beneficiary/beneficiary.service';
import { BlockOption, DistrictOption, StateOption, VillageOption } from '../../beneficiary/beneficiary.models';
import { SIO_SELECT_CLASS } from '../shared/sio-ui';
import { SioError } from '../shared/sio-api';
import { EpidemicOutbreakService } from './epidemic-outbreak.service';
import { EpidemicComplaintRow, NatureOfComplaint } from './epidemic-outbreak.models';

/**
 * Epidemic-Outbreak service tab. The agent captures the nature of the complaint,
 * the number of people affected and the affected location (state → district →
 * sub-district → village), then saves the complaint; prior complaints for the
 * beneficiary are listed below.
 *
 * Ported (inbound-focused) from the legacy `SioEpidemicOutbreakServiceComponent`.
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only. The
 * legacy outbound dialling, SMS and follow-up flow are a separate outbound
 * concern and are intentionally out of scope here.
 */
@Component({
  selector: 'app-sio-epidemic-outbreak',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucideActivity })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon name="lucideActivity" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-foreground">{{ 'sio.epidemic.title' | translate: lang() }}</h3>
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
            <label for="epi-nature" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.epidemic.nature' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="epi-nature" [class]="selectClass" formControlName="natureOfComplaint">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (n of natures(); track n.feedbackNatureID) {
                <option [ngValue]="n.feedbackNature">{{ n.feedbackNature }}</option>
              }
            </select>
          </div>

          <div>
            <label for="epi-affected" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.epidemic.peopleAffected' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input
              id="epi-affected"
              z-input
              class="w-full"
              type="number"
              inputmode="numeric"
              min="1"
              max="999999999"
              formControlName="totalPeopleAffected"
            />
          </div>

          <div>
            <label for="epi-state" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.state' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="epi-state" [class]="selectClass" formControlName="stateID" (change)="onStateChange()">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (s of states(); track s.stateID) {
                <option [ngValue]="s.stateID">{{ s.stateName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="epi-district" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.district' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="epi-district" [class]="selectClass" formControlName="districtID" (change)="onDistrictChange()">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (d of districts(); track d.districtID) {
                <option [ngValue]="d.districtID">{{ d.districtName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="epi-subdistrict" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.subDistrict' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select
              id="epi-subdistrict"
              [class]="selectClass"
              formControlName="subDistrictID"
              (change)="onSubDistrictChange()"
            >
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (b of subDistricts(); track b.blockID) {
                <option [ngValue]="b.blockID">{{ b.blockName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="epi-village" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.village' | translate: lang() }}
            </label>
            <select id="epi-village" [class]="selectClass" formControlName="villageID">
              <option [ngValue]="null">{{ 'sio.common.select' | translate: lang() }}</option>
              @for (v of villages(); track v.districtBranchID) {
                <option [ngValue]="v.districtBranchID">{{ v.villageName }}</option>
              }
            </select>
          </div>

          <div class="sm:col-span-2 lg:col-span-3">
            <label for="epi-remarks" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.remarks' | translate: lang() }}
            </label>
            <textarea
              id="epi-remarks"
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
                    <th class="px-3 py-2 font-medium">{{ 'sio.epidemic.colComplaintId' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.epidemic.nature' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.epidemic.peopleAffected' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.common.district' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.common.subDistrict' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.common.remarks' | translate: lang() }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of history(); track $index) {
                    <tr class="border-t border-border align-top">
                      <td class="px-3 py-2">{{ row.requestID ?? '—' }}</td>
                      <td class="px-3 py-2">{{ row.natureOfComplaint || '—' }}</td>
                      <td class="px-3 py-2">{{ row.totalPeopleAffected ?? '—' }}</td>
                      <td class="px-3 py-2">{{ row.m_district?.districtName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.m_districtblock?.blockName || '—' }}</td>
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
export class EpidemicOutbreakComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly epidemic = inject(EpidemicOutbreakService);
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

  readonly natures = signal<NatureOfComplaint[]>([]);
  readonly states = signal<StateOption[]>([]);
  readonly districts = signal<DistrictOption[]>([]);
  readonly subDistricts = signal<BlockOption[]>([]);
  readonly villages = signal<VillageOption[]>([]);
  readonly history = signal<EpidemicComplaintRow[]>([]);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    natureOfComplaint: this.fb.control<string | null>(null, Validators.required),
    totalPeopleAffected: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(999999999),
    ]),
    stateID: this.fb.control<number | null>(null, Validators.required),
    districtID: this.fb.control<number | null>(null, Validators.required),
    subDistrictID: this.fb.control<number | null>(null, Validators.required),
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

    this.epidemic
      .getNatureOfComplaints(providerServiceMapID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.natures.set(list),
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
    this.epidemic
      .saveComplaint({
        affectedDistrictBlockID: v.subDistrictID,
        affectedDistrictID: v.districtID,
        affectedVillageID: v.villageID,
        beneficiaryRegID: this.callStore.beneficiaryId(),
        natureOfComplaint: v.natureOfComplaint ?? '',
        totalPeopleAffected: v.totalPeopleAffected != null ? String(v.totalPeopleAffected) : '',
        deleted: false,
        remarks: v.remarks?.trim() || null,
        createdBy: this.authStore.user()?.userName ?? '',
        serviceID: this.authStore.currentRole()?.providerServiceMapID ?? null,
        benCallID: this.callStore.callId(),
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
    this.subDistricts.set([]);
    this.villages.set([]);
  }

  private loadHistory(): void {
    this.epidemic
      .getHistory(this.callStore.beneficiaryId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (rows) => this.history.set(rows), error: () => this.history.set([]) });
  }

  private setError(err: SioError): void {
    this.errorMessage.set(err.errorMessage || this.i18n.instant('sio.common.loadError'));
  }
}
