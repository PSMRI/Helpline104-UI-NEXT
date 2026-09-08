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

import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import type { TranslationKey } from '../../core/i18n/locales';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CallStore } from '../call.store';
import { SnomedSearchComponent } from '../case-sheet/snomed-search.component';
import type { SnomedTerm } from '../case-sheet/snomed.models';
import { HihlCaseSheetHistoryComponent } from './hihl-case-sheet-history.component';
import {
  DurationUnit,
  FamilyConditionOption,
  HihlHistoryRow,
  HihlMasterData,
  HihlSaveRequest,
  PastMedicalConditionOption,
  PastPsychiatricConditionOption,
  PsychiatricChiefComplaintOption,
} from './hihl-case-sheet.models';
import { HihlCaseSheetService } from './hihl-case-sheet.service';

const DURATION_UNITS: DurationUnit[] = ['Days', 'Weeks', 'Months', 'Years'];

/** Days-per-unit table used to validate a duration against the caller's age (legacy `ValidationUtils.validateDuration`). */
const DAYS_PER_UNIT: Record<DurationUnit, number> = {
  Hours: 1 / 24,
  Days: 1,
  Weeks: 7,
  Months: 30,
  Years: 365,
};

function toDays(duration: number | null, unit: DurationUnit | null): number | null {
  if (duration === null || unit === null) {
    return null;
  }
  return duration * DAYS_PER_UNIT[unit];
}

const DURATION_UNIT_KEYS: Record<DurationUnit, TranslationKey> = {
  Hours: 'hihl.durationUnit.Hours',
  Days: 'hihl.durationUnit.Days',
  Weeks: 'hihl.durationUnit.Weeks',
  Months: 'hihl.durationUnit.Months',
  Years: 'hihl.durationUnit.Years',
};

/**
 * Detailed HIHL (mental-health) case sheet for the Counsellor workspace — the
 * legacy `104-counsellor` second tab, ported field-for-field. Distinct from,
 * and saved independently of, the Counselling Sheet on tab 1.
 */
