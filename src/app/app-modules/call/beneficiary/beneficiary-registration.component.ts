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
import { lucideSearch, lucideUserPlus } from '@ng-icons/lucide';
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
  BlockOption,
  Community,
  DistrictOption,
  Education,
  GENDER_OPTIONS,
  Gender,
  GovtIdentityType,
  HealthCareWorkerType,
  MaritalStatus,
  Relationship,
  StateOption,
  Title,
  VillageOption,
} from './beneficiary.models';

/** Which identification view is showing (the registrations list by default). */
type RegistrationView = 'list' | 'search' | 'register';

/** Indian mobile number: exactly 10 digits. */
const PHONE_PATTERN = /^[0-9]{10}$/;
/** Indian pincode: exactly 6 digits. */
const PINCODE_PATTERN = /^[0-9]{6}$/;
/** Default phone type id (primary mobile). */
const PRIMARY_PHONE_TYPE_ID = 1;
/** Legacy default relationship: 1 = Self, 11 = Other (when a Self ben exists). */
const RELATIONSHIP_SELF = 1;
const RELATIONSHIP_OTHER = 11;
const MAX_AGE = 120;
const MIN_AGE_GENERAL = 1;
const MIN_AGE_HCW = 16;
/** Alternate phone control names (legacy alternateNumber1..5). */
const ALT_PHONE_NAMES = [
  'alternateNumber1',
  'alternateNumber2',
  'alternateNumber3',
  'alternateNumber4',
  'alternateNumber5',
] as const;
type AltPhoneName = (typeof ALT_PHONE_NAMES)[number];

/** Alphanumeric ID pattern (≥1 letter and ≥1 digit), ported from legacy. */
const ALPHANUMERIC_ID = /^([A-Za-z]+[0-9]|[0-9]+[A-Za-z])[A-Za-z0-9]*$/;

/**
 * Per-identity-type validation, keyed by `govtIdentityTypeID` (legacy
 * `validateIDonDoCheck`): 1 Aadhaar, 2 Voter, 3 DL, 4 PAN, 5 Passport,
 * 6 Ration. The fallback mirrors the legacy default (spaced Aadhaar).
 */
const ID_VALIDATION: Record<number, { maxLength: number; pattern: RegExp }> = {
  1: { maxLength: 12, pattern: /^\d{12}$/ },
  2: { maxLength: 15, pattern: ALPHANUMERIC_ID },
  3: { maxLength: 15, pattern: ALPHANUMERIC_ID },
  4: { maxLength: 10, pattern: ALPHANUMERIC_ID },
  5: { maxLength: 15, pattern: ALPHANUMERIC_ID },
  6: { maxLength: 15, pattern: ALPHANUMERIC_ID },
};
const ID_VALIDATION_DEFAULT = { maxLength: 14, pattern: /^\d{4}\s\d{4}\s\d{4}$/ };

/** Shared Tailwind classes for native `<select>` controls (no custom CSS). */
const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

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

/** Validates an optional value against a pattern (empty passes). */
function optionalPattern(pattern: RegExp): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '') as string;
    return value.length > 0 && !pattern.test(value) ? { pattern: true } : null;
  };
}

/** Zero-pad to two digits. */
function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Format a Date as `YYYY-MM-DD` for a native date input. */
function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Parse a `YYYY-MM-DD` date-input value as LOCAL midnight. `new Date('YYYY-MM-DD')`
 * parses as UTC, which shifts the calendar day for IST users; constructing from
 * components keeps the date the agent actually picked.
 *
 * Returns `null` for a malformed string, an impossible calendar date (e.g.
 * `2026-02-31`, which the `Date` constructor would silently roll forward), or a
 * date in the future (a DOB cannot be after today).
 */
function fromDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  // `Date` normalizes overflow (Feb 31 -> Mar 3), so a component that changed
  // on the round-trip means the input was not a real calendar date.
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  // A DOB in the future is invalid; the picked local-midnight date must not be
  // after "now".
  if (parsed.getTime() > new Date().getTime()) {
    return null;
  }
  return parsed;
}

/**
 * Validates an optional date-of-birth control: an empty value passes (DOB is
 * optional), but a present value must be a real, non-future calendar date. Reuses
 * {@link fromDateInput}, which returns `null` for malformed, impossible, or
 * future dates. Reports an `invalidDob` error.
 */
function validDob(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '') as string;
  if (value.length === 0) {
    return null;
  }
  return fromDateInput(value) === null ? { invalidDob: true } : null;
}

