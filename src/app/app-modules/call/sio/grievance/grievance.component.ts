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
import { lucideMessageSquareWarning } from '@ng-icons/lucide';
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
  StateOption,
  VillageOption,
} from '../../beneficiary/beneficiary.models';
import { SIO_SELECT_CLASS } from '../shared/sio-ui';
import { SioError } from '../shared/sio-api';
import { GrievanceService } from './grievance.service';
import {
  Designation,
  FeedbackNature,
  GrievanceCategory,
  GrievanceRow,
  GrievanceSubCategory,
  Severity,
} from './grievance.models';

/**
 * Grievance / Feedback service tab. The agent captures the nature of complaint,
 * an optional category / sub-category / severity / designation, who the
 * grievance is against, a free-text description, the incident location and date,
 * then saves it; prior grievances for the beneficiary are listed below.
 *
 * Ported (inbound-focused) from the legacy SIO grievance flow. Standalone,
 * OnPush + signals, Reactive Forms, ZardUI + Tailwind only. The legacy outbound
 * dialling, SMS, institution-type/name lookup, healthcare-worker toggle and the
 * response modal are separate concerns and are intentionally out of scope here.
 */
@Component({
  selector: 'app-sio-grievance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucideMessageSquareWarning })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon
          name="lucideMessageSquareWarning"
          size="18"
          class="text-primary"
          aria-hidden="true"
        />
        <h3 class="text-sm font-semibold text-foreground">
          {{ 'sio.grievance.title' | translate: lang() }}
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
          <div>
            <label for="grv-nature" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.grievance.nature' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <select
              id="grv-nature"
              [class]="selectClass"
              formControlName="feedbackNatureID"
              (change)="onNatureChange()"
            >
              <option [ngValue]="null" disabled>
                {{ 'sio.common.select' | translate: lang() }}
              </option>
              @for (n of natures(); track n.feedbackNatureID) {
                <option [ngValue]="n.feedbackNatureID">{{ n.feedbackNature }}</option>
              }
            </select>
          </div>

          <div>
            <label for="grv-category" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.grievance.category' | translate: lang() }}
            </label>
            <select
              id="grv-category"
              [class]="selectClass"
              formControlName="categoryID"
              (change)="onCategoryChange()"
            >
              <option [ngValue]="null">{{ 'sio.common.select' | translate: lang() }}</option>
              @for (c of categories(); track c.categoryID) {
                <option [ngValue]="c.categoryID">{{ c.categoryName }}</option>
              }
            </select>
          </div>

          <div>
            <label
              for="grv-subcategory"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'sio.grievance.subCategory' | translate: lang() }}
            </label>
            <select id="grv-subcategory" [class]="selectClass" formControlName="subCategoryID">
              <option [ngValue]="null">{{ 'sio.common.select' | translate: lang() }}</option>
              @for (s of subCategories(); track s.subCategoryID) {
                <option [ngValue]="s.subCategoryID">{{ s.subCategoryName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="grv-severity" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.grievance.severity' | translate: lang() }}
            </label>
            <select id="grv-severity" [class]="selectClass" formControlName="severityID">
              <option [ngValue]="null">{{ 'sio.common.select' | translate: lang() }}</option>
              @for (s of severities(); track s.severityID) {
                <option [ngValue]="s.severityID">{{ s.severityTypeName }}</option>
              }
            </select>
          </div>

          <div>
            <label
              for="grv-designation"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'sio.grievance.designation' | translate: lang() }}
            </label>
            <select id="grv-designation" [class]="selectClass" formControlName="designationID">
              <option [ngValue]="null">{{ 'sio.common.select' | translate: lang() }}</option>
              @for (d of designations(); track d.designationID) {
                <option [ngValue]="d.designationID">{{ d.designationName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="grv-against" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.grievance.against' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="grv-against"
              z-input
              class="w-full"
              type="text"
              maxlength="25"
              formControlName="grievanceAgainst"
            />
          </div>

          <div>
            <label for="grv-state" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.state' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select
              id="grv-state"
              [class]="selectClass"
              formControlName="state"
              (change)="onStateChange()"
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
            <label for="grv-district" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.district' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <select
              id="grv-district"
              [class]="selectClass"
              formControlName="district"
              (change)="onDistrictChange()"
            >
              <option [ngValue]="null" disabled>
                {{ 'sio.common.select' | translate: lang() }}
              </option>
              @for (d of districts(); track d.districtID) {
                <option [ngValue]="d.districtID">{{ d.districtName }}</option>
              }
            </select>
          </div>

          <div>
            <label
              for="grv-subdistrict"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'sio.common.subDistrict' | translate: lang() }}
            </label>
            <select
              id="grv-subdistrict"
              [class]="selectClass"
              formControlName="subDistrict"
              (change)="onSubDistrictChange()"
            >
              <option [ngValue]="null">{{ 'sio.common.select' | translate: lang() }}</option>
              @for (b of subDistricts(); track b.blockID) {
                <option [ngValue]="b.blockID">{{ b.blockName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="grv-village" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.village' | translate: lang() }}
            </label>
            <select id="grv-village" [class]="selectClass" formControlName="village">
              <option [ngValue]="null">{{ 'sio.common.select' | translate: lang() }}</option>
              @for (v of villages(); track v.districtBranchID) {
                <option [ngValue]="v.districtBranchID">{{ v.villageName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="grv-date" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.grievance.dateOfIncidence' | translate: lang() }}
            </label>
            <input
              id="grv-date"
              z-input
              class="w-full"
              type="date"
              [max]="today"
              formControlName="dateOfIncidence"
            />
          </div>

          <div class="sm:col-span-2 lg:col-span-3">
            <label
              for="grv-description"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'sio.common.description' | translate: lang() }}
            </label>
            <textarea
              id="grv-description"
              [class]="textareaClass"
              rows="3"
              maxlength="300"
              formControlName="feedbackDescription"
            ></textarea>
            <p class="mt-1 text-right text-xs text-muted-foreground">
              {{ descriptionLength() }}/300
            </p>
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
                      {{ 'sio.grievance.colGrievanceId' | translate: lang() }}
                    </th>
                    <th class="px-3 py-2 font-medium">
                      {{ 'sio.common.description' | translate: lang() }}
                    </th>
                    <th class="px-3 py-2 font-medium">
                      {{ 'sio.grievance.severity' | translate: lang() }}
                    </th>
                    <th class="px-3 py-2 font-medium">
                      {{ 'sio.grievance.agent' | translate: lang() }}
                    </th>
                    <th class="px-3 py-2 font-medium">
                      {{ 'sio.common.status' | translate: lang() }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of history(); track $index) {
                    <tr class="border-t border-border align-top">
                      <td class="px-3 py-2">{{ row.requestID ?? row.feedbackID ?? '—' }}</td>
                      <td class="px-3 py-2">{{ row.feedback || '—' }}</td>
                      <td class="px-3 py-2">{{ row.severity?.severityTypeName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.createdBy || '—' }}</td>
                      <td class="px-3 py-2">{{ row.feedbackStatus?.feedbackStatus || '—' }}</td>
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
export class GrievanceServiceComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly grievance = inject(GrievanceService);
  private readonly beneficiary = inject(BeneficiaryService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted after a grievance is saved (marks the call service-availed). */
  readonly serviceProvided = output<void>();

  readonly lang = this.i18n.language;
  readonly selectClass = SIO_SELECT_CLASS;
  readonly textareaClass = SIO_SELECT_CLASS + ' min-h-[4.5rem]';
  readonly today = new Date().toISOString().slice(0, 10);

  readonly natures = signal<FeedbackNature[]>([]);
  readonly categories = signal<GrievanceCategory[]>([]);
  readonly subCategories = signal<GrievanceSubCategory[]>([]);
  readonly severities = signal<Severity[]>([]);
  readonly designations = signal<Designation[]>([]);
  readonly states = signal<StateOption[]>([]);
  readonly districts = signal<DistrictOption[]>([]);
  readonly subDistricts = signal<BlockOption[]>([]);
  readonly villages = signal<VillageOption[]>([]);
  readonly history = signal<GrievanceRow[]>([]);
  readonly descriptionLength = signal(0);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    feedbackNatureID: this.fb.control<number | null>(null, Validators.required),
    categoryID: this.fb.control<number | null>(null),
    subCategoryID: this.fb.control<number | null>(null),
    severityID: this.fb.control<number | null>(null),
    designationID: this.fb.control<number | null>(null),
    grievanceAgainst: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.maxLength(25),
    ]),
    feedbackDescription: this.fb.control<string | null>(null, Validators.maxLength(300)),
    state: this.fb.control<number | null>(null, Validators.required),
    district: this.fb.control<number | null>(null, Validators.required),
    subDistrict: this.fb.control<number | null>(null),
    village: this.fb.control<number | null>(null),
    dateOfIncidence: this.fb.control<string | null>(null),
  });

  readonly hasContext = computed(() => this.callStore.beneficiaryId() !== null);

  ngOnInit(): void {
    if (!this.hasContext()) {
      return;
    }
    const role = this.authStore.currentRole();
    const providerServiceMapID = role?.providerServiceMapID ?? null;

    this.grievance
      .getNatureOfComplaints(providerServiceMapID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.natures.set(list),
        error: (err: SioError) => this.setError(err),
      });
    this.grievance
      .getSeverity()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.severities.set(list),
        error: (err: SioError) => this.setError(err),
      });
    this.grievance
      .getDesignations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.designations.set(list),
        error: (err: SioError) => this.setError(err),
      });
    this.beneficiary
      .getProviderStates(role?.serviceProviderID ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (states) => this.states.set(states),
        error: (err: SioError) => this.setError(err),
      });

    this.form.controls.feedbackDescription.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.descriptionLength.set(value?.length ?? 0));

    this.loadHistory();
  }

  onNatureChange(): void {
    this.form.patchValue({ categoryID: null, subCategoryID: null });
    this.categories.set([]);
    this.subCategories.set([]);
    const feedbackNatureID = this.form.controls.feedbackNatureID.value;
    if (feedbackNatureID == null) {
      return;
    }
    this.grievance
      .getCategories(this.authStore.currentRole()?.providerServiceMapID ?? null, feedbackNatureID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (c) => this.categories.set(c), error: (e: SioError) => this.setError(e) });
  }

  onCategoryChange(): void {
    this.form.patchValue({ subCategoryID: null });
    this.subCategories.set([]);
    const categoryID = this.form.controls.categoryID.value;
    if (categoryID == null) {
      return;
    }
    this.grievance
      .getSubCategories(categoryID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => this.subCategories.set(s),
        error: (e: SioError) => this.setError(e),
      });
  }

  onStateChange(): void {
    this.form.patchValue({ district: null, subDistrict: null, village: null });
    this.districts.set([]);
    this.subDistricts.set([]);
    this.villages.set([]);
    const stateID = this.form.controls.state.value;
    if (stateID == null) {
      return;
    }
    this.beneficiary
      .getDistricts(stateID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d) => this.districts.set(d), error: (e: SioError) => this.setError(e) });
  }

  onDistrictChange(): void {
    this.form.patchValue({ subDistrict: null, village: null });
    this.subDistricts.set([]);
    this.villages.set([]);
    const districtID = this.form.controls.district.value;
    if (districtID == null) {
      return;
    }
    this.beneficiary
      .getSubDistricts(districtID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (b) => this.subDistricts.set(b),
        error: (e: SioError) => this.setError(e),
      });
  }

  onSubDistrictChange(): void {
    this.form.patchValue({ village: null });
    this.villages.set([]);
    const subDistrictID = this.form.controls.subDistrict.value;
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
    this.grievance
      .saveGrievance({
        feedbackNatureID: v.feedbackNatureID,
        categoryID: v.categoryID,
        subCategoryID: v.subCategoryID,
        severityID: v.severityID,
        designationID: v.designationID,
        stateID: v.state,
        districtID: v.district,
        blockID: v.subDistrict ?? null,
        districtBranchID: v.village ?? null,
        feedback: v.feedbackDescription?.trim() || null,
        feedbackAgainst: v.grievanceAgainst ?? '',
        beneficiaryRegID: this.callStore.beneficiaryId(),
        serviceID: this.authStore.currentRole()?.providerServiceMapID ?? null,
        createdBy: this.authStore.user()?.userName ?? '',
        benCallID: this.callStore.callId(),
        serviceAvailDate: v.dateOfIncidence ? new Date(v.dateOfIncidence).toISOString() : null,
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
    this.categories.set([]);
    this.subCategories.set([]);
    this.districts.set([]);
    this.subDistricts.set([]);
    this.villages.set([]);
    this.descriptionLength.set(0);
  }

  private loadHistory(): void {
    this.grievance
      .getHistory(
        this.callStore.beneficiaryId(),
        this.authStore.currentRole()?.providerServiceMapID ?? null,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (rows) => this.history.set(rows), error: () => this.history.set([]) });
  }

  private setError(err: SioError): void {
    this.errorMessage.set(err.errorMessage || this.i18n.instant('sio.common.loadError'));
  }
}