@Component({
  selector: 'app-hihl-case-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, ZardButtonComponent, ZardInputDirective, SnomedSearchComponent, HihlCaseSheetHistoryComponent],
  template: `
    <div class="flex flex-col gap-6" [formGroup]="form">
      <!-- Chief Complaints -->
      <section class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-foreground">{{ 'hihl.chiefComplaints' | translate: lang() }}</h2>
          <button z-button type="button" zType="outline" zSize="sm" (click)="toggleHistory()">
            {{ (historyOpen() ? 'hihl.hideHistory' : 'hihl.history') | translate: lang() }}
          </button>
        </div>

        <div formArrayName="complaints" class="flex flex-col gap-3">
          @for (row of complaints.controls; track row; let i = $index; let isLast = $last) {
            <div [formGroupName]="i" class="grid grid-cols-1 gap-3 rounded-md border border-border p-3 sm:grid-cols-4">
              <select
                formControlName="chiefComplaint"
                class="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option [ngValue]="null">{{ 'hihl.chiefComplaints' | translate: lang() }}</option>
                @for (item of chiefComplaintOptions(); track item.psychiatricChiefComplaintId) {
                  <option [ngValue]="item">{{ item.psychiatricChiefComplaintName }}</option>
                }
              </select>

              @if (isOtherComplaint(row)) {
                <div class="flex items-center gap-2">
                  <input
                    z-input
                    type="text"
                    maxlength="50"
                    [placeholder]="'hihl.otherChiefComplaint' | translate: lang()"
                    formControlName="otherCheifComplaint"
                  />
                  <app-snomed-search (selected)="onComplaintSnomedSelected($event, row)" />
                </div>
              }

              <input
                z-input
                type="number"
                maxlength="2"
                min="1"
                max="99"
                [placeholder]="'hihl.duration' | translate: lang()"
                formControlName="duration"
                (change)="validateDuration(row)"
              />

              <select formControlName="unitOfDuration" class="h-9 rounded-md border border-border bg-background px-3 text-sm" (change)="validateDuration(row)">
                <option [ngValue]="null">{{ 'hihl.unitOfDuration' | translate: lang() }}</option>
                @for (unit of durationUnits; track unit) {
                  <option [ngValue]="unit">{{ durationUnitLabel(unit) | translate: lang() }}</option>
                }
              </select>

              <textarea
                z-input
                rows="2"
                maxlength="300"
                class="sm:col-span-3"
                [placeholder]="'hihl.description' | translate: lang()"
                formControlName="description"
              ></textarea>

              <div class="flex items-center gap-2">
                @if (i !== 0 || row.dirty || row.touched) {
                  <button z-button type="button" zType="destructive" zSize="sm" (click)="removeComplaint(i)">
                    {{ 'hihl.remove' | translate: lang() }}
                  </button>
                }
                @if (isLast) {
                  <button
                    z-button
                    type="button"
                    zSize="sm"
                    [zDisabled]="!complaintRowValid(row)"
                    (click)="addComplaint()"
                  >
                    {{ 'hihl.add' | translate: lang() }}
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </section>

      <!-- Impact on Patient -->
      <section class="flex flex-col gap-4">
        <h2 class="text-base font-semibold text-foreground">{{ 'hihl.impactOnPatient' | translate: lang() }}</h2>
        <h3 class="text-sm font-semibold text-foreground">{{ 'hihl.biologicalFunctioning' | translate: lang() }}</h3>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <select formControlName="appetite" class="h-9 rounded-md border border-border bg-background px-3 text-sm">
            <option [ngValue]="null">{{ 'hihl.appetite' | translate: lang() }}</option>
            @for (item of masterData()?.m_104appetite ?? []; track item.appetiteName) {
              <option [ngValue]="item.appetiteName">{{ item.appetiteName }}</option>
            }
          </select>

          <select
            multiple
            formControlName="sleep"
            (change)="onSleepChange($event)"
            [attr.aria-label]="'hihl.sleep' | translate: lang()"
            class="h-24 rounded-md border border-border bg-background px-3 text-sm"
          >
            @for (item of masterData()?.m_104sleep ?? []; track item.slipName) {
              <option [value]="item.slipName" [disabled]="sleepOptionDisabled(item.slipName)">{{ item.slipName }}</option>
            }
          </select>

          <select formControlName="bowelValue" class="h-9 rounded-md border border-border bg-background px-3 text-sm">
            <option [ngValue]="null">{{ 'hihl.bowel' | translate: lang() }}</option>
            @for (item of masterData()?.m_104bowel ?? []; track item.bowelName) {
              <option [ngValue]="item.bowelName">{{ item.bowelName }}</option>
            }
          </select>

          <select formControlName="libidoValue" class="h-9 rounded-md border border-border bg-background px-3 text-sm">
            <option [ngValue]="null">{{ 'hihl.libido' | translate: lang() }}</option>
            @for (item of masterData()?.m_104libido ?? []; track item.libidoName) {
              <option [ngValue]="item.libidoName">{{ item.libidoName }}</option>
            }
          </select>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-foreground">{{ 'hihl.hygieneAndTakingCare' | translate: lang() }}</span>
            <div class="flex flex-wrap gap-3">
              @for (item of masterData()?.m_104hygieneselfcare ?? []; track item.hygieneseSelfCareName) {
                <label class="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="selectedValue"
                    formControlName="selectedValue"
                    [value]="item.hygieneseSelfCareName"
                  />
                  {{ item.hygieneseSelfCareName }}
                </label>
              }
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <span class="text-sm font-medium text-foreground">{{ 'hihl.bladder' | translate: lang() }}</span>
            <div class="flex flex-wrap gap-3">
              @for (item of masterData()?.m_104bladder ?? []; track item.bladderName) {
                <label class="flex items-center gap-1.5 text-sm">
                  <input type="radio" name="bladderStatus" formControlName="bladderStatus" [value]="item.bladderName" />
                  {{ item.bladderName }}
                </label>
              }
            </div>
          </div>
        </div>

        <h3 class="text-sm font-semibold text-foreground">{{ 'hihl.occupationalFunctioning' | translate: lang() }}</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select formControlName="goingToWork" class="h-9 rounded-md border border-border bg-background px-3 text-sm">
            <option [ngValue]="null">{{ 'hihl.goingToWork' | translate: lang() }}</option>
            @for (item of masterData()?.m_104regularworok ?? []; track item.regularWorkName) {
              <option [ngValue]="item.regularWorkName">{{ item.regularWorkName }}</option>
            }
          </select>

          <select formControlName="issueAtWork" class="h-9 rounded-md border border-border bg-background px-3 text-sm">
            <option [ngValue]="null">{{ 'hihl.issuesAtWorkplace' | translate: lang() }}</option>
            @for (item of masterData()?.m_104issuesatworkplace ?? []; track item.issueAtWorkPlaceName) {
              <option [ngValue]="item.issueAtWorkPlaceName">{{ item.issueAtWorkPlaceName }}</option>
            }
          </select>
        </div>

        <h3 class="text-sm font-semibold text-foreground">{{ 'hihl.socialFunctioning' | translate: lang() }}</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select formControlName="householdWork" class="h-9 rounded-md border border-border bg-background px-3 text-sm">
            <option [ngValue]="null">{{ 'hihl.doingOfHouseholdWork' | translate: lang() }}</option>
            @for (item of masterData()?.m_104householdwork ?? []; track item.houseHoldWorkName) {
              <option [ngValue]="item.houseHoldWorkName">{{ item.houseHoldWorkName }}</option>
            }
          </select>

          <select formControlName="familyUnity" class="h-9 rounded-md border border-border bg-background px-3 text-sm">
            <option [ngValue]="null">{{ 'hihl.gettingAlongWithFamily' | translate: lang() }}</option>
            @for (item of masterData()?.m_104gettingwithfamily ?? []; track item.gettingWithFamilyName) {
              <option [ngValue]="item.gettingWithFamilyName">{{ item.gettingWithFamilyName }}</option>
            }
          </select>

          <select
            multiple
            formControlName="precipitatingFactor"
            (change)="onPrecipitatingFactorChange($event)"
            [attr.aria-label]="'hihl.possiblePrecipitatingFactor' | translate: lang()"
            class="h-24 rounded-md border border-border bg-background px-3 text-sm"
          >
            @for (item of masterData()?.m_104precipitatingfactor ?? []; track item.precipitatingFactorName) {
              <option [value]="item.precipitatingFactorName" [disabled]="precipitatingFactorOptionDisabled(item.precipitatingFactorName)">
                {{ item.precipitatingFactorName }}
              </option>
            }
          </select>
        </div>

        @if (enableOtherPrepFactor()) {
          <textarea
            z-input
            rows="2"
            [placeholder]="'hihl.otherPrecipitatingFactor' | translate: lang()"
            formControlName="otherPossibleFactor"
          ></textarea>
        }

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <textarea
            z-input
            rows="3"
            maxlength="300"
            [placeholder]="'hihl.treatmentDetails' | translate: lang()"
            formControlName="treatmentDetails"
          ></textarea>
          <textarea
            z-input
            rows="3"
            maxlength="300"
            [placeholder]="'hihl.relationshipOfCurrentIllness' | translate: lang()"
            formControlName="relationOfCurrentIllness"
          ></textarea>
        </div>
      </section>

      <!-- Past History -->
      <section class="flex flex-col gap-3">
        <h2 class="text-base font-semibold text-foreground">{{ 'hihl.pastHistory' | translate: lang() }}</h2>

        <div formArrayName="pastPsychiatricCondition" class="flex flex-col gap-3">
          @for (row of pastPsychiatricConditions.controls; track row; let i = $index; let isLast = $last) {
            <div [formGroupName]="i" class="grid grid-cols-1 gap-3 rounded-md border border-border p-3 sm:grid-cols-4">
              <select formControlName="pastPsychiatricCondition" (change)="onPastPsychiatricConditionChange(i)" class="h-9 rounded-md border border-border bg-background px-3 text-sm">
                <option [ngValue]="null">{{ 'hihl.pastPsychiatricCondition' | translate: lang() }}</option>
                @for (item of pastPsychiatricConditionOptions(); track item.pastPsychiatricConditionId) {
                  <option [ngValue]="item">{{ item.pastPsychiatricConditionName }}</option>
                }
              </select>

              @if (isOtherPastPsychiatric(row)) {
                <textarea
                  z-input
                  rows="1"
                  [placeholder]="'hihl.otherPastPsychiatricCondition' | translate: lang()"
                  formControlName="otherPastPsychariticCondition"
                ></textarea>
              }

              <input
                z-input
                type="number"
                maxlength="2"
                min="1"
                max="99"
                [placeholder]="'hihl.duration' | translate: lang()"
                formControlName="duration"
                (change)="validateDuration(row)"
              />

              <select formControlName="unitsOfDuration" class="h-9 rounded-md border border-border bg-background px-3 text-sm" (change)="validateDuration(row)">
                <option [ngValue]="null">{{ 'hihl.unitOfDuration' | translate: lang() }}</option>
                @for (unit of durationUnits; track unit) {
                  <option [ngValue]="unit">{{ durationUnitLabel(unit) | translate: lang() }}</option>
                }
              </select>

              <select formControlName="typeOfTreatment" class="h-9 rounded-md border border-border bg-background px-3 text-sm">
                <option [ngValue]="null">{{ 'hihl.typeOfTreatment' | translate: lang() }}</option>
                @for (item of masterData()?.m_104treatmenttype ?? []; track item.treatmentTypeName) {
                  <option [ngValue]="item.treatmentTypeName">{{ item.treatmentTypeName }}</option>
                }
              </select>

              @if (row.value.typeOfTreatment === 'Medication') {
                <div class="flex flex-col gap-1 sm:col-span-2">
                  <input
                    z-input
                    type="text"
                    [placeholder]="'hihl.psychiatricDrugsDetails' | translate: lang()"
                    formControlName="psychiatricDrugsMedicationDetails"
                  />
                  <span class="text-xs text-muted-foreground">{{ 'hihl.drugDetailsHint' | translate: lang() }}</span>
                </div>
              }

              <select formControlName="course" class="h-9 rounded-md border border-border bg-background px-3 text-sm">
                <option [ngValue]="null">{{ 'hihl.course' | translate: lang() }}</option>
                @for (item of masterData()?.m_104course ?? []; track item.courseName) {
                  <option [ngValue]="item.courseName">{{ item.courseName }}</option>
                }
              </select>

              <select formControlName="progress" class="h-9 rounded-md border border-border bg-background px-3 text-sm">
                <option [ngValue]="null">{{ 'hihl.progress' | translate: lang() }}</option>
                @for (item of masterData()?.m_104progress ?? []; track item.progressName) {
                  <option [ngValue]="item.progressName">{{ item.progressName }}</option>
                }
              </select>

              <div class="flex items-center gap-2">
                @if (i !== 0 || row.dirty || row.touched) {
                  <button z-button type="button" zType="destructive" zSize="sm" (click)="removePastPsychiatricCondition(i)">
                    {{ 'hihl.remove' | translate: lang() }}
                  </button>
                }
                @if (isLast) {
                  <button
                    z-button
                    type="button"
                    zSize="sm"
                    [zDisabled]="!pastPsychiatricRowValid(row)"
                    (click)="addPastPsychiatricCondition()"
                  >
                    {{ 'hihl.add' | translate: lang() }}
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <div formArrayName="pastMedicalCondition" class="flex flex-col gap-3">
          @for (row of pastMedicalConditions.controls; track row; let i = $index; let isLast = $last) {
            <div [formGroupName]="i" class="grid grid-cols-1 gap-3 rounded-md border border-border p-3 sm:grid-cols-4">
              <select formControlName="pastMedicalCondition" (change)="onPastMedicalConditionChange(i)" class="h-9 rounded-md border border-border bg-background px-3 text-sm">
                <option [ngValue]="null">{{ 'hihl.pastMedicalCondition' | translate: lang() }}</option>
                @for (item of pastMedicalConditionOptions(); track item.pastMedicalConditionId) {
                  <option [ngValue]="item">{{ item.pastMedicalConditionName }}</option>
                }
              </select>

              @if (isOtherPastMedical(row)) {
                <input
                  z-input
                  type="text"
                  [placeholder]="'hihl.otherPastMedicalCondition' | translate: lang()"
                  formControlName="otherPastMedicalCondition"
                />
              }

              <input
                z-input
                type="number"
                maxlength="2"
                min="1"
                max="99"
                [placeholder]="'hihl.duration' | translate: lang()"
                formControlName="duration"
                (change)="validateDuration(row)"
              />

              <select formControlName="unitsOfDuration" class="h-9 rounded-md border border-border bg-background px-3 text-sm" (change)="validateDuration(row)">
                <option [ngValue]="null">{{ 'hihl.unitOfDuration' | translate: lang() }}</option>
                @for (unit of durationUnits; track unit) {
                  <option [ngValue]="unit">{{ durationUnitLabel(unit) | translate: lang() }}</option>
                }
              </select>

              <div class="flex items-center gap-2">
                @if (i !== 0 || row.dirty || row.touched) {
                  <button z-button type="button" zType="destructive" zSize="sm" (click)="removePastMedicalCondition(i)">
                    {{ 'hihl.remove' | translate: lang() }}
                  </button>
                }
                @if (isLast) {
                  <button
                    z-button
                    type="button"
                    zSize="sm"
                    [zDisabled]="!pastMedicalRowValid(row)"
                    (click)="addPastMedicalCondition()"
                  >
                    {{ 'hihl.add' | translate: lang() }}
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </section>

      <!-- Current Medication History -->
      <section class="flex flex-col gap-3">
        <h2 class="text-base font-semibold text-foreground">{{ 'hihl.currentMedicationHistory' | translate: lang() }}</h2>
        <div class="flex flex-col gap-1">
          <textarea
            z-input
            rows="2"
            [placeholder]="'hihl.currentDrugs' | translate: lang()"
            formControlName="currentDrugs"
          ></textarea>
          <span class="text-xs text-muted-foreground">{{ 'hihl.drugDetailsHint' | translate: lang() }}</span>
        </div>
      </section>

      <!-- Family History -->
      <section class="flex flex-col gap-3">
        <h2 class="text-base font-semibold text-foreground">{{ 'hihl.familyHistory' | translate: lang() }}</h2>
        <div formArrayName="familyDiseaseList" class="flex flex-col gap-3">
          @for (row of familyDiseaseList.controls; track row; let i = $index; let isLast = $last) {
            <div [formGroupName]="i" class="grid grid-cols-1 gap-3 rounded-md border border-border p-3 sm:grid-cols-3">
              <select formControlName="familyCondition" (change)="onFamilyConditionChange(i)" class="h-9 rounded-md border border-border bg-background px-3 text-sm">
                <option [ngValue]="null">{{ 'hihl.familyCondition' | translate: lang() }}</option>
                @for (item of familyConditionOptions(); track item.familyConditionId) {
                  <option [ngValue]="item">{{ item.familyConditionName }}</option>
                }
              </select>

              <select
                multiple
                formControlName="familyMembers"
                [attr.disabled]="familyMembersDisabled(row) ? true : null"
                [attr.aria-label]="'hihl.familyMembers' | translate: lang()"
                class="h-24 rounded-md border border-border bg-background px-3 text-sm"
              >
                @for (member of masterData()?.m_104relationship ?? []; track member.relationShipName) {
                  <option [value]="member.relationShipName">{{ member.relationShipName }}</option>
                }
              </select>

              <div class="flex items-center gap-2">
                @if (i !== 0 || row.dirty || row.touched) {
                  <button z-button type="button" zType="destructive" zSize="sm" (click)="removeFamilyDisease(i)">
                    {{ 'hihl.remove' | translate: lang() }}
                  </button>
                }
                @if (isLast) {
                  <button
                    z-button
                    type="button"
                    zSize="sm"
                    [zDisabled]="!familyDiseaseRowValid(row)"
                    (click)="addFamilyDisease()"
                  >
                    {{ 'hihl.add' | translate: lang() }}
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </section>

      <!-- Personal / Social / Summary -->
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <textarea z-input rows="4" [placeholder]="'hihl.personalAndSocialHistory' | translate: lang()" formControlName="personalSocialHistory"></textarea>
        <textarea z-input rows="4" maxlength="300" [placeholder]="'hihl.mentalStatusExamination' | translate: lang()" formControlName="mentalExamination"></textarea>
        <textarea z-input rows="4" maxlength="300" [placeholder]="'hihl.summary' | translate: lang()" formControlName="summary"></textarea>
      </section>

      <div class="flex justify-end">
        <button z-button type="button" [zLoading]="saving()" [zDisabled]="saving() || !form.touched" (click)="save()">
          {{ 'hihl.save' | translate: lang() }}
        </button>
      </div>
    </div>

    @if (historyOpen()) {
      <app-hihl-case-sheet-history [rows]="historyRows()" [loading]="historyLoading()" />
    }
  `,
})
export class HihlCaseSheetComponent {
  private readonly fb = inject(FormBuilder);
  private readonly hihlService = inject(HihlCaseSheetService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly lang = this.i18n.language;
  readonly durationUnits = DURATION_UNITS;

  durationUnitLabel(unit: DurationUnit): TranslationKey {
    return DURATION_UNIT_KEYS[unit];
  }

  readonly beneficiaryId = input<number | null>(null);
  readonly callId = input<string | null>(null);

  readonly masterData = signal<HihlMasterData | null>(null);
  readonly saving = signal(false);

  readonly historyOpen = signal(false);
  readonly historyLoading = signal(false);
  readonly historyRows = signal<HihlHistoryRow[]>([]);

  readonly disableSleepValue = signal<boolean | null>(null);
  readonly disableFactorValue = signal<boolean | null>(null);

  readonly form = this.fb.group({
    appetite: this.fb.control<string | null>(null),
    sleep: this.fb.control<string[]>([]),
    selectedValue: this.fb.control<string | null>(null),
    bowelValue: this.fb.control<string | null>(null),
    libidoValue: this.fb.control<string | null>(null),
    goingToWork: this.fb.control<string | null>(null),
    issueAtWork: this.fb.control<string | null>(null),
    householdWork: this.fb.control<string | null>(null),
    familyUnity: this.fb.control<string | null>(null),
    treatmentDetails: this.fb.control<string | null>(null),
    precipitatingFactor: this.fb.control<string[]>([]),
    otherPossibleFactor: this.fb.control<string | null>(null),
    relationOfCurrentIllness: this.fb.control<string | null>(null),
    currentDrugs: this.fb.control<string | null>(null),
    personalSocialHistory: this.fb.control<string | null>(null),
    mentalExamination: this.fb.control<string | null>(null),
    bladderStatus: this.fb.control<string | null>(null),
    summary: this.fb.control<string | null>(null),
    complaints: this.fb.array([this.createComplaintRow()]),
    pastPsychiatricCondition: this.fb.array([this.createPastPsychiatricConditionRow()]),
    pastMedicalCondition: this.fb.array([this.createPastMedicalConditionRow()]),
    familyDiseaseList: this.fb.array([this.createFamilyDiseaseRow()]),
  });

  get complaints(): FormArray {
    return this.form.controls.complaints;
  }

  get pastPsychiatricConditions(): FormArray {
    return this.form.controls.pastPsychiatricCondition;
  }

  get pastMedicalConditions(): FormArray {
    return this.form.controls.pastMedicalCondition;
  }

  get familyDiseaseList(): FormArray {
    return this.form.controls.familyDiseaseList;
  }

  /** Chief-complaint options, excluding rows already picked in other complaint slots. */
  chiefComplaintOptions(): PsychiatricChiefComplaintOption[] {
    const all = this.masterData()?.psychiatricChiefComplaints ?? [];
    const picked = new Set(
      this.complaints.controls
        .map((c) => (c.value.chiefComplaint as PsychiatricChiefComplaintOption | null)?.psychiatricChiefComplaintId)
        .filter((id): id is number => id !== undefined && id !== null),
    );
    return all.filter((item) => !picked.has(item.psychiatricChiefComplaintId));
  }

  pastPsychiatricConditionOptions(): PastPsychiatricConditionOption[] {
    const all = this.masterData()?.m_104pastpsychiatriccondition ?? [];
    const picked = new Set(
      this.pastPsychiatricConditions.controls
        .map((c) => (c.value.pastPsychiatricCondition as PastPsychiatricConditionOption | null)?.pastPsychiatricConditionId)
        .filter((id): id is number => id !== undefined && id !== null),
    );
    return all.filter((item) => !picked.has(item.pastPsychiatricConditionId));
  }

  pastMedicalConditionOptions(): PastMedicalConditionOption[] {
    const all = this.masterData()?.m_104pastmedicalcondition ?? [];
    const picked = new Set(
      this.pastMedicalConditions.controls
        .map((c) => (c.value.pastMedicalCondition as PastMedicalConditionOption | null)?.pastMedicalConditionId)
        .filter((id): id is number => id !== undefined && id !== null),
    );
    return all.filter((item) => !picked.has(item.pastMedicalConditionId));
  }

  familyConditionOptions(): FamilyConditionOption[] {
    const all = this.masterData()?.m_104familycondition ?? [];
    const picked = new Set(
      this.familyDiseaseList.controls
        .map((c) => (c.value.familyCondition as FamilyConditionOption | null)?.familyConditionId)
        .filter((id): id is number => id !== undefined && id !== null),
    );
    return all.filter((item) => !picked.has(item.familyConditionId));
  }

  isOtherComplaint(row: AbstractControl): boolean {
    return (row.value.chiefComplaint as PsychiatricChiefComplaintOption | null)?.psychiatricChiefComplaintName === 'Other';
  }

  isOtherPastPsychiatric(row: AbstractControl): boolean {
    return (row.value.pastPsychiatricCondition as PastPsychiatricConditionOption | null)?.pastPsychiatricConditionName === 'Other';
  }

  isOtherPastMedical(row: AbstractControl): boolean {
    return (row.value.pastMedicalCondition as PastMedicalConditionOption | null)?.pastMedicalConditionName === 'Other';
  }

  complaintRowValid(row: AbstractControl): boolean {
    const v = row.value;
    return !!(v.chiefComplaint && v.duration && v.unitOfDuration);
  }

  pastPsychiatricRowValid(row: AbstractControl): boolean {
    const v = row.value;
    return !!(v.pastPsychiatricCondition && v.duration && v.unitsOfDuration);
  }

  pastMedicalRowValid(row: AbstractControl): boolean {
    const v = row.value;
    return !!(v.pastMedicalCondition && v.duration && v.unitsOfDuration);
  }

  familyDiseaseRowValid(row: AbstractControl): boolean {
    const v = row.value;
    return !!(v.familyCondition && v.familyMembers && (v.familyMembers as string[]).length > 0);
  }

  /** Family Members is disabled once the chosen condition is None/Nil (legacy `disableFormControl`). */
  familyMembersDisabled(row: AbstractControl): boolean {
    const condition = row.value.familyCondition as FamilyConditionOption | null;
    if (!condition) {
      return true;
    }
    const name = condition.familyConditionName?.toLowerCase();
    return name === 'none' || name === 'nil';
  }

  sleepOptionDisabled(name: string): boolean {
    const disable = this.disableSleepValue();
    if (disable === null) {
      return false;
    }
    const isNormal = name === 'Normal';
    return (isNormal && !disable) || (!isNormal && disable);
  }

  precipitatingFactorOptionDisabled(name: string): boolean {
    const disable = this.disableFactorValue();
    if (disable === null) {
      return false;
    }
    const isNone = name === 'None';
    return (isNone && !disable) || (!isNone && disable);
  }

  enableOtherPrepFactor(): boolean {
    return (this.form.controls.precipitatingFactor.value ?? []).includes('Other');
  }

  onSleepChange(event: Event): void {
    const values = Array.from((event.target as HTMLSelectElement).selectedOptions).map((o) => o.value);
    this.form.controls.sleep.setValue(values);
    this.disableSleepValue.set(values.length === 0 ? null : values.includes('Normal'));
  }

  onPrecipitatingFactorChange(event: Event): void {
    const values = Array.from((event.target as HTMLSelectElement).selectedOptions).map((o) => o.value);
    this.form.controls.precipitatingFactor.setValue(values);
    this.disableFactorValue.set(values.length === 0 ? null : values.includes('None'));
  }

  onComplaintSnomedSelected(term: SnomedTerm, row: AbstractControl): void {
    row.patchValue({ snomedCtCode: term.conceptID, otherCheifComplaint: term.term });
    row.markAsDirty();
  }

  onPastPsychiatricConditionChange(index: number): void {
    const row = this.pastPsychiatricConditions.at(index);
    const value = (row.value.pastPsychiatricCondition as PastPsychiatricConditionOption | null)?.pastPsychiatricConditionName;
    if (value === 'None') {
      this.pastPsychiatricConditions.reset();
    }
  }

  onPastMedicalConditionChange(index: number): void {
    const row = this.pastMedicalConditions.at(index);
    const value = (row.value.pastMedicalCondition as PastMedicalConditionOption | null)?.pastMedicalConditionName;
    if (value === 'None') {
      this.pastMedicalConditions.reset();
    }
  }

  onFamilyConditionChange(index: number): void {
    const row = this.familyDiseaseList.at(index);
    row.patchValue({ familyMembers: [] });
  }

  /** Reject a duration exceeding the caller's age, matching legacy's day-based comparison table. */
  validateDuration(row: AbstractControl): void {
    const duration = row.value.duration as number | null;
    const unit = (row.value.unitOfDuration ?? row.value.unitsOfDuration) as DurationUnit | null;
    if (duration === null || unit === null) {
      return;
    }
    const age = this.callStore.demographics()?.age ?? null;
    if (age === null) {
      return;
    }
    const ageDays = age * DAYS_PER_UNIT.Years;
    const durationDays = toDays(duration, unit);
    if (durationDays !== null && durationDays > ageDays) {
      this.confirmDialog
        .alert({
          title: this.i18n.instant('dashboard.dialog.info'),
          message: this.i18n.instant('hihl.durationGreaterThanAge'),
          okText: this.i18n.instant('dashboard.dialog.ok'),
        })
        .subscribe();
      row.patchValue({ duration: null, unitOfDuration: null, unitsOfDuration: null });
    }
  }

  addComplaint(): void {
    this.complaints.push(this.createComplaintRow());
  }

  removeComplaint(index: number): void {
    this.confirmRemove(() => {
      if (this.complaints.length === 1) {
        this.complaints.at(index).reset();
      } else {
        this.complaints.removeAt(index);
      }
    });
  }

  addPastPsychiatricCondition(): void {
    this.pastPsychiatricConditions.push(this.createPastPsychiatricConditionRow());
  }

  removePastPsychiatricCondition(index: number): void {
    this.confirmRemove(() => {
      if (this.pastPsychiatricConditions.length === 1) {
        this.pastPsychiatricConditions.at(index).reset();
      } else {
        this.pastPsychiatricConditions.removeAt(index);
      }
    });
  }

  addPastMedicalCondition(): void {
    this.pastMedicalConditions.push(this.createPastMedicalConditionRow());
  }

  removePastMedicalCondition(index: number): void {
    this.confirmRemove(() => {
      if (this.pastMedicalConditions.length === 1) {
        this.pastMedicalConditions.at(index).reset();
      } else {
        this.pastMedicalConditions.removeAt(index);
      }
    });
  }

  addFamilyDisease(): void {
    this.familyDiseaseList.push(this.createFamilyDiseaseRow());
  }

  removeFamilyDisease(index: number): void {
    this.confirmRemove(() => {
      if (this.familyDiseaseList.length === 1) {
        this.familyDiseaseList.at(index).reset();
      } else {
        this.familyDiseaseList.removeAt(index);
      }
    });
  }

  private confirmRemove(onConfirm: () => void): void {
    this.confirmDialog
      .confirm({
        title: this.i18n.instant('dashboard.dialog.info'),
        message: this.i18n.instant('hihl.confirmRemove'),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          onConfirm();
        }
      });
  }

