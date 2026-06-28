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

import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch, lucideUserPlus, lucideUsers } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import {
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormMessageComponent,
} from '@common-ui/ui/form';
import { ZardInputDirective } from '@common-ui/ui/input';
import { ZardTableImports } from '@common-ui/ui/table';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CallStore } from '../call.store';
import { BeneficiaryService } from './beneficiary.service';
import {
  BeneficiaryError,
  BeneficiaryRecord,
  GENDER_OPTIONS,
} from './beneficiary.models';

/** Which identification tab is showing. */
type RegistrationTab = 'history' | 'search' | 'register';

/** Indian mobile number: exactly 10 digits. */
const PHONE_PATTERN = /^[0-9]{10}$/;
/** Default phone type id (primary mobile) for the basic registration. */
const PRIMARY_PHONE_TYPE_ID = 1;
const MIN_AGE = 1;
const MAX_AGE = 120;

/**
 * Minimum-length validator that ignores surrounding whitespace, so a value of
 * spaces (or a too-short trimmed value) fails `minlength`. Empty is left to
 * `Validators.required`.
 */
function trimmedMinLength(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '') as string;
    if (value.length === 0) {
      return null;
    }
    const trimmedLength = value.trim().length;
    return trimmedLength < min
      ? { minlength: { requiredLength: min, actualLength: trimmedLength } }
      : null;
  };
}

/**
 * Rejects a value that is present but whitespace-only (an empty value is
 * allowed — use with optional fields). Reports a `whitespace` error.
 */
function noWhitespace(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '') as string;
  return value.length > 0 && value.trim().length === 0
    ? { whitespace: true }
    : null;
}

/**
 * Inbound caller identification (the legacy `beneficiary-registration-104`,
 * rebuilt as the first stop of the on-call RO workspace at
 * `/innerpage/registration`).
 *
 * On entry it auto-loads every beneficiary registered against the caller's
 * number (CLI). The agent can then select an existing beneficiary, search by
 * name/registration id, or register a new one. Any of those resolves the call's
 * `beneficiaryId` in the {@link CallStore} (handed to the role dispatcher) and
 * returns to the workspace.
 */