/**
 * Inbound caller identification + registration (the legacy
 * `beneficiary-registration-104`), rebuilt as the first stop of the on-call RO
 * workspace at `/innerpage/registration`.
 *
 * On entry it auto-loads every beneficiary registered against the caller's
 * number (CLI) and the registration master data. The agent can select an
 * existing beneficiary, search by name/registration id, or register a new one
 * via the full two-page form (identity → address, with an emergency
 * single-page short-circuit). Any of those resolves the call's `beneficiaryId`
 * in the {@link CallStore} and returns to the workspace.
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
  viewProviders: [provideIcons({ lucideSearch, lucideUserPlus })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <!-- Action bar: Search / Register new. The registrations list for this
           number shows by default (no tab); these buttons switch to a sub-view
           and toggle back to the list when their view is already active. -->
      <div class="mb-5 flex flex-wrap items-center justify-end gap-2">
        <button
          z-button
          type="button"
          [zType]="activeView() === 'search' ? 'default' : 'outline'"
          [attr.aria-pressed]="activeView() === 'search'"
          (click)="showView('search')"
        >
          <ng-icon name="lucideSearch" size="16" aria-hidden="true" />
          {{ 'registration.tab.search' | translate: lang() }}
        </button>
        <button
          z-button
          type="button"
          [zType]="activeView() === 'register' ? 'default' : 'outline'"
          [attr.aria-pressed]="activeView() === 'register'"
          (click)="showView('register')"
        >
          <ng-icon name="lucideUserPlus" size="16" aria-hidden="true" />
          {{ 'registration.tab.register' | translate: lang() }}
        </button>
      </div>

      <!-- Default view: registrations for this number, auto-loaded by CLI on init -->
      @if (activeView() === 'list') {
        <div>
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

      <!-- Search view -->
      @if (activeView() === 'search') {
        <form [formGroup]="searchForm" (ngSubmit)="doSearch()" autocomplete="off">
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
                <select formControlName="genderID" [class]="selectClass">
                  <option [ngValue]="null">
                    {{ 'registration.field.genderPlaceholder' | translate: lang() }}
                  </option>
                  @for (g of genders(); track g.genderID) {
                    <option [ngValue]="g.genderID">{{ genderDisplay(g) }}</option>
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

      <!-- Register view -->
      @if (activeView() === 'register') {
        <form [formGroup]="registerForm" (ngSubmit)="doRegister()" autocomplete="off">
          @if (cliMissing()) {
            <div
              class="mb-5 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              {{ 'registration.notice.noCli' | translate: lang() }}
            </div>
          }
          <!-- Step indicator (hidden in emergency single-page mode) -->
          @if (!isEmergency()) {
            <ol class="mb-5 flex items-center gap-4 text-sm" aria-hidden="true">
              <li
                class="flex items-center gap-2"
                [class]="page() === 1 ? 'font-semibold text-primary' : 'text-muted-foreground'"
              >
                <span
                  class="flex h-6 w-6 items-center justify-center rounded-full border"
                  [class]="page() === 1 ? 'border-primary' : 'border-border'"
                  >1</span
                >
                {{ 'registration.section.identity' | translate: lang() }}
              </li>
              <li class="h-px w-8 bg-border"></li>
              <li
                class="flex items-center gap-2"
                [class]="page() === 2 ? 'font-semibold text-primary' : 'text-muted-foreground'"
              >
                <span
                  class="flex h-6 w-6 items-center justify-center rounded-full border"
                  [class]="page() === 2 ? 'border-primary' : 'border-border'"
                  >2</span
                >
                {{ 'registration.section.address' | translate: lang() }}
              </li>
            </ol>
          }

          <!-- ===== Page 1: identity ===== -->
          <div [hidden]="page() !== 1">
            <!-- Healthcare worker + emergency toggles -->
            <div class="mb-4 flex flex-wrap items-center gap-6">
              <span class="flex items-center gap-3 text-sm">
                <span class="font-medium">{{
                  'registration.field.healthcareWorker' | translate: lang()
                }}</span>
                <label class="flex items-center gap-1">
                  <input
                    type="radio"
                    class="h-4 w-4 accent-primary"
                    formControlName="isHealthcareWorker"
                    [value]="true"
                    (change)="onHealthcareWorkerChange()"
                  />
                  {{ 'registration.field.yes' | translate: lang() }}
                </label>
                <label class="flex items-center gap-1">
                  <input
                    type="radio"
                    class="h-4 w-4 accent-primary"
                    formControlName="isHealthcareWorker"
                    [value]="false"
                    (change)="onHealthcareWorkerChange()"
                  />
                  {{ 'registration.field.no' | translate: lang() }}
                </label>
              </span>

              <label class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-primary"
                  formControlName="isEmergency"
                  (change)="onEmergencyChange()"
                />
                {{ 'registration.field.emergency' | translate: lang() }}
              </label>
            </div>

            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @if (isHealthcareWorker()) {
                <z-form-field>
                  <label z-form-label>{{
                    'registration.field.hcwType' | translate: lang()
                  }}</label>
                  <z-form-control>
                    <select formControlName="healthCareWorkerID" [class]="selectClass">
                      <option [ngValue]="null">
                        {{ 'registration.field.selectPlaceholder' | translate: lang() }}
                      </option>
                      @for (h of hcwTypes(); track h.healthCareWorkerID) {
                        <option [ngValue]="h.healthCareWorkerID">
                          {{ h.healthCareWorkerType }}
                        </option>
                      }
                    </select>
                  </z-form-control>
                </z-form-field>
              }

              <z-form-field>
                <label z-form-label>{{
                  'registration.field.title' | translate: lang()
                }}</label>
                <z-form-control>
                  <select
                    formControlName="titleId"
                    [class]="selectClass"
                    (change)="onTitleChange()"
                  >
                    <option [ngValue]="null">
                      {{ 'registration.field.selectPlaceholder' | translate: lang() }}
                    </option>
                    @for (t of titles(); track t.titleID) {
                      <option [ngValue]="t.titleID">{{ t.titleName }}</option>
                    }
                  </select>
                </z-form-control>
              </z-form-field>

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
                  'registration.field.gender' | translate: lang()
                }}</label>
                <z-form-control>
                  <select
                    formControlName="genderID"
                    [class]="selectClass"
                    [attr.aria-invalid]="ariaInvalid('genderID')"
                  >
                    <option [ngValue]="null" disabled>
                      {{ 'registration.field.genderPlaceholder' | translate: lang() }}
                    </option>
                    @for (g of genders(); track g.genderID) {
                      <option [ngValue]="g.genderID">{{ genderDisplay(g) }}</option>
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
                <label z-form-label>{{
                  'registration.field.dob' | translate: lang()
                }}</label>
                <z-form-control>
                  <input
                    z-input
                    type="date"
                    formControlName="dob"
                    [attr.min]="minDob"
                    [attr.max]="maxDob"
                    [attr.aria-invalid]="ariaInvalid('dob')"
                    (change)="onDobChange()"
                  />
                </z-form-control>
                @if (showError('dob', 'invalidDob')) {
                  <z-form-message>{{
                    'registration.validation.dobInvalid' | translate: lang()
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
                    [attr.aria-invalid]="ariaInvalid('age')"
                    (input)="onAgeChange()"
                  />
                </z-form-control>
                @if (showError('age', 'required')) {
                  <z-form-message>{{
                    'registration.validation.required' | translate: lang()
                  }}</z-form-message>
                }
                @if (showError('age', 'ageRange')) {
                  <z-form-message>{{
                    'registration.validation.ageRange' | translate: lang()
                  }}</z-form-message>
                }
              </z-form-field>

              <z-form-field>
                <label z-form-label zRequired>{{
                  'registration.field.ageUnit' | translate: lang()
                }}</label>
                <z-form-control>
                  <select
                    formControlName="ageUnit"
                    [class]="selectClass"
                    (change)="onAgeUnitChange()"
                  >
                    <option value="years">
                      {{ 'registration.ageUnit.years' | translate: lang() }}
                    </option>
                    <option value="months">
                      {{ 'registration.ageUnit.months' | translate: lang() }}
                    </option>
                    <option value="days">
                      {{ 'registration.ageUnit.days' | translate: lang() }}
                    </option>
                  </select>
                </z-form-control>
              </z-form-field>

              <!-- Relationship to the existing beneficiary on this number -->
              @if (parentBenName()) {
                <z-form-field>
                  <label z-form-label
                    >{{ 'registration.field.relationship' | translate: lang() }}
                    <span class="text-muted-foreground">· {{ parentBenName() }}</span>
                  </label>
                  <z-form-control>
                    <select formControlName="relationshipTypeID" [class]="selectClass">
                      @for (r of relationships(); track r.benRelationshipID) {
                        <option [ngValue]="r.benRelationshipID">
                          {{ r.benRelationshipType }}
                        </option>
                      }
                    </select>
                  </z-form-control>
                </z-form-field>
              }
            </div>

            <!-- Non-emergency extra identity fields -->
            @if (!isEmergency()) {
              <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <z-form-field>
                  <label z-form-label>{{
                    'registration.field.caste' | translate: lang()
                  }}</label>
                  <z-form-control>
                    <select formControlName="communityID" [class]="selectClass">
                      <option [ngValue]="null">
                        {{ 'registration.field.selectPlaceholder' | translate: lang() }}
                      </option>
                      @for (c of communities(); track c.communityID) {
                        <option [ngValue]="c.communityID">{{ c.communityType }}</option>
                      }
                    </select>
                  </z-form-control>
                </z-form-field>

                <z-form-field>
                  <label z-form-label>{{
                    'registration.field.maritalStatus' | translate: lang()
                  }}</label>
                  <z-form-control>
                    <select formControlName="maritalStatusID" [class]="selectClass">
                      <option [ngValue]="null">
                        {{ 'registration.field.selectPlaceholder' | translate: lang() }}
                      </option>
                      @for (m of maritalStatuses(); track m.maritalStatusID) {
                        <option [ngValue]="m.maritalStatusID">{{ m.status }}</option>
                      }
                    </select>
                  </z-form-control>
                </z-form-field>

                <z-form-field>
                  <label z-form-label>{{
                    'registration.field.fatherName' | translate: lang()
                  }}</label>
                  <z-form-control>
                    <input z-input formControlName="fatherName" />
                  </z-form-control>
                </z-form-field>

                <z-form-field>
                  <label z-form-label>{{
                    'registration.field.spouseName' | translate: lang()
                  }}</label>
                  <z-form-control>
                    <input z-input formControlName="spouseName" />
                  </z-form-control>
                </z-form-field>

                <z-form-field>
                  <label z-form-label>{{
                    'registration.field.education' | translate: lang()
                  }}</label>
                  <z-form-control>
                    <select formControlName="educationID" [class]="selectClass">
                      <option [ngValue]="null">
                        {{ 'registration.field.selectPlaceholder' | translate: lang() }}
                      </option>
                      @for (e of educations(); track e.educationID) {
                        <option [ngValue]="e.educationID">{{ e.educationType }}</option>
                      }
                    </select>
                  </z-form-control>
                </z-form-field>

                <z-form-field>
                  <label z-form-label>{{
                    'registration.field.idType' | translate: lang()
                  }}</label>
                  <z-form-control>
                    <select
                      formControlName="identityType"
                      [class]="selectClass"
                      (change)="onIdTypeChange()"
                    >
                      <option [ngValue]="null">
                        {{ 'registration.field.selectPlaceholder' | translate: lang() }}
                      </option>
                      @for (i of govtIdTypes(); track i.govtIdentityTypeID) {
                        <option [ngValue]="i.govtIdentityTypeID">
                          {{ i.identityType }}
                        </option>
                      }
                    </select>
                  </z-form-control>
                </z-form-field>

                <z-form-field>
                  <label z-form-label>{{
                    'registration.field.idNumber' | translate: lang()
                  }}</label>
                  <z-form-control>
                    <input
                      z-input
                      formControlName="govtIdentityNo"
                      [attr.maxlength]="idMaxLength()"
                    />
                  </z-form-control>
                  @if (showError('govtIdentityNo', 'pattern')) {
                    <z-form-message>{{
                      'registration.validation.idInvalid' | translate: lang()
                    }}</z-form-message>
                  }
                </z-form-field>
              </div>
            }

            <div class="mt-6 flex justify-end gap-3">
              @if (isEmergency()) {
                <button
                  z-button
                  type="submit"
                  zType="default"
                  [zLoading]="registerLoading()"
                  [zDisabled]="registerLoading() || cliMissing()"
                >
                  {{ 'registration.action.register' | translate: lang() }}
                </button>
              } @else {
                <button
                  z-button
                  type="button"
                  zType="default"
                  [zDisabled]="cliMissing()"
                  (click)="goToAddress()"
                >
                  {{ 'registration.action.next' | translate: lang() }}
                </button>
              }
            </div>
          </div>

          <!-- ===== Page 2: address & contact (non-emergency) ===== -->
          <div [hidden]="page() !== 2 || isEmergency()">
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <z-form-field>
                <label z-form-label zRequired>{{
                  'registration.field.state' | translate: lang()
                }}</label>
                <z-form-control>
                  <select
                    formControlName="stateID"
                    [class]="selectClass"
                    (change)="onStateChange()"
                  >
                    <option [ngValue]="null" disabled>
                      {{ 'registration.field.selectPlaceholder' | translate: lang() }}
                    </option>
                    @for (s of states(); track s.stateID) {
                      <option [ngValue]="s.stateID">{{ s.stateName }}</option>
                    }
                  </select>
                </z-form-control>
                @if (showError('stateID', 'required')) {
                  <z-form-message>{{
                    'registration.validation.required' | translate: lang()
                  }}</z-form-message>
                }
              </z-form-field>

              <z-form-field>
                <label z-form-label zRequired>{{
                  'registration.field.district' | translate: lang()
                }}</label>
                <z-form-control>
                  <select
                    formControlName="districtID"
                    [class]="selectClass"
                    (change)="onDistrictChange()"
                  >
                    <option [ngValue]="null" disabled>
                      {{ 'registration.field.selectPlaceholder' | translate: lang() }}
                    </option>
                    @for (d of districts(); track d.districtID) {
                      <option [ngValue]="d.districtID">{{ d.districtName }}</option>
                    }
                  </select>
                </z-form-control>
                @if (showError('districtID', 'required')) {
                  <z-form-message>{{
                    'registration.validation.required' | translate: lang()
                  }}</z-form-message>
                }
              </z-form-field>

              <z-form-field>
                <label z-form-label zRequired>{{
                  'registration.field.subDistrict' | translate: lang()
                }}</label>
                <z-form-control>
                  <select
                    formControlName="subDistrictID"
                    [class]="selectClass"
                    (change)="onSubDistrictChange()"
                  >
                    <option [ngValue]="null" disabled>
                      {{ 'registration.field.selectPlaceholder' | translate: lang() }}
                    </option>
                    @for (b of subDistricts(); track b.blockID) {
                      <option [ngValue]="b.blockID">{{ b.blockName }}</option>
                    }
                  </select>
                </z-form-control>
                @if (showError('subDistrictID', 'required')) {
                  <z-form-message>{{
                    'registration.validation.required' | translate: lang()
                  }}</z-form-message>
                }
              </z-form-field>

              <z-form-field>
                <label z-form-label zRequired>{{
                  'registration.field.village' | translate: lang()
                }}</label>
                <z-form-control>
                  <select formControlName="villageID" [class]="selectClass">
                    <option [ngValue]="null" disabled>
                      {{ 'registration.field.selectPlaceholder' | translate: lang() }}
                    </option>
                    @for (v of villages(); track v.districtBranchID) {
                      <option [ngValue]="v.districtBranchID">{{ v.villageName }}</option>
                    }
                  </select>
                </z-form-control>
                @if (showError('villageID', 'required')) {
                  <z-form-message>{{
                    'registration.validation.required' | translate: lang()
                  }}</z-form-message>
                }
              </z-form-field>

              <z-form-field>
                <label z-form-label>{{
                  'registration.field.houseNumber' | translate: lang()
                }}</label>
                <z-form-control>
                  <input z-input formControlName="houseNumber" maxlength="25" />
                </z-form-control>
              </z-form-field>

              <z-form-field>
                <label z-form-label>{{
                  'registration.field.pincode' | translate: lang()
                }}</label>
                <z-form-control>
                  <input
                    z-input
                    formControlName="pincode"
                    inputmode="numeric"
                    maxlength="6"
                  />
                </z-form-control>
                @if (showError('pincode', 'pattern')) {
                  <z-form-message>{{
                    'registration.validation.pincode' | translate: lang()
                  }}</z-form-message>
                }
              </z-form-field>
            </div>

            <!-- Alternate numbers -->
            <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (ctrl of altPhoneControls; track ctrl.name; let i = $index) {
                <z-form-field>
                  <label z-form-label
                    >{{ 'registration.field.alternateNumber' | translate: lang() }}
                    {{ i + 1 }}</label
                  >
                  <z-form-control>
                    <input
                      z-input
                      [formControlName]="ctrl.name"
                      inputmode="numeric"
                      maxlength="10"
                    />
                  </z-form-control>
                  @if (registerForm.get(ctrl.name)?.touched && registerForm.get(ctrl.name)?.hasError('pattern')) {
                    <z-form-message>{{
                      'registration.validation.phone' | translate: lang()
                    }}</z-form-message>
                  }
                </z-form-field>
              }
            </div>

            <div class="mt-6 flex justify-between gap-3">
              <button z-button type="button" zType="outline" (click)="page.set(1)">
                {{ 'registration.action.back' | translate: lang() }}
              </button>
              <button
                z-button
                type="submit"
                zType="default"
                [zLoading]="registerLoading()"
                [zDisabled]="registerLoading() || cliMissing()"
              >
                {{ 'registration.action.register' | translate: lang() }}
              </button>
            </div>
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
              <th z-table-head>{{ 'registration.col.regId' | translate: lang() }}</th>
              <th z-table-head>{{ 'registration.col.name' | translate: lang() }}</th>
              <th z-table-head>{{ 'registration.col.gender' | translate: lang() }}</th>
              <th z-table-head>{{ 'registration.col.age' | translate: lang() }}</th>
              <th z-table-head>
                {{ 'registration.col.relationship' | translate: lang() }}
              </th>
              <th z-table-head>{{ 'registration.col.district' | translate: lang() }}</th>
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
  readonly selectClass = SELECT_CLASS;

  /** Datepicker bounds: today back to 121 years ago (legacy ageLimit + 1). */
  readonly maxDob = toDateInput(new Date());
  readonly minDob = toDateInput(
    new Date(new Date().getFullYear() - (MAX_AGE + 1), new Date().getMonth(), new Date().getDate()),
  );

  readonly activeView = signal<RegistrationView>('list');

  readonly historyResults = signal<BeneficiaryRecord[]>([]);
  readonly historyLoading = signal(false);

  readonly searchResults = signal<BeneficiaryRecord[]>([]);
  readonly searchLoading = signal(false);
  readonly searchAttempted = signal(false);
  readonly searchCriteriaError = signal(false);

  readonly registerLoading = signal(false);

  // --- Register-form view state -------------------------------------------
  readonly page = signal<1 | 2>(1);
  readonly isEmergency = signal(false);
  /** No caller number on this call → registration is hard-blocked. */
  readonly cliMissing = signal(false);
  readonly isHealthcareWorker = signal(false);
  readonly idMaxLength = signal(ID_VALIDATION_DEFAULT.maxLength);
  /** Existing "Self" beneficiary on this number, for relationship linking. */
  readonly parentBenName = signal<string | null>(null);
  private parentBenRegID: number | null = null;

  // --- Master data --------------------------------------------------------
  readonly genders = signal<Gender[]>(
    GENDER_OPTIONS.map((g) => ({ genderID: g.genderID, genderName: g.genderName })),
  );
  readonly titles = signal<Title[]>([]);
  readonly communities = signal<Community[]>([]);
  readonly maritalStatuses = signal<MaritalStatus[]>([]);
  readonly educations = signal<Education[]>([]);
  readonly govtIdTypes = signal<GovtIdentityType[]>([]);
  readonly relationships = signal<Relationship[]>([]);
  readonly hcwTypes = signal<HealthCareWorkerType[]>([]);

  // --- Location cascade ---------------------------------------------------
  readonly states = signal<StateOption[]>([]);
  readonly districts = signal<DistrictOption[]>([]);
  readonly subDistricts = signal<BlockOption[]>([]);
  readonly villages = signal<VillageOption[]>([]);

  /** Age range validator; the minimum depends on the healthcare-worker flag. */
  private readonly ageRangeValidator: ValidatorFn = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === '' || value === undefined) {
      return null; // emptiness is handled by `required`
    }
    const min = this.isHealthcareWorker() ? MIN_AGE_HCW : MIN_AGE_GENERAL;
    return value < min || value > MAX_AGE ? { ageRange: { min, max: MAX_AGE } } : null;
  };

  readonly searchForm = new FormGroup({
    firstName: new FormControl('', { nonNullable: true }),
    lastName: new FormControl('', { nonNullable: true }),
    beneficiaryID: new FormControl('', { nonNullable: true }),
    genderID: new FormControl<number | null>(null),
  });

  readonly registerForm = new FormGroup({
    isHealthcareWorker: new FormControl(false, { nonNullable: true }),
    isEmergency: new FormControl(false, { nonNullable: true }),
    healthCareWorkerID: new FormControl<number | null>(null),
    titleId: new FormControl<number | null>(null),
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, trimmedMinLength(3)],
    }),
    lastName: new FormControl('', { nonNullable: true, validators: [noWhitespace] }),
    genderID: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    dob: new FormControl('', { nonNullable: true, validators: [validDob] }),
    age: new FormControl<number | null>(null, {
      validators: [Validators.required, this.ageRangeValidator],
    }),
    ageUnit: new FormControl('years', { nonNullable: true, validators: [Validators.required] }),
    relationshipTypeID: new FormControl<number | null>(RELATIONSHIP_SELF),
    communityID: new FormControl<number | null>(null),
    maritalStatusID: new FormControl<number | null>(null),
    fatherName: new FormControl('', { nonNullable: true }),
    spouseName: new FormControl('', { nonNullable: true }),
    educationID: new FormControl<number | null>(null),
    identityType: new FormControl<number | null>(null),
    // Disabled until an ID type is chosen (legacy disables the field too).
    govtIdentityNo: new FormControl(
      { value: '', disabled: true },
      { nonNullable: true },
    ),
    // Page 2 (address) — required by default (non-emergency); cleared in emergency.
    stateID: new FormControl<number | null>(null, { validators: [Validators.required] }),
    districtID: new FormControl<number | null>(null, { validators: [Validators.required] }),
    subDistrictID: new FormControl<number | null>(null, {
      validators: [Validators.required],
    }),
    villageID: new FormControl<number | null>(null, { validators: [Validators.required] }),
    houseNumber: new FormControl('', { nonNullable: true }),
    pincode: new FormControl('', {
      nonNullable: true,
      validators: [optionalPattern(PINCODE_PATTERN)],
    }),
    alternateNumber1: new FormControl('', {
      nonNullable: true,
      validators: [optionalPattern(PHONE_PATTERN)],
    }),
    alternateNumber2: new FormControl('', {
      nonNullable: true,
      validators: [optionalPattern(PHONE_PATTERN)],
    }),
    alternateNumber3: new FormControl('', {
      nonNullable: true,
      validators: [optionalPattern(PHONE_PATTERN)],
    }),
    alternateNumber4: new FormControl('', {
      nonNullable: true,
      validators: [optionalPattern(PHONE_PATTERN)],
    }),
    alternateNumber5: new FormControl('', {
      nonNullable: true,
      validators: [optionalPattern(PHONE_PATTERN)],
    }),
  });

  /** Alternate-number control names, for the template loop. */
  readonly altPhoneControls: ReadonlyArray<{ name: AltPhoneName }> =
    ALT_PHONE_NAMES.map((name) => ({ name }));

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
   */
  readonly genderLabel = (row: BeneficiaryRecord): string => {
    this.lang();
    return this.translateGender(row.m_gender?.genderID, row.m_gender?.genderName);
  };

  /** Localized label for a gender master option (translate known ids). */
  genderDisplay(g: Gender): string {
    this.lang();
    return this.translateGender(g.genderID, g.genderName);
  }

  private translateGender(id?: number, name?: string): string {
    const option = GENDER_OPTIONS.find(
      (g) =>
        (id != null && g.genderID === id) ||
        (!!name && g.genderName.toLowerCase() === name.toLowerCase()),
    );
    return option ? this.i18n.instant(option.labelKey) : (name ?? '—');
  }

  /**
   * Switch to the Search or Register sub-view, or toggle back to the default
   * registrations list when that view is already active (so the two action-bar
   * buttons also serve as the way back to the list).
   */
  showView(view: 'search' | 'register'): void {
    this.activeView.set(this.activeView() === view ? 'list' : view);
  }

  ngOnInit(): void {
    this.loadMasterData();
    this.loadStates();

    const cli = this.callStore.cli();
    if (!cli) {
      // Hard block: without a CLI the new beneficiary would be registered with
      // an empty phoneNo, so disable the form entirely (a toast alone is not
      // enough — doRegister() also guards on this).
      this.cliMissing.set(true);
      this.registerForm.disable();
      toast.error(this.i18n.instant('registration.toast.noCli'));
      return;
    }
    this.loadHistory(cli);
  }

  // --- Data loading -------------------------------------------------------

  private loadMasterData(): void {
    const providerServiceMapID =
      this.authStore.currentRole()?.providerServiceMapID ?? null;
    this.beneficiary.getRegistrationData(providerServiceMapID).subscribe({
      next: (data) => {
        // A 200 with no payload leaves the form on its built-in fallbacks
        // (static gender options + free-text fields) rather than crashing.
        if (!data) {
          return;
        }
        if (data.m_genders?.length) {
          this.genders.set(data.m_genders);
        }
        this.titles.set(data.m_Title ?? []);
        this.communities.set(data.m_communities ?? []);
        this.maritalStatuses.set(data.m_maritalStatuses ?? []);
        this.educations.set(data.i_BeneficiaryEducation ?? []);
        this.govtIdTypes.set(
          (data.govtIdentityTypes ?? []).filter((t) => t.isGovtID !== false),
        );
        this.relationships.set(
          (data.benRelationshipTypes ?? []).filter(
            (r) => r.benRelationshipType?.toLowerCase() !== 'self',
          ),
        );
      },
      // Master data is best-effort: the form still works with the gender
      // fallback and free-text fields if it fails. Surface a non-blocking note.
      error: () => toast.error(this.i18n.instant('registration.toast.masterError')),
    });
  }

  private loadStates(): void {
    const serviceProviderID = this.authStore.currentRole()?.serviceProviderID ?? null;
    this.beneficiary.getProviderStates(serviceProviderID).subscribe({
      next: (states) => this.states.set(states),
      error: () => undefined,
    });
  }

  private loadHistory(cli: string): void {
    this.historyLoading.set(true);
    this.beneficiary.searchByPhone(cli).subscribe({
      next: (rows) => {
        this.historyResults.set(rows);
        this.historyLoading.set(false);
        this.detectParentBeneficiary(rows);
      },
      error: (err: BeneficiaryError) => {
        this.historyLoading.set(false);
        toast.error(err?.errorMessage || this.i18n.instant('registration.toast.error'));
      },
    });
  }

  /**
   * If a "Self" beneficiary already exists for this number, link new
   * registrations to it (legacy `setParentBenID`/`setParentBenName`): default
   * the relationship to "Other" and show the relationship selector.
   */
  private detectParentBeneficiary(rows: BeneficiaryRecord[]): void {
    const self = rows.find(
      (r) =>
        r.benPhoneMaps?.[0]?.benRelationshipType?.benRelationshipType?.toLowerCase() ===
        'self',
    );
    if (self) {
      this.parentBenRegID = self.beneficiaryRegID;
      this.parentBenName.set(this.fullName(self));
      this.registerForm.controls.relationshipTypeID.setValue(RELATIONSHIP_OTHER);
    } else {
      this.parentBenRegID = null;
      this.parentBenName.set(null);
      this.registerForm.controls.relationshipTypeID.setValue(RELATIONSHIP_SELF);
    }
  }

  // --- Register-form interactions -----------------------------------------

  onHealthcareWorkerChange(): void {
    const isHcw = this.registerForm.controls.isHealthcareWorker.value;
    this.isHealthcareWorker.set(isHcw);
    if (isHcw && this.hcwTypes().length === 0) {
      this.beneficiary.getHealthCareWorkerTypes().subscribe({
        next: (types) => this.hcwTypes.set(types),
        error: () => undefined,
      });
    }
    // Age minimum changes (16 for HCW, 1 otherwise) — re-validate.
    this.registerForm.controls.age.updateValueAndValidity();
  }

  onEmergencyChange(): void {
    const emergency = this.registerForm.controls.isEmergency.value;
    this.isEmergency.set(emergency);
    // Address is required only for non-emergency registrations.
    const addressControls = ['stateID', 'districtID', 'subDistrictID', 'villageID'] as const;
    for (const name of addressControls) {
      const control = this.registerForm.controls[name];
      control.setValidators(emergency ? [] : [Validators.required]);
      control.updateValueAndValidity();
    }
    if (emergency) {
      // Page 2 is skipped in emergency mode; clear any address/contact already
      // entered so stale values aren't submitted by doRegister().
      this.clearAddressFields();
      this.page.set(1);
    }
  }

  /** Reset all page-2 (address & contact) controls and their dependent lists. */
  private clearAddressFields(): void {
    const c = this.registerForm.controls;
    c.stateID.setValue(null);
    c.districtID.setValue(null);
    c.subDistrictID.setValue(null);
    c.villageID.setValue(null);
    c.houseNumber.setValue('');
    c.pincode.setValue('');
    for (const { name } of this.altPhoneControls) {
      this.registerForm.controls[name].setValue('');
    }
    this.districts.set([]);
    this.subDistricts.set([]);
    this.villages.set([]);
  }

  /** Title → gender auto-fill, mirroring the legacy `titleSelected`. */
  onTitleChange(): void {
    const title = this.registerForm.controls.titleId.value;
    if (title === 3 || title === 8) {
      this.registerForm.controls.genderID.setValue(1);
    } else if (title === 4 || title === 5) {
      this.registerForm.controls.genderID.setValue(2);
    }
  }

  /** DOB picked → derive age + age unit. */
  onDobChange(): void {
    const dob = this.registerForm.controls.dob.value;
    if (!dob) {
      return;
    }
    const parsed = fromDateInput(dob);
    if (!parsed) {
      return;
    }
    const { age, unit } = this.ageFromDob(parsed);
    this.registerForm.controls.age.setValue(age, { emitEvent: false });
    this.registerForm.controls.ageUnit.setValue(unit, { emitEvent: false });
    this.registerForm.controls.age.updateValueAndValidity({ emitEvent: false });
  }

  /** Age typed → derive DOB. */
  onAgeChange(): void {
    this.recomputeDob();
  }

  /** Age unit changed → re-derive DOB from the current age. */
  onAgeUnitChange(): void {
    this.recomputeDob();
  }

  private recomputeDob(): void {
    const age = this.registerForm.controls.age.value;
    const unit = this.registerForm.controls.ageUnit.value;
    if (age == null || age <= 0) {
      return;
    }
    const dob = this.dobFromAge(age, unit);
    this.registerForm.controls.dob.setValue(toDateInput(dob), { emitEvent: false });
  }

  /** Government ID type changed → swap validators + max length, clear value. */
  onIdTypeChange(): void {
    const type = this.registerForm.controls.identityType.value;
    const control = this.registerForm.controls.govtIdentityNo;
    control.setValue('');
    if (type == null) {
      control.clearValidators();
      control.disable();
      this.idMaxLength.set(ID_VALIDATION_DEFAULT.maxLength);
    } else {
      const rule = ID_VALIDATION[type] ?? ID_VALIDATION_DEFAULT;
      control.setValidators([optionalPattern(rule.pattern)]);
      control.enable();
      this.idMaxLength.set(rule.maxLength);
    }
    control.updateValueAndValidity();
  }

  // --- Location cascade ---------------------------------------------------

  onStateChange(): void {
    const stateID = this.registerForm.controls.stateID.value;
    this.districts.set([]);
    this.subDistricts.set([]);
    this.villages.set([]);
    this.registerForm.controls.districtID.setValue(null);
    this.registerForm.controls.subDistrictID.setValue(null);
    this.registerForm.controls.villageID.setValue(null);
    if (stateID == null) {
      return;
    }
    this.beneficiary.getDistricts(stateID).subscribe({
      // Guard against out-of-order responses: ignore if the selection moved on.
      next: (rows) => {
        if (this.registerForm.controls.stateID.value === stateID) {
          this.districts.set(rows);
        }
      },
      error: () => undefined,
    });
  }

  onDistrictChange(): void {
    const districtID = this.registerForm.controls.districtID.value;
    this.subDistricts.set([]);
    this.villages.set([]);
    this.registerForm.controls.subDistrictID.setValue(null);
    this.registerForm.controls.villageID.setValue(null);
    if (districtID == null) {
      return;
    }
    this.beneficiary.getSubDistricts(districtID).subscribe({
      // Guard against out-of-order responses: ignore if the selection moved on.
      next: (rows) => {
        if (this.registerForm.controls.districtID.value === districtID) {
          this.subDistricts.set(rows);
        }
      },
      error: () => undefined,
    });
  }

  onSubDistrictChange(): void {
    const subDistrictID = this.registerForm.controls.subDistrictID.value;
    this.villages.set([]);
    this.registerForm.controls.villageID.setValue(null);
    if (subDistrictID == null) {
      return;
    }
    this.beneficiary.getVillages(subDistrictID).subscribe({
      // Guard against out-of-order responses: ignore if the selection moved on.
      next: (rows) => {
        if (this.registerForm.controls.subDistrictID.value === subDistrictID) {
          this.villages.set(rows);
        }
      },
      error: () => undefined,
    });
  }

  // --- Navigation / submit ------------------------------------------------

  /** Validate page-1 identity fields and advance to the address page. */
  goToAddress(): void {
    const page1 = ['firstName', 'genderID', 'age', 'ageUnit', 'dob'] as const;
    let valid = true;
    for (const name of page1) {
      const control = this.registerForm.controls[name];
      control.markAsTouched();
      if (control.invalid) {
        valid = false;
      }
    }
    if (valid) {
      this.page.set(2);
    }
  }

  doSearch(): void {
    const { firstName, lastName, beneficiaryID, genderID } =
      this.searchForm.getRawValue();
    const hasCriteria = !!(firstName.trim() || lastName.trim() || beneficiaryID.trim());
    if (!hasCriteria) {
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
    // Hard guard: a disabled form reports as valid, so this must run before the
    // invalid-check below to stop a submit with an empty phoneNo.
    if (this.cliMissing() || !this.callStore.cli()) {
      toast.error(this.i18n.instant('registration.toast.noCli'));
      return;
    }
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      // Surface page-1 errors even if the agent is on page 2.
      if (!this.isEmergency() && this.page() === 2 && this.isPage1Invalid()) {
        this.page.set(1);
      }
      return;
    }

    const v = this.registerForm.getRawValue();
    if (v.genderID == null || v.age == null) {
      return;
    }
    const createdBy = this.authStore.user()?.userName ?? '';
    const role = this.authStore.currentRole();
    const genderName =
      this.genders().find((g) => g.genderID === v.genderID)?.genderName ?? '';
    const relationshipID = v.relationshipTypeID ?? RELATIONSHIP_SELF;
    const cli = this.callStore.cli() ?? '';

    const benPhoneMaps = [
      {
        parentBenRegID: this.parentBenRegID,
        phoneNo: cli,
        phoneTypeID: PRIMARY_PHONE_TYPE_ID,
        benRelationshipID: relationshipID,
        createdBy,
      },
      ...this.collectAlternateNumbers(v, relationshipID, createdBy),
    ];

    this.registerLoading.set(true);
    this.beneficiary
      .create({
        providerServiceMapID: role?.providerServiceMapID ?? null,
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        // Send local-midnight IST (matches legacy's moment(...).format('...Z')
        // local-offset contract). A bare UTC `Z` shifts the date back a day for
        // IST agents (e.g. 1990-01-01 -> 1989-12-31T18:30:00Z).
        dOB: v.dob ? `${v.dob}T00:00:00.000+05:30` : undefined,
        ageUnits: v.ageUnit,
        // Father's name and spouse's name are captured in separate optional
        // fields, matching legacy (never routed to lastName).
        fatherName: v.fatherName.trim() || null,
        spouseName: v.spouseName.trim() || null,
        beneficiaryIdentities: [
          {
            govtIdentityNo: v.govtIdentityNo.trim() || null,
            govtIdentityTypeID: v.identityType,
          },
        ],
        emergencyRegistration: v.isEmergency,
        createdBy,
        titleId: v.titleId,
        maritalStatusID: v.maritalStatusID,
        genderID: v.genderID,
        genderName,
        vanID: role?.serviceID ?? null,
        i_bendemographics: {
          educationID: v.educationID,
          healthCareWorkerID: v.isHealthcareWorker ? v.healthCareWorkerID : null,
          communityID: v.communityID,
          districtID: v.districtID,
          stateID: v.stateID,
          pinCode: v.pincode.trim() || null,
          blockID: v.subDistrictID,
          districtBranchID: v.villageID,
          addressLine1: v.houseNumber.trim() || null,
          createdBy,
        },
        benPhoneMaps,
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

  private collectAlternateNumbers(
    value: ReturnType<BeneficiaryRegistrationComponent['registerForm']['getRawValue']>,
    benRelationshipID: number,
    createdBy: string,
  ): Array<{
    parentBenRegID: number | null;
    benRelationshipID: number;
    phoneNo: string;
    deleted: boolean;
    createdBy: string;
  }> {
    return this.altPhoneControls
      .map((c) => (value[c.name] ?? '').trim())
      .filter((phoneNo) => phoneNo.length > 0)
      .map((phoneNo) => ({
        parentBenRegID: this.parentBenRegID,
        benRelationshipID,
        phoneNo,
        deleted: false,
        createdBy,
      }));
  }

  private isPage1Invalid(): boolean {
    return (['firstName', 'genderID', 'age', 'ageUnit', 'dob'] as const).some(
      (name) => this.registerForm.controls[name].invalid,
    );
  }

  /** Select an existing beneficiary for this call. */
  selectBeneficiary(row: BeneficiaryRecord): void {
    this.resolveBeneficiary(row.beneficiaryRegID, 'registration.toast.selected');
  }

  private resolveBeneficiary(
    beneficiaryRegID: number,
    toastKey: 'registration.toast.selected' | 'registration.toast.registered',
  ): void {
    this.callStore.setBeneficiaryId(beneficiaryRegID);
    toast.success(this.i18n.instant(toastKey));
    void this.router.navigate(['/innerpage']);
  }

  // --- Age <-> DOB math ---------------------------------------------------

  /** Derive whole-unit age (years, else months, else days) from a DOB. */
  private ageFromDob(dob: Date): { age: number; unit: string } {
    const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();
    let months = now.getMonth() - dob.getMonth();
    let days = now.getDate() - dob.getDate();
    if (days < 0) {
      months -= 1;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years >= 1) {
      return { age: years, unit: 'years' };
    }
    if (months >= 1) {
      return { age: months, unit: 'months' };
    }
    const dayDiff = Math.max(
      1,
      Math.floor((now.getTime() - dob.getTime()) / 86_400_000),
    );
    return { age: dayDiff, unit: 'days' };
  }

  /** Derive a DOB from an age + unit (subtract from today). */
  private dobFromAge(age: number, unit: string): Date {
    const d = new Date();
    if (unit === 'years') {
      d.setFullYear(d.getFullYear() - age);
    } else if (unit === 'months') {
      d.setMonth(d.getMonth() - age);
    } else {
      d.setDate(d.getDate() - age);
    }
    return d;
  }

  // --- Validation helpers -------------------------------------------------

  showError(control: RegisterControlName, error: string): boolean {
    const c = this.registerForm.controls[control];
    return c.touched && c.hasError(error);
  }

  ariaInvalid(control: RegisterControlName): 'true' | null {
    const c = this.registerForm.controls[control];
    return c.touched && c.invalid ? 'true' : null;
  }
}

/** Register-form control names addressed by the validation helpers. */
type RegisterControlName =
  | 'firstName'
  | 'lastName'
  | 'genderID'
  | 'age'
  | 'dob'
  | 'govtIdentityNo'
  | 'stateID'
  | 'districtID'
  | 'subDistrictID'
  | 'villageID'
  | 'pincode';