  toggleHistory(): void {
    const next = !this.historyOpen();
    this.historyOpen.set(next);
    if (next) {
      this.loadHistory();
    }
  }

  save(): void {
    const beneficiaryRegID = this.beneficiaryId();
    if (beneficiaryRegID === null || this.saving()) {
      return;
    }

    const value = this.form.getRawValue();

    const chiefComplaints = this.complaints.controls
      .map((c) => {
        const complaint = c.value.chiefComplaint as PsychiatricChiefComplaintOption | null;
        if (!complaint) {
          return null;
        }
        const isOther = complaint.psychiatricChiefComplaintName === 'Other';
        return {
          chiefComplaintID: isOther ? (c.value.snomedCtCode ?? null) : complaint.psychiatricChiefComplaintId,
          chiefComplaint: isOther ? (c.value.otherCheifComplaint ?? null) : complaint.psychiatricChiefComplaintName,
          description: c.value.description ?? null,
          duration: c.value.duration ?? null,
          unitOfDuration: c.value.unitOfDuration ?? null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const pastPsychiatricConditions = this.pastPsychiatricConditions.controls
      .map((c) => {
        const condition = c.value.pastPsychiatricCondition as PastPsychiatricConditionOption | null;
        if (!condition) {
          return null;
        }
        return {
          pastPsychiatricCondition: condition.pastPsychiatricConditionName,
          pastPsychiatricConditionID: condition.pastPsychiatricConditionId,
          mediciationType: c.value.medicationType ?? null,
          psychiatricDrugsMedicationDetails: c.value.psychiatricDrugsMedicationDetails ?? null,
          duration: c.value.duration ?? null,
          unitOfDuration: c.value.unitsOfDuration ?? null,
          progress: c.value.progress ?? null,
          course: c.value.course ?? null,
          typeOfTreatment: c.value.typeOfTreatment ?? null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const pastMedicalConditions = this.pastMedicalConditions.controls
      .map((c) => {
        const condition = c.value.pastMedicalCondition as PastMedicalConditionOption | null;
        if (!condition) {
          return null;
        }
        return {
          pastMedicalCondition: condition.pastMedicalConditionName,
          pastMedicalConditionID: condition.pastMedicalConditionId,
          otherPastMedicalCondition: c.value.otherPastMedicalCondition ?? null,
          duration: c.value.duration ?? null,
          unitOfDuration: c.value.unitsOfDuration ?? null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const conditionInFamilyList = this.familyDiseaseList.controls
      .map((c) => {
        const condition = c.value.familyCondition as FamilyConditionOption | null;
        if (!condition) {
          return null;
        }
        return {
          familyCondition: condition.familyConditionName,
          otherDiseaseType: null,
          familyMembers: (c.value.familyMembers as string[] | null) ?? [],
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    const request: HihlSaveRequest = {
      chiefComplaints: chiefComplaints.length > 0 ? chiefComplaints : null,
      biologicalFunctioning: {
        appetite: value.appetite,
        sleep: value.sleep,
        hygieneAndTakingCare: value.selectedValue,
        bladder: value.bladderStatus,
        bowel: value.bowelValue,
        sexualLibido: value.libidoValue,
      },
      occupationalFunctioning: {
        goingToWork: value.goingToWork,
        issuesAtWorkplace: value.issueAtWork,
      },
      socialFunctioning: {
        householdWork: value.householdWork,
        gettingAlong: value.familyUnity,
      },
      treatmentDetails: value.treatmentDetails,
      precipitatingFactors: value.precipitatingFactor,
      concurrentMedicalCondition: value.relationOfCurrentIllness,
      pastHistory: {
        pastPsychiatricConditions: pastPsychiatricConditions.length > 0 ? pastPsychiatricConditions : null,
        pastMedicalConditions: pastMedicalConditions.length > 0 ? pastMedicalConditions : null,
      },
      currentDrugsMedication: value.currentDrugs,
      conditionInFamilyList: conditionInFamilyList.length > 0 ? conditionInFamilyList : null,
      personalAndSocialHistory: value.personalSocialHistory,
      mentalStatusExamination: value.mentalExamination,
      summary: value.summary,
      beneficiaryRegID,
      benCallID: this.callId(),
      providerServiceMapID: this.authStore.currentRole()?.providerServiceMapID ?? null,
      createdBy: this.authStore.user()?.userName ?? '',
    };

    this.saving.set(true);
    this.hihlService.saveCaseSheet(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.confirmDialog
          .alert({
            title: this.i18n.instant('dashboard.dialog.info'),
            message: this.i18n.instant('hihl.saveSuccess'),
            okText: this.i18n.instant('dashboard.dialog.ok'),
          })
          .subscribe();
      },
      error: () => {
        this.saving.set(false);
        this.confirmDialog
          .alert({
            title: this.i18n.instant('dashboard.dialog.error'),
            message: this.i18n.instant('hihl.saveError'),
            okText: this.i18n.instant('dashboard.dialog.ok'),
          })
          .subscribe();
      },
    });
  }

  private loadHistory(): void {
    const beneficiaryRegID = this.beneficiaryId();
    if (beneficiaryRegID === null) {
      return;
    }
    this.historyLoading.set(true);
    this.hihlService.getHistory(beneficiaryRegID).subscribe({
      next: (rows) => {
        this.historyLoading.set(false);
        this.historyRows.set(rows);
      },
      error: () => {
        this.historyLoading.set(false);
        this.historyRows.set([]);
      },
    });
  }

  private createComplaintRow(): FormGroup {
    return this.fb.group({
      chiefComplaint: this.fb.control<PsychiatricChiefComplaintOption | null>(null),
      snomedCtCode: this.fb.control<string | null>(null),
      duration: this.fb.control<number | null>(null),
      unitOfDuration: this.fb.control<DurationUnit | null>(null),
      description: this.fb.control<string | null>(null),
      otherCheifComplaint: this.fb.control<string | null>(null),
    });
  }

  private createPastPsychiatricConditionRow(): FormGroup {
    return this.fb.group({
      pastPsychiatricCondition: this.fb.control<PastPsychiatricConditionOption | null>(null),
      duration: this.fb.control<number | null>(null),
      unitsOfDuration: this.fb.control<DurationUnit | null>(null),
      typeOfTreatment: this.fb.control<string | null>(null),
      medicationType: this.fb.control<string | null>(null),
      psychiatricDrugsMedicationDetails: this.fb.control<string | null>(null),
      progress: this.fb.control<string | null>(null),
      course: this.fb.control<string | null>(null),
      otherPastPsychariticCondition: this.fb.control<string | null>(null),
    });
  }

  private createPastMedicalConditionRow(): FormGroup {
    return this.fb.group({
      pastMedicalCondition: this.fb.control<PastMedicalConditionOption | null>(null),
      otherPastMedicalCondition: this.fb.control<string | null>(null),
      duration: this.fb.control<number | null>(null),
      unitsOfDuration: this.fb.control<DurationUnit | null>(null),
    });
  }

  private createFamilyDiseaseRow(): FormGroup {
    return this.fb.group({
      familyCondition: this.fb.control<FamilyConditionOption | null>(null),
      familyMembers: this.fb.control<string[]>([]),
    });
  }

  constructor() {
    this.hihlService.getMasterData().subscribe({
      next: (data) => this.masterData.set(data),
      error: () => this.masterData.set(null),
    });

    effect(() => {
      const id = this.beneficiaryId();
      if (id !== null && this.historyOpen()) {
        this.loadHistory();
      }
    });
  }
}