@Component({
  selector: 'app-beneficiary-registration',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NgTemplateOutlet,
    NgIcon,
    TranslatePipe,
    ZardButtonComponent,
    ZardInputDirective,
    ZardFormFieldComponent,
    ZardFormControlComponent,
    ZardFormLabelComponent,
    ZardFormMessageComponent,
    ...ZardTableImports,
  ],
  viewProviders: [
    provideIcons({ lucideUsers, lucideSearch, lucideUserPlus }),
  ],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-5">
        <h2 class="text-lg font-semibold text-foreground">
          {{ 'registration.title' | translate: lang() }}
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ 'registration.subtitle' | translate: lang() }}
        </p>
      </header>

      <!-- Tabs -->
      <div
        class="mb-5 inline-flex flex-wrap gap-1 rounded-md bg-muted p-1"
        role="tablist"
        (keydown)="onTabsKeydown($event)"
      >
        @for (t of tabs; track t.id) {
          <button
            type="button"
            role="tab"
            [id]="'tab-' + t.id"
            [attr.aria-controls]="'panel-' + t.id"
            [attr.aria-selected]="activeTab() === t.id"
            [attr.tabindex]="activeTab() === t.id ? 0 : -1"
            class="inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            [class]="
              activeTab() === t.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            "
            (click)="activeTab.set(t.id)"
          >
            <ng-icon [name]="t.icon" size="16" aria-hidden="true" />
            {{ t.labelKey | translate: lang() }}
          </button>
        }
      </div>

      <!-- History tab -->
      @if (activeTab() === 'history') {
        <div role="tabpanel" id="panel-history" aria-labelledby="tab-history">
          <h3 class="mb-3 text-sm font-medium text-foreground">
            {{ 'registration.history.heading' | translate: lang() }}
            @if (cli()) {
              <span class="font-mono text-muted-foreground">· {{ cli() }}</span>
            }
          </h3>

          @if (historyLoading()) {
            <p class="py-6 text-center text-sm text-muted-foreground">
              {{ 'registration.history.loading' | translate: lang() }}
            </p>
          } @else if (historyResults().length === 0) {
            <p
              class="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground"
            >
              {{ 'registration.history.empty' | translate: lang() }}
            </p>
          } @else {
            <ng-container
              [ngTemplateOutlet]="resultsTable"
              [ngTemplateOutletContext]="{ rows: historyResults() }"
            />
          }
        </div>
      }

      <!-- Search tab -->
      @if (activeTab() === 'search') {
        <form
          role="tabpanel"
          id="panel-search"
          aria-labelledby="tab-search"
          [formGroup]="searchForm"
          (ngSubmit)="doSearch()"
          autocomplete="off"
        >
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <z-form-field>
              <label z-form-label>{{
                'registration.field.firstName' | translate: lang()
              }}</label>
              <z-form-control>
                <input z-input formControlName="firstName" />
              </z-form-control>
            </z-form-field>
            <z-form-field>
              <label z-form-label>{{
                'registration.field.lastName' | translate: lang()
              }}</label>
              <z-form-control>
                <input z-input formControlName="lastName" />
              </z-form-control>
            </z-form-field>
            <z-form-field>
              <label z-form-label>{{
                'registration.field.benId' | translate: lang()
              }}</label>
              <z-form-control>
                <input z-input formControlName="beneficiaryID" inputmode="numeric" />
              </z-form-control>
            </z-form-field>
            <z-form-field>
              <label z-form-label>{{
                'registration.field.gender' | translate: lang()
              }}</label>
              <z-form-control>
                <select
                  formControlName="genderID"
                  class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option [ngValue]="null">
                    {{ 'registration.field.genderPlaceholder' | translate: lang() }}
                  </option>
                  @for (g of genders; track g.genderID) {
                    <option [ngValue]="g.genderID">
                      {{ g.labelKey | translate: lang() }}
                    </option>
                  }
                </select>
              </z-form-control>
            </z-form-field>
          </div>

          @if (searchCriteriaError()) {
            <p class="mt-3 text-sm font-medium text-destructive" role="alert">
              {{ 'registration.validation.searchCriteria' | translate: lang() }}
            </p>
          }

          <div class="mt-4">
            <button
              z-button
              type="submit"
              zType="default"
              [zLoading]="searchLoading()"
              [zDisabled]="searchLoading()"
            >
              {{ 'registration.action.search' | translate: lang() }}
            </button>
          </div>

          <div class="mt-5">
            @if (!searchAttempted()) {
              <p class="text-sm text-muted-foreground">
                {{ 'registration.search.prompt' | translate: lang() }}
              </p>
            } @else if (searchResults().length === 0) {
              <p
                class="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground"
              >
                {{ 'registration.search.empty' | translate: lang() }}
              </p>
            } @else {
              <ng-container
                [ngTemplateOutlet]="resultsTable"
                [ngTemplateOutletContext]="{ rows: searchResults() }"
              />
            }
          </div>
        </form>
      }

      <!-- Register tab -->
      @if (activeTab() === 'register') {
        <form
          role="tabpanel"
          id="panel-register"
          aria-labelledby="tab-register"
          [formGroup]="registerForm"
          (ngSubmit)="doRegister()"
          autocomplete="off"
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <z-form-field>
              <label z-form-label zRequired>{{
                'registration.field.firstName' | translate: lang()
              }}</label>
              <z-form-control>
                <input
                  z-input
                  formControlName="firstName"
                  [attr.aria-invalid]="ariaInvalid('firstName')"
                />
              </z-form-control>
              @if (showError('firstName', 'required')) {
                <z-form-message>{{
                  'registration.validation.required' | translate: lang()
                }}</z-form-message>
              }
              @if (showError('firstName', 'minlength')) {
                <z-form-message>{{
                  'registration.validation.firstNameMin' | translate: lang()
                }}</z-form-message>
              }
            </z-form-field>

            <z-form-field>
              <label z-form-label>{{
                'registration.field.lastName' | translate: lang()
              }}</label>
              <z-form-control>
                <input
                  z-input
                  formControlName="lastName"
                  [attr.aria-invalid]="ariaInvalid('lastName')"
                />
              </z-form-control>
              @if (showError('lastName', 'whitespace')) {
                <z-form-message>{{
                  'registration.validation.whitespace' | translate: lang()
                }}</z-form-message>
              }
            </z-form-field>

            <z-form-field>
              <label z-form-label zRequired>{{
                'registration.field.age' | translate: lang()
              }}</label>
              <z-form-control>
                <input
                  z-input
                  type="number"
                  formControlName="age"
                  inputmode="numeric"
                  [attr.min]="minAge"
                  [attr.max]="maxAge"
                  [attr.aria-invalid]="ariaInvalid('age')"
                />
              </z-form-control>
              @if (showError('age', 'required')) {
                <z-form-message>{{
                  'registration.validation.required' | translate: lang()
                }}</z-form-message>
              }
              @if (showError('age', 'min') || showError('age', 'max')) {
                <z-form-message>{{
                  'registration.validation.age' | translate: lang()
                }}</z-form-message>
              }
            </z-form-field>

            <z-form-field>
              <label z-form-label zRequired>{{
                'registration.field.gender' | translate: lang()
              }}</label>
              <z-form-control>
                <select
                  formControlName="genderID"
                  class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  [attr.aria-invalid]="ariaInvalid('genderID')"
                >
                  <option [ngValue]="null" disabled>
                    {{ 'registration.field.genderPlaceholder' | translate: lang() }}
                  </option>
                  @for (g of genders; track g.genderID) {
                    <option [ngValue]="g.genderID">
                      {{ g.labelKey | translate: lang() }}
                    </option>
                  }
                </select>
              </z-form-control>
              @if (showError('genderID', 'required')) {
                <z-form-message>{{
                  'registration.validation.required' | translate: lang()
                }}</z-form-message>
              }
            </z-form-field>

            <z-form-field>
              <label z-form-label zRequired>{{
                'registration.field.phone' | translate: lang()
              }}</label>
              <z-form-control>
                <input
                  z-input
                  formControlName="phoneNo"
                  inputmode="numeric"
                  maxlength="10"
                  [attr.aria-invalid]="ariaInvalid('phoneNo')"
                />
              </z-form-control>
              @if (showError('phoneNo', 'required')) {
                <z-form-message>{{
                  'registration.validation.required' | translate: lang()
                }}</z-form-message>
              }
              @if (showError('phoneNo', 'pattern')) {
                <z-form-message>{{
                  'registration.validation.phone' | translate: lang()
                }}</z-form-message>
              }
            </z-form-field>
          </div>

          <div class="mt-5">
            <button
              z-button
              type="submit"
              zType="default"
              [zLoading]="registerLoading()"
              [zDisabled]="registerLoading()"
            >
              {{ 'registration.action.register' | translate: lang() }}
            </button>
          </div>
        </form>
      }
    </section>

    <!-- Shared results table -->
    <ng-template #resultsTable let-rows="rows">
      <div class="overflow-x-auto">
        <table z-table>
          <thead z-table-header>
            <tr z-table-row>
              <th z-table-head>
                {{ 'registration.col.regId' | translate: lang() }}
              </th>
              <th z-table-head>
                {{ 'registration.col.name' | translate: lang() }}
              </th>
              <th z-table-head>
                {{ 'registration.col.gender' | translate: lang() }}
              </th>
              <th z-table-head>{{ 'registration.col.age' | translate: lang() }}</th>
              <th z-table-head>
                {{ 'registration.col.relationship' | translate: lang() }}
              </th>
              <th z-table-head>
                {{ 'registration.col.district' | translate: lang() }}
              </th>
              <th z-table-head class="text-right">
                {{ 'registration.col.action' | translate: lang() }}
              </th>
            </tr>
          </thead>
          <tbody z-table-body>
            @for (row of rows; track row.beneficiaryRegID) {
              <tr z-table-row>
                <td z-table-cell class="font-mono">{{ row.beneficiaryID ?? '—' }}</td>
                <td z-table-cell>{{ fullName(row) }}</td>
                <td z-table-cell>{{ genderLabel(row) }}</td>
                <td z-table-cell>{{ ageLabel(row) }}</td>
                <td z-table-cell>{{ relationship(row) }}</td>
                <td z-table-cell>
                  {{ row.i_bendemographics?.m_district?.districtName ?? '—' }}
                </td>
                <td z-table-cell class="text-right">
                  <button
                    z-button
                    type="button"
                    zType="outline"
                    zSize="sm"
                    (click)="selectBeneficiary(row)"
                  >
                    {{ 'registration.action.select' | translate: lang() }}
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </ng-template>
  `,
})
export class BeneficiaryRegistrationComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  private readonly beneficiary = inject(BeneficiaryService);
  private readonly callStore = inject(CallStore);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  readonly lang = this.i18n.language;
  readonly cli = this.callStore.cli;
  readonly genders = GENDER_OPTIONS;
  readonly minAge = MIN_AGE;
  readonly maxAge = MAX_AGE;

  readonly tabs: ReadonlyArray<{
    id: RegistrationTab;
    labelKey: 'registration.tab.history' | 'registration.tab.search' | 'registration.tab.register';
    icon: string;
  }> = [
    { id: 'history', labelKey: 'registration.tab.history', icon: 'lucideUsers' },
    { id: 'search', labelKey: 'registration.tab.search', icon: 'lucideSearch' },
    {
      id: 'register',
      labelKey: 'registration.tab.register',
      icon: 'lucideUserPlus',
    },
  ];

  readonly activeTab = signal<RegistrationTab>('history');

  readonly historyResults = signal<BeneficiaryRecord[]>([]);
  readonly historyLoading = signal(false);

  readonly searchResults = signal<BeneficiaryRecord[]>([]);
  readonly searchLoading = signal(false);
  readonly searchAttempted = signal(false);
  readonly searchCriteriaError = signal(false);

  readonly registerLoading = signal(false);

  readonly searchForm = new FormGroup({
    firstName: new FormControl('', { nonNullable: true }),
    lastName: new FormControl('', { nonNullable: true }),
    beneficiaryID: new FormControl('', { nonNullable: true }),
    genderID: new FormControl<number | null>(null),
  });

  readonly registerForm = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, trimmedMinLength(3)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [noWhitespace],
    }),
    age: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(MIN_AGE), Validators.max(MAX_AGE)],
    }),
    genderID: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    phoneNo: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(PHONE_PATTERN)],
    }),
  });

  /** Display the full name from the available name parts. */
  readonly fullName = (row: BeneficiaryRecord): string =>
    [row.firstName, row.middleName, row.lastName]
      .filter((part) => !!part)
      .join(' ')
      .trim() || '—';

  /** Display age with its unit. */
  readonly ageLabel = (row: BeneficiaryRecord): string =>
    row.actualAge != null ? `${row.actualAge} ${row.ageUnits ?? ''}`.trim() : '—';

  /** Caller relationship for this number, defaulting to "Self". */
  readonly relationship = (row: BeneficiaryRecord): string =>
    row.benPhoneMaps?.[0]?.benRelationshipType?.benRelationshipType ?? 'Self';

  /**
   * Localized gender label for a result row. Maps the API `genderID` (falling
   * back to a case-insensitive name match) to a {@link GENDER_OPTIONS} entry and
   * translates its label; if neither matches, the raw API name is shown.
   * Reads {@link lang} so it re-renders on a language switch.
   */
  readonly genderLabel = (row: BeneficiaryRecord): string => {
    this.lang();
    const id = row.m_gender?.genderID;
    const name = row.m_gender?.genderName;
    const option = GENDER_OPTIONS.find(
      (g) =>
        (id != null && g.genderID === id) ||
        (!!name && g.genderName.toLowerCase() === name.toLowerCase()),
    );
    return option ? this.i18n.instant(option.labelKey) : (name ?? '—');
  };

  /** WAI-ARIA tablist keyboard navigation (arrows + Home/End). */
  onTabsKeydown(event: KeyboardEvent): void {
    const NAV_KEYS = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!NAV_KEYS.includes(event.key)) {
      return;
    }
    event.preventDefault();
    const ids = this.tabs.map((t) => t.id);
    const current = ids.indexOf(this.activeTab());
    let next = current;
    switch (event.key) {
      case 'ArrowRight':
        next = (current + 1) % ids.length;
        break;
      case 'ArrowLeft':
        next = (current - 1 + ids.length) % ids.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = ids.length - 1;
        break;
    }
    const nextId = ids[next];
    this.activeTab.set(nextId);
    document.getElementById(`tab-${nextId}`)?.focus();
  }

  ngOnInit(): void {
    const cli = this.callStore.cli();
    if (!cli) {
      toast.error(this.i18n.instant('registration.toast.noCli'));
      return;
    }
    // Pre-fill the new-registration phone with the caller's number.
    this.registerForm.controls.phoneNo.setValue(cli);
    this.loadHistory(cli);
  }

  /** Auto-load the caller's registration history (searchUserByPhone). */
  private loadHistory(cli: string): void {
    this.historyLoading.set(true);
    this.beneficiary.searchByPhone(cli).subscribe({
      next: (rows) => {
        this.historyResults.set(rows);
        this.historyLoading.set(false);
      },
      error: (err: BeneficiaryError) => {
        this.historyLoading.set(false);
        toast.error(err?.errorMessage || this.i18n.instant('registration.toast.error'));
      },
    });
  }

  doSearch(): void {
    const { firstName, lastName, beneficiaryID, genderID } =
      this.searchForm.getRawValue();
    const hasCriteria = !!(firstName.trim() || lastName.trim() || beneficiaryID.trim());
    if (!hasCriteria) {
      // Clear any results from a previous search so stale rows aren't shown
      // alongside the "enter search criteria" message.
      this.searchResults.set([]);
      this.searchAttempted.set(false);
      this.searchCriteriaError.set(true);
      return;
    }
    this.searchCriteriaError.set(false);
    this.searchLoading.set(true);

    this.beneficiary
      .searchBeneficiary({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        beneficiaryID: beneficiaryID.trim() || undefined,
        genderID: genderID ?? undefined,
      })
      .subscribe({
        next: (rows) => {
          this.searchResults.set(rows);
          this.searchAttempted.set(true);
          this.searchLoading.set(false);
        },
        error: (err: BeneficiaryError) => {
          this.searchLoading.set(false);
          this.searchAttempted.set(true);
          this.searchResults.set([]);
          toast.error(
            err?.errorMessage || this.i18n.instant('registration.toast.error'),
          );
        },
      });
  }

  doRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    const value = this.registerForm.getRawValue();
    // Both are required validators, so invalid form already returned above; this
    // guard narrows the nullable control types without an unchecked cast.
    if (value.genderID == null || value.age == null) {
      return;
    }
    const gender = GENDER_OPTIONS.find((g) => g.genderID === value.genderID);
    const createdBy = this.authStore.user()?.userName ?? '';

    this.registerLoading.set(true);
    this.beneficiary
      .create({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        genderID: value.genderID,
        genderName: gender?.genderName ?? '',
        age: value.age,
        ageUnits: 'Years',
        createdBy,
        providerServiceMapID:
          this.authStore.currentRole()?.providerServiceMapID ?? null,
        benPhoneMaps: [
          {
            phoneNo: value.phoneNo,
            phoneTypeID: PRIMARY_PHONE_TYPE_ID,
            createdBy,
          },
        ],
        i_bendemographics: { createdBy },
      })
      .subscribe({
        next: (created) => {
          this.registerLoading.set(false);
          this.resolveBeneficiary(
            created.beneficiaryRegID,
            'registration.toast.registered',
          );
        },
        error: (err: BeneficiaryError) => {
          this.registerLoading.set(false);
          toast.error(
            err?.errorMessage || this.i18n.instant('registration.toast.error'),
          );
        },
      });
  }

  /** Select an existing beneficiary for this call. */
  selectBeneficiary(row: BeneficiaryRecord): void {
    this.resolveBeneficiary(row.beneficiaryRegID, 'registration.toast.selected');
  }

  /**
   * Record the resolved beneficiary on the call (handed to the role dispatcher)
   * and return to the on-call workspace.
   */
  private resolveBeneficiary(
    beneficiaryRegID: number,
    toastKey: 'registration.toast.selected' | 'registration.toast.registered',
  ): void {
    this.callStore.setBeneficiaryId(beneficiaryRegID);
    toast.success(this.i18n.instant(toastKey));
    void this.router.navigate(['/innerpage']);
  }

  /** Whether to show a specific validation error for a register-form control. */
  showError(
    control: 'firstName' | 'lastName' | 'age' | 'genderID' | 'phoneNo',
    error: string,
  ): boolean {
    const c = this.registerForm.controls[control];
    return c.touched && c.hasError(error);
  }

  /** `aria-invalid` value for a register-form control (omitted when valid). */
  ariaInvalid(
    control: 'firstName' | 'lastName' | 'age' | 'genderID' | 'phoneNo',
  ): 'true' | null {
    const c = this.registerForm.controls[control];
    return c.touched && c.invalid ? 'true' : null;
  }
}
