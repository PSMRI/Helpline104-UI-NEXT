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

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/locales';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CallStore } from '../../call.store';
import { CasesheetHistoryMctsComponent } from '../../casesheet-history/casesheet-history-mcts.component';
import { CasesheetHistoryMmuComponent } from '../../casesheet-history/casesheet-history-mmu.component';
import { MmuVisitRow } from '../../casesheet-history/other-helpline.models';
import { CdssFlowService } from '../../case-sheet/cdss-flow.service';
import { CdssService } from '../../case-sheet/cdss.service';
import type { CdssGender, CdssPatientContext, CdssSelection } from '../../case-sheet/cdss.models';
import { DiseaseSummaryDetail } from '../../case-sheet/disease-summary.models';
import { SNOMED_NO_MATCH, SnomedService } from '../../case-sheet/snomed.service';
import { PrescriptionComponent } from '../../case-sheet/prescription.component';
import { PrescriptionRecord } from '../../case-sheet/prescription.models';
import { PrescriptionService } from '../../case-sheet/prescription.service';
import { ViewDiseaseSummaryDetailsComponent } from '../../case-sheet/view-disease-summary-details.component';
import { SERVICE_104, collectServiceScreens } from '../../role-workspace/role-screens.util';
import {
  AvailableDisease,
  CaseSheetRequest,
  CovidDoseType,
  CovidVaccineType,
  GuidelineCategory,
  GuidelineDetail,
  GuidelineSubCategory,
  PresentCaseSheet,
  SaveCovidVaccinationRequest,
} from '../hao.models';
import { HaoService } from '../hao.service';
import { HihlCaseSheetHistoryComponent } from '../../counsellor/hihl-case-sheet-history.component';
import { HihlCaseSheetService } from '../../counsellor/hihl-case-sheet.service';
import type { HihlHistoryRow } from '../../counsellor/hihl-case-sheet.models';
import { CaseSheetHistoryComponent } from './case-sheet-history.component';

const MO_FEATURE_CODE = 'MO';

const RECENT_PRESCRIPTION_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;

/** History tabs shown in the case-sheet history section. */
type HistoryTab = 'own' | 'mcts' | 'mmu' | 'tm' | 'hihl';
type ChiefComplaintMode = 'complaint' | 'summary';
type VaccineStatus = 'YES' | 'NO';
type WellbeingOrInfo = '1' | '2';

function toCdssGender(genderName: string | null | undefined): CdssGender | null {
  switch (genderName?.trim().charAt(0).toUpperCase()) {
    case 'M':
      return 'M';
    case 'F':
      return 'F';
    case 'T':
      return 'T';
    default:
      return null;
  }
}

const MIN_VACCINE_AGE = 12;

@Component({
  selector: 'app-hao-case-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ZardButtonComponent,
    ZardInputDirective,
    CaseSheetHistoryComponent,
    HihlCaseSheetHistoryComponent,
    NgIcon,
    CasesheetHistoryMctsComponent,
    CasesheetHistoryMmuComponent,
    ViewDiseaseSummaryDetailsComponent,
    PrescriptionComponent,
  ],
  viewProviders: [provideIcons({ lucideSearch })],
  template: `
    <h2 class="mb-2 text-base font-semibold text-foreground">
      {{ (isCo() ? 'hao.caseSheet.counsellingSheet' : 'hao.caseSheet.caseSheet') | translate: lang() }}
    </h2>

    <div class="mb-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-foreground">
        <span class="font-semibold">{{ callerName() || '—' }}</span>
        <span>{{ callStore.cli() || '—' }}</span>
        @if (patientGenderName(); as g) {
          <span>{{ g }}</span>
        }
        @if (patientAge(); as a) {
          <span>{{ 'hao.caseSheet.age' | translate: lang() }}: {{ a }}</span>
        }
      </div>
    </div>

    <form class="flex flex-col gap-5" [formGroup]="form" (ngSubmit)="save()" novalidate>
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium">{{ 'hao.caseSheet.patientIs' | translate: lang() }}</label>
        <div class="flex gap-4 text-sm">
          <label class="flex items-center gap-2">
            <input type="radio" formControlName="isPatientOther" [value]="false" />
            {{ 'hao.caseSheet.patientIsSelf' | translate: lang() }}
          </label>
          <label class="flex items-center gap-2">
            <input type="radio" formControlName="isPatientOther" [value]="true" />
            {{ 'hao.caseSheet.patientIsOther' | translate: lang() }}
          </label>
        </div>
      </div>

      @if (form.controls.isPatientOther.value) {
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" for="hao-cs-first-name">
              {{ 'hao.caseSheet.firstName' | translate: lang() }}
              <span class="text-destructive" aria-hidden="true">*</span>
            </label>
            <input z-input id="hao-cs-first-name" type="text" maxlength="50" formControlName="patientFirstName" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" for="hao-cs-last-name">
              {{ 'hao.caseSheet.lastName' | translate: lang() }}
            </label>
            <input z-input id="hao-cs-last-name" type="text" maxlength="50" formControlName="patientLastName" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" for="hao-cs-gender">
              {{ 'hao.caseSheet.gender' | translate: lang() }}
              <span class="text-destructive" aria-hidden="true">*</span>
            </label>
            <select
              id="hao-cs-gender"
              formControlName="patientGenderID"
              class="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option [ngValue]="null">{{ 'hao.caseSheet.selectGender' | translate: lang() }}</option>
              <option value="M">{{ 'hao.caseSheet.genderMale' | translate: lang() }}</option>
              <option value="F">{{ 'hao.caseSheet.genderFemale' | translate: lang() }}</option>
              <option value="T">{{ 'hao.caseSheet.genderTransgender' | translate: lang() }}</option>
            </select>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" for="hao-cs-age">
              {{ 'hao.caseSheet.age' | translate: lang() }}
              <span class="text-destructive" aria-hidden="true">*</span>
            </label>
            <input z-input id="hao-cs-age" type="number" min="1" max="120" formControlName="patientAgeValue" />
          </div>
        </div>
        @if (isHao()) {
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium" for="hao-cs-age-unit">
                {{ 'hao.caseSheet.ageUnit' | translate: lang() }}
              </label>
              <select
                id="hao-cs-age-unit"
                formControlName="patientAgeUnit"
                class="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="days">{{ 'hao.caseSheet.ageUnitDays' | translate: lang() }}</option>
                <option value="months">{{ 'hao.caseSheet.ageUnitMonths' | translate: lang() }}</option>
                <option value="years">{{ 'hao.caseSheet.ageUnitYears' | translate: lang() }}</option>
              </select>
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium" for="hao-cs-dob">
                {{ 'hao.caseSheet.dob' | translate: lang() }}
              </label>
              <input z-input id="hao-cs-dob" type="date" formControlName="patientDOB" />
            </div>
          </div>
        }
      }

      @if (isCo()) {
        <p class="text-xs text-muted-foreground">{{ 'hao.caseSheet.categoryGuidelineNote' | translate: lang() }}</p>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div class="flex gap-4 text-sm">
            <label class="flex items-center gap-2">
              <input type="radio" formControlName="wellbeingOrInfo" value="1" />
              {{ 'hao.caseSheet.wellBeing' | translate: lang() }}
            </label>
            <label class="flex items-center gap-2">
              <input type="radio" formControlName="wellbeingOrInfo" value="2" />
              {{ 'hao.caseSheet.information' | translate: lang() }}
            </label>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" for="hao-cs-category">
              {{ 'hao.caseSheet.category' | translate: lang() }}
              <span class="text-destructive" aria-hidden="true">*</span>
            </label>
            <select
              id="hao-cs-category"
              formControlName="categoryID"
              class="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option [ngValue]="null">{{ 'hao.caseSheet.selectCategory' | translate: lang() }}</option>
              @for (c of filteredCategories(); track c.categoryID) {
                <option [ngValue]="c.categoryID">{{ c.categoryName }}</option>
              }
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" for="hao-cs-subcategory">
              {{ 'hao.caseSheet.subCategory' | translate: lang() }}
            </label>
            <select
              id="hao-cs-subcategory"
              formControlName="subCategoryID"
              class="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option [ngValue]="null">{{ 'hao.caseSheet.selectSubCategory' | translate: lang() }}</option>
              @for (sc of subCategories(); track sc.subCategoryID) {
                <option [ngValue]="sc.subCategoryID">{{ sc.subCategoryName }}</option>
              }
            </select>
          </div>

          <button
            z-button
            type="button"
            zType="outline"
            zSize="sm"
            [zLoading]="loadingGuidelines()"
            [zDisabled]="form.controls.categoryID.value === null || loadingGuidelines()"
            [attr.aria-label]="'hao.caseSheet.getGuidelines' | translate: lang()"
            (click)="searchGuidelines()"
          >
            <ng-icon name="lucideSearch" size="16" aria-hidden="true" />
          </button>
        </div>

        @if (guidelineResults(); as results) {
          <div class="rounded-md border border-dashed border-border p-3 text-sm">
            @if (results.length > 0 && anyGuidelineFile(results)) {
              <ul class="flex flex-col gap-1">
                @for (detail of results; track $index) {
                  @if (detail.subCatFilePath) {
                    <li>
                      <a
                        [href]="detail.subCatFilePath"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-primary underline-offset-2 hover:underline"
                      >
                        {{ detail.subCategoryName }}@if (detail.fileManger?.[0]?.fileName) {
                          : {{ detail.fileManger?.[0]?.fileName }}
                        }
                      </a>
                    </li>
                  }
                }
              </ul>
            } @else {
              <span class="text-muted-foreground">{{ 'hao.caseSheet.noDocumentAvailable' | translate: lang() }}</span>
            }
          </div>
        }
      }

      @if (isHaoOrMo()) {
        <div class="flex gap-4 text-sm">
          <label class="flex items-center gap-2">
            <input type="radio" formControlName="chiefComplaintMode" value="complaint" />
            {{ 'hao.caseSheet.presentChiefComplaint' | translate: lang() }}
          </label>
          <label class="flex items-center gap-2">
            <input type="radio" formControlName="chiefComplaintMode" value="summary" />
            {{ 'hao.caseSheet.diseasesSummary' | translate: lang() }}
          </label>
        </div>
      }

      @if (form.controls.chiefComplaintMode.value === 'complaint') {
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium" for="hao-cs-complaints">
            {{ 'hao.caseSheet.chiefComplaints' | translate: lang() }}
            <span class="text-destructive" aria-hidden="true">*</span>
          </label>
          @if (isCo()) {
            <textarea
              z-input
              id="hao-cs-complaints"
              rows="3"
              maxlength="800"
              formControlName="chiefComplaints"
              [attr.aria-invalid]="isInvalid('chiefComplaints') || null"
              [attr.aria-describedby]="isInvalid('chiefComplaints') ? 'hao-cs-complaints-error' : null"
            ></textarea>
          } @else {
            <!--
              Legacy renders this field as an <md2-autocomplete> over the
              CDSS chief-complaint list (case-sheet.component.html:357-378):
              typing filters the list, and picking an entry fires
              invokeDialog() straight into the Symptoms popup. The dropdown
              below reproduces that; there is deliberately no second
              SNOMED search box, which legacy never had.
            -->
            <div class="relative">
              <textarea
                z-input
                id="hao-cs-complaints"
                rows="3"
                maxlength="2000"
                formControlName="chiefComplaints"
                role="combobox"
                autocomplete="off"
                [attr.aria-expanded]="complaintDropdownOpen()"
                aria-controls="hao-cs-complaint-options"
                [attr.aria-invalid]="isInvalid('chiefComplaints') || null"
                [attr.aria-describedby]="isInvalid('chiefComplaints') ? 'hao-cs-complaints-error' : null"
                [placeholder]="'hao.caseSheet.chiefComplaintsPlaceholder' | translate: lang()"
                [title]="complaintSctid()"
                (input)="onComplaintInput()"
                (focus)="onComplaintInput()"
                (keydown.escape)="closeComplaintDropdown()"
                (blur)="onComplaintBlur()"
              ></textarea>
              @if (complaintDropdownOpen() && filteredComplaints().length > 0) {
                <ul
                  id="hao-cs-complaint-options"
                  role="listbox"
                  class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-md"
                >
                  @for (option of filteredComplaints(); track option) {
                    <li role="option" [attr.aria-selected]="false">
                      <button
                        type="button"
                        class="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:outline-none"
                        (mousedown)="selectComplaint(option)"
                      >
                        {{ option }}
                      </button>
                    </li>
                  }
                </ul>
              }
            </div>
            @if (complaintSctid()) {
              <p class="text-xs text-muted-foreground">{{ complaintSctid() }}</p>
            }
          }
          @if (isInvalid('chiefComplaints')) {
            <p id="hao-cs-complaints-error" class="text-xs font-medium text-destructive" role="alert">
              @if (form.controls.chiefComplaints.hasError('maxlength')) {
                {{ 'hao.caseSheet.chiefComplaintsTooLong' | translate: lang() }}
              } @else {
                {{ 'hao.caseSheet.chiefComplaintsRequired' | translate: lang() }}
              }
            </p>
          }
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium" for="hao-cs-diagnosis">
            {{ 'hao.caseSheet.provisionalDiagnosis' | translate: lang() }}
            @if (isCo()) {
              <span class="text-destructive" aria-hidden="true">*</span>
            }
          </label>
          <textarea
            z-input
            id="hao-cs-diagnosis"
            rows="2"
            maxlength="100"
            [readonly]="!isCo()"
            formControlName="provisionalDiagnosis"
            [attr.aria-invalid]="isInvalid('provisionalDiagnosis') || null"
            [placeholder]="'hao.caseSheet.provisionalDiagnosisPlaceholder' | translate: lang()"
          ></textarea>
          @if (isInvalid('provisionalDiagnosis')) {
            <p class="text-xs font-medium text-destructive" role="alert">
              @if (form.controls.provisionalDiagnosis.hasError('minlength')) {
                {{ 'hao.caseSheet.provisionalDiagnosisTooShort' | translate: lang() }}
              } @else {
                {{ 'hao.caseSheet.provisionalDiagnosisRequired' | translate: lang() }}
              }
            </p>
          }
        </div>

        @if (isCo()) {
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" for="hao-cs-risk-level">
              {{ 'hao.caseSheet.riskLevel' | translate: lang() }}
            </label>
            <select
              id="hao-cs-risk-level"
              formControlName="riskLevel"
              class="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option [ngValue]="null">{{ 'hao.caseSheet.riskLevel' | translate: lang() }}</option>
              <option value="Mild">{{ 'hao.caseSheet.riskLevelMild' | translate: lang() }}</option>
              <option value="Moderate">{{ 'hao.caseSheet.riskLevelModerate' | translate: lang() }}</option>
              <option value="High">{{ 'hao.caseSheet.riskLevelHigh' | translate: lang() }}</option>
            </select>
          </div>
        }

        @if (!isCo()) {
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" for="hao-cs-recommended-action">
              {{ 'hao.caseSheet.recommendedAction' | translate: lang() }}
              @if (isHaoOrMo()) {
                <span class="text-destructive" aria-hidden="true">*</span>
              }
            </label>
            <textarea
              z-input
              id="hao-cs-recommended-action"
              rows="2"
              maxlength="300"
              formControlName="recommendedAction"
              [attr.aria-invalid]="isInvalid('recommendedAction') || null"
            ></textarea>
            @if (isInvalid('recommendedAction')) {
              <p class="text-xs font-medium text-destructive" role="alert">
                {{ 'hao.caseSheet.recommendedActionRequired' | translate: lang() }}
              </p>
            }
          </div>
        } @else {
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" for="hao-cs-treatment-recommendation">
              {{ 'hao.caseSheet.treatmentRecommendation' | translate: lang() }}
              <span class="text-destructive" aria-hidden="true">*</span>
            </label>
            <textarea
              z-input
              id="hao-cs-treatment-recommendation"
              rows="2"
              minlength="3"
              maxlength="300"
              formControlName="treatmentRecommendation"
              [attr.aria-invalid]="isInvalid('treatmentRecommendation') || null"
            ></textarea>
            @if (isInvalid('treatmentRecommendation')) {
              <p class="text-xs font-medium text-destructive" role="alert">
                {{ 'hao.caseSheet.treatmentRecommendationRequired' | translate: lang() }}
              </p>
            }
          </div>
        }
      } @else {
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium" for="hao-cs-disease-summary">
            {{ 'hao.caseSheet.diseasesSummary' | translate: lang() }}
            <span class="text-destructive" aria-hidden="true">*</span>
          </label>
          <div class="flex flex-wrap items-center gap-2">
            <select
              id="hao-cs-disease-summary"
              formControlName="diseaseSummaryID"
              class="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option [ngValue]="null">{{ 'hao.caseSheet.selectDiagnosis' | translate: lang() }}</option>
              @for (disease of diseases(); track disease.diseasesummaryID) {
                <option [ngValue]="disease.diseasesummaryID">{{ disease.diseaseName }}</option>
              }
            </select>
            <button
              z-button
              type="button"
              zType="outline"
              zSize="sm"
              [zLoading]="loadingDisease()"
              [zDisabled]="form.controls.diseaseSummaryID.value === null || loadingDisease()"
              (click)="openDiseaseSummary()"
            >
              {{ 'hao.caseSheet.viewDiseaseSummary' | translate: lang() }}
            </button>
          </div>
          @if (diseaseError()) {
            <p class="text-xs font-medium text-destructive" role="alert">{{ diseaseError() }}</p>
          }
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium" for="hao-cs-information-given">
            {{ 'hao.caseSheet.informationGiven' | translate: lang() }}
          </label>
          <textarea
            z-input
            id="hao-cs-information-given"
            rows="2"
            maxlength="100"
            readonly
            formControlName="informationGiven"
          ></textarea>
        </div>
      }

      @if (diseaseDetail(); as detail) {
        <app-view-disease-summary-details
          [detail]="detail"
          (accepted)="closeDiseaseSummary()"
          (cancelled)="closeDiseaseSummary()"
        />
      }

      @if (showActionByHao()) {
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium" for="hao-cs-action-hao">
            {{ 'hao.caseSheet.actionByHao' | translate: lang() }}
            <span class="text-destructive" aria-hidden="true">*</span>
          </label>
          <textarea
            z-input
            id="hao-cs-action-hao"
            rows="2"
            minlength="3"
            maxlength="200"
            formControlName="actionByRole"
            [attr.aria-invalid]="isInvalid('actionByRole') || null"
          ></textarea>
          @if (isInvalid('actionByRole')) {
            <p class="text-xs font-medium text-destructive" role="alert">
              {{ 'hao.caseSheet.actionByRoleInvalid' | translate: lang() }}
            </p>
          }
        </div>
      }
      @if (isMo()) {
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium" for="hao-cs-action-mo">
            {{ 'hao.caseSheet.actionByMo' | translate: lang() }}
            <span class="text-destructive" aria-hidden="true">*</span>
          </label>
          <textarea
            z-input
            id="hao-cs-action-mo"
            rows="2"
            minlength="3"
            maxlength="200"
            formControlName="actionByRole"
            [attr.aria-invalid]="isInvalid('actionByRole') || null"
          ></textarea>
          @if (isInvalid('actionByRole')) {
            <p class="text-xs font-medium text-destructive" role="alert">
              {{ 'hao.caseSheet.actionByRoleInvalid' | translate: lang() }}
            </p>
          }
        </div>
      }

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium" for="hao-cs-remarks">
          {{ 'hao.caseSheet.remarks' | translate: lang() }}
        </label>
        <textarea z-input id="hao-cs-remarks" rows="2" formControlName="remarks"></textarea>
      </div>

      @if (isHaoOrMo()) {
        <div class="flex flex-col gap-2 rounded-lg border border-border p-3">
          <label class="text-sm font-medium">
            {{ 'hao.caseSheet.covidQc' | translate: lang() }}
            <span class="text-destructive" aria-hidden="true">*</span>
          </label>
          <div class="flex gap-4 text-sm">
            <label class="flex items-center gap-2">
              <input type="radio" formControlName="covidQc" value="yes" />
              {{ 'hao.caseSheet.yes' | translate: lang() }}
            </label>
            <label class="flex items-center gap-2">
              <input type="radio" formControlName="covidQc" value="no" />
              {{ 'hao.caseSheet.no' | translate: lang() }}
            </label>
          </div>

          @if (form.controls.covidQc.value === 'yes') {
            <div class="mt-3 flex flex-col gap-3 border-t border-border pt-3">
              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium">
                  {{ 'hao.caseSheet.travelledLast14Days' | translate: lang() }}
                </label>
                <div class="flex gap-4 text-sm">
                  <label class="flex items-center gap-2">
                    <input type="radio" formControlName="covidTravelled" [value]="true" />
                    {{ 'hao.caseSheet.yes' | translate: lang() }}
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" formControlName="covidTravelled" [value]="false" />
                    {{ 'hao.caseSheet.no' | translate: lang() }}
                  </label>
                </div>
              </div>

              @if (form.controls.covidTravelled.value === true) {
                <div class="flex flex-col gap-2">
                  <div class="flex gap-4 text-sm">
                    <label class="flex items-center gap-2">
                      <input type="checkbox" formControlName="covidTravelDomestic" />
                      {{ 'hao.caseSheet.travelDomestic' | translate: lang() }}
                    </label>
                    <label class="flex items-center gap-2">
                      <input type="checkbox" formControlName="covidTravelInternational" />
                      {{ 'hao.caseSheet.travelInternational' | translate: lang() }}
                    </label>
                  </div>
                  @if (form.controls.covidTravelDomestic.value || form.controls.covidTravelInternational.value) {
                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <select
                        formControlName="covidModeOfTravel"
                        class="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option [ngValue]="null">{{ 'hao.caseSheet.modeOfTravel' | translate: lang() }}</option>
                        @if (form.controls.covidTravelDomestic.value) {
                          <option value="bus">{{ 'hao.caseSheet.modeBus' | translate: lang() }}</option>
                          <option value="train">{{ 'hao.caseSheet.modeTrain' | translate: lang() }}</option>
                        }
                        <option value="flight">{{ 'hao.caseSheet.modeFlight' | translate: lang() }}</option>
                        <option value="ship">{{ 'hao.caseSheet.modeShip' | translate: lang() }}</option>
                      </select>
                      <input
                        z-input
                        type="text"
                        [placeholder]="'hao.caseSheet.travelledFrom' | translate: lang()"
                        formControlName="covidTravelledFrom"
                      />
                      <input
                        z-input
                        type="text"
                        [placeholder]="'hao.caseSheet.travelledTo' | translate: lang()"
                        formControlName="covidTravelledTo"
                      />
                    </div>
                  }
                </div>
              }

              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium">{{ 'hao.caseSheet.symptoms' | translate: lang() }}</label>
                <div class="flex flex-wrap gap-4 text-sm">
                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      formControlName="covidFever"
                      [attr.disabled]="form.controls.covidNoSymptoms.value ? true : null"
                    />
                    {{ 'hao.caseSheet.fever' | translate: lang() }}
                  </label>
                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      formControlName="covidCough"
                      [attr.disabled]="form.controls.covidNoSymptoms.value ? true : null"
                    />
                    {{ 'hao.caseSheet.cough' | translate: lang() }}
                  </label>
                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      formControlName="covidBreathingDifficulty"
                      [attr.disabled]="form.controls.covidNoSymptoms.value ? true : null"
                    />
                    {{ 'hao.caseSheet.breathingDifficulties' | translate: lang() }}
                  </label>
                  <label class="flex items-center gap-2">
                    <input
                      type="checkbox"
                      formControlName="covidNoSymptoms"
                      [attr.disabled]="anySpecificSymptomChecked() ? true : null"
                    />
                    {{ 'hao.caseSheet.noSymptoms' | translate: lang() }}
                  </label>
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium">
                  {{ 'hao.caseSheet.covid19ContactHistory' | translate: lang() }}
                </label>
                <div class="flex flex-col gap-1 text-sm">
                  <label class="flex items-center gap-2">
                    <input type="checkbox" formControlName="covidContactConfirmedCase" />
                    {{ 'hao.caseSheet.contactConfirmedCase' | translate: lang() }}
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="checkbox" formControlName="covidContactSymptomatic" />
                    {{ 'hao.caseSheet.contactSymptomatic' | translate: lang() }}
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="checkbox" formControlName="covidContactTravelHistory" />
                    {{ 'hao.caseSheet.contactTravelHistory' | translate: lang() }}
                  </label>
                </div>
              </div>

              @if (anyContactHistoryChecked()) {
                <div class="flex flex-col gap-1.5">
                  <label class="text-sm font-medium">
                    {{ 'hao.caseSheet.seekMedicalConsultation' | translate: lang() }}
                  </label>
                  <div class="flex gap-4 text-sm">
                    <label class="flex items-center gap-2">
                      <input type="radio" formControlName="covidSeekMedicalConsult" [value]="true" />
                      {{ 'hao.caseSheet.yes' | translate: lang() }}
                    </label>
                    <label class="flex items-center gap-2">
                      <input type="radio" formControlName="covidSeekMedicalConsult" [value]="false" />
                      {{ 'hao.caseSheet.no' | translate: lang() }}
                    </label>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <div class="flex flex-col gap-2 rounded-lg border border-border p-3">
          <label class="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" formControlName="isCovidVaccine" />
            {{ 'hao.caseSheet.covidVaccineStatus' | translate: lang() }}
          </label>

          @if (form.controls.isCovidVaccine.value) {
            <div class="mt-2 flex flex-col gap-3 border-t border-border pt-3">
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <p class="text-sm text-muted-foreground">
                  {{ 'hao.caseSheet.ageGroup' | translate: lang() }}:
                  {{
                    (vaccineApplicable() ? 'hao.caseSheet.ageGroupAdult' : 'hao.caseSheet.ageGroupChild')
                      | translate: lang()
                  }}
                </p>
                <p class="text-sm text-muted-foreground">
                  {{ 'hao.caseSheet.isApplicableForVaccine' | translate: lang() }}:
                  {{
                    (vaccineApplicable()
                      ? 'hao.caseSheet.applicableForVaccination'
                      : 'hao.caseSheet.notApplicableForVaccination'
                    ) | translate: lang()
                  }}
                </p>
              </div>

              @if (vaccineApplicable()) {
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <select
                    formControlName="vaccineStatus"
                    class="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option [ngValue]="null">{{ 'hao.caseSheet.vaccineStatus' | translate: lang() }}</option>
                    <option value="YES">{{ 'hao.caseSheet.yes' | translate: lang() }}</option>
                    <option value="NO">{{ 'hao.caseSheet.no' | translate: lang() }}</option>
                  </select>
                  @if (form.controls.vaccineStatus.value === 'YES') {
                    <select
                      formControlName="covidVaccineTypeID"
                      class="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option [ngValue]="null">{{ 'hao.caseSheet.vaccineTypes' | translate: lang() }}</option>
                      @for (v of vaccineTypes(); track v.covidVaccineTypeID) {
                        <option [ngValue]="v.covidVaccineTypeID">{{ v.vaccineType }}</option>
                      }
                    </select>
                    <select
                      formControlName="doseTypeID"
                      class="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option [ngValue]="null">{{ 'hao.caseSheet.doseTaken' | translate: lang() }}</option>
                      @for (d of doseTypes(); track d.covidDoseTypeID) {
                        <option [ngValue]="d.covidDoseTypeID">{{ d.doseType }}</option>
                      }
                    </select>
                  }
                </div>
                <div class="flex justify-end">
                  <button
                    z-button
                    type="button"
                    zType="outline"
                    zSize="sm"
                    [zLoading]="savingVaccine()"
                    [zDisabled]="!canSaveVaccine() || savingVaccine()"
                    (click)="saveCovidVaccine()"
                  >
                    {{ 'hao.caseSheet.save' | translate: lang() }}
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }

      <!--
        No inline CDSS panel: legacy drives CDSS entirely through the popups
        the chief-complaint pick opens (Symptoms → Symptom Results →
        Diseases), so the only thing shown here is the loading/error state of
        that chain.
      -->
      @if (cdssBusy()) {
        <p class="text-xs text-muted-foreground">{{ 'cdss.title' | translate: lang() }}…</p>
      }
      @if (cdssError()) {
        <p class="text-xs font-medium text-destructive" role="alert">
          {{ 'cdss.noQuestions' | translate: lang() }}
        </p>
      }

      <div class="flex flex-wrap justify-end gap-2">
        @if (showPrescription()) {
          <button z-button type="button" zType="outline" class="mr-auto" (click)="togglePrescription()">
            {{ 'hao.service.prescription' | translate: lang() }}
          </button>
          @if (recentPrescription()) {
            <button
              z-button
              type="button"
              zType="outline"
              class="-ml-1"
              [title]="'hao.caseSheet.resendPrescriptionHint' | translate: lang()"
              (click)="openRecentPrescription()"
            >
              {{ 'hao.caseSheet.resendPrescription' | translate: lang() }}
            </button>
          }
        }
        <button z-button type="button" zType="outline" (click)="resetForm()">
          {{ 'hao.caseSheet.clear' | translate: lang() }}
        </button>
        <button z-button type="submit" [zLoading]="saving()" [zDisabled]="saving() || beneficiaryId() === null">
          {{ 'hao.caseSheet.save' | translate: lang() }}
        </button>
      </div>
    </form>

    @if (prescriptionOpen()) {
      <div class="mt-4">
        <app-prescription
          [patientName]="patientDisplayName()"
          [age]="patientAge()"
          [gender]="patientGenderName()"
          [initialDiagnosis]="form.controls.informationGiven.value ?? ''"
          [openHistory]="openPrescriptionHistory()"
          (saved)="onPrescriptionSaved()"
        />
      </div>
    }

    @if (beneficiaryId() !== null) {
      <section class="mt-6 border-t border-border pt-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-foreground">
            {{ 'casesheetHistory.sectionTitle' | translate: lang() }}
          </h2>
          <button z-button type="button" zType="ghost" zSize="sm" (click)="toggleHistory()">
            {{ (historyOpen() ? 'casesheetHistory.hide' : 'casesheetHistory.show') | translate: lang() }}
          </button>
        </div>

        @if (historyOpen()) {
          <div class="mt-3 flex flex-wrap gap-2" role="tablist">
            @for (tab of historyTabs; track tab.id) {
              <button
                z-button
                type="button"
                [zType]="activeTab() === tab.id ? 'default' : 'outline'"
                zSize="sm"
                role="tab"
                [attr.aria-selected]="activeTab() === tab.id"
                (click)="selectHistoryTab(tab.id)"
              >
                {{ tab.labelKey | translate: lang() }}
              </button>
            }
          </div>

          <div class="mt-3">
            @switch (activeTab()) {
              @case ('own') {
                <app-case-sheet-history [benRegID]="beneficiaryId()" />
              }
              @case ('mcts') {
                <app-casesheet-history-mcts [benRegID]="beneficiaryId()" />
              }
              @case ('mmu') {
                <app-casesheet-history-mmu [benRegID]="beneficiaryId()" (selectVisit)="onSelectVisit($event)" />
              }
              @case ('tm') {
                <app-casesheet-history-mmu
                  [benRegID]="beneficiaryId()"
                  [isTm]="true"
                  (selectVisit)="onSelectVisit($event)"
                />
              }
              @case ('hihl') {
                <app-hihl-case-sheet-history [rows]="hihlHistoryRows()" [loading]="hihlHistoryLoading()" />
              }
            }

            @if (selectedVisit(); as visit) {
              <div class="mt-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
                <div class="mb-2 flex items-center justify-between">
                  <h3 class="font-semibold text-foreground">
                    {{ 'casesheetHistory.mmu.selectedVisit' | translate: lang() }}
                  </h3>
                  <button z-button type="button" zType="ghost" zSize="sm" (click)="selectedVisit.set(null)">
                    {{ 'diseaseSummary.close' | translate: lang() }}
                  </button>
                </div>
                <dl class="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                  <div class="flex justify-between gap-2">
                    <dt class="text-muted-foreground">
                      {{ 'casesheetHistory.mmu.visitCategory' | translate: lang() }}
                    </dt>
                    <dd class="text-foreground">{{ visit.VisitCategory || '—' }}</dd>
                  </div>
                  <div class="flex justify-between gap-2">
                    <dt class="text-muted-foreground">{{ 'casesheetHistory.mmu.visitReason' | translate: lang() }}</dt>
                    <dd class="text-foreground">{{ visit.VisitReason || '—' }}</dd>
                  </div>
                  <div class="flex justify-between gap-2">
                    <dt class="text-muted-foreground">{{ 'casesheetHistory.mmu.visitCode' | translate: lang() }}</dt>
                    <dd class="text-foreground">{{ visit.visitCode || '—' }}</dd>
                  </div>
                </dl>
                <p class="mt-2 text-xs text-muted-foreground">
                  {{ 'casesheetHistory.mmu.detailUnavailable' | translate: lang() }}
                </p>
              </div>
            }
          </div>
        }
      </section>
    }
  `,
})
export class CaseSheetComponent {
  private readonly fb = inject(FormBuilder);
  private readonly haoService = inject(HaoService);
  private readonly prescriptionService = inject(PrescriptionService);
  private readonly authStore = inject(AuthStore);
  readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly cdss = inject(CdssService);
  private readonly cdssFlow = inject(CdssFlowService);
  private readonly hihlService = inject(HihlCaseSheetService);
  private readonly snomed = inject(SnomedService);

  readonly lang = this.i18n.language;

  readonly beneficiaryId = input<number | null>(null);
  readonly callId = input<string | null>(null);

  readonly serviceAvailed = output<void>();

  readonly diseases = signal<AvailableDisease[]>([]);
  readonly saving = signal(false);
  readonly savingVaccine = signal(false);

  readonly showPrescription = computed(() => this.roleCode() === MO_FEATURE_CODE);
  readonly prescriptionOpen = signal(false);
  readonly openPrescriptionHistory = signal(false);
  readonly recentPrescription = signal<PrescriptionRecord | null>(null);
  readonly patientDisplayName = computed(() => {
    const d = this.callStore.demographics();
    return [d?.firstName, d?.lastName].filter(Boolean).join(' ');
  });
  readonly patientGenderName = computed(() => this.callStore.demographics()?.genderName ?? '');

  readonly diseaseDetail = signal<DiseaseSummaryDetail | null>(null);
  readonly loadingDisease = signal(false);
  readonly diseaseError = signal('');

  readonly vaccineTypes = signal<CovidVaccineType[]>([]);
  readonly doseTypes = signal<CovidDoseType[]>([]);
  private existingCovidVSID: number | null = null;

  readonly allCategories = signal<GuidelineCategory[]>([]);
  readonly subCategories = signal<GuidelineSubCategory[]>([]);
  readonly guidelineResults = signal<GuidelineDetail[] | null>(null);
  readonly loadingGuidelines = signal(false);

  readonly historyOpen = signal(false);
  readonly activeTab = signal<HistoryTab>('own');
  readonly selectedVisit = signal<MmuVisitRow | null>(null);

  /**
   * 104-HIHL case-sheet history (legacy's 5th tab, `benHihlData`). The other
   * four tabs' components fetch their own rows from a `benRegID` input; this
   * one takes rows as an input, so the case sheet loads them — lazily, the
   * first time the tab is opened for a beneficiary.
   */
  readonly hihlHistoryRows = signal<HihlHistoryRow[]>([]);
  readonly hihlHistoryLoading = signal(false);
  private hihlHistoryLoadedFor: number | null = null;

  readonly historyTabs: ReadonlyArray<{ id: HistoryTab; labelKey: TranslationKey }> = [
    { id: 'own', labelKey: 'casesheetHistory.tabOwn' },
    { id: 'mcts', labelKey: 'casesheetHistory.tabMcts' },
    { id: 'mmu', labelKey: 'casesheetHistory.tabMmu' },
    { id: 'tm', labelKey: 'casesheetHistory.tabTm' },
    { id: 'hihl', labelKey: 'casesheetHistory.tabHihl' },
  ];

  private prefilledFor: number | null = null;

  readonly form = this.fb.nonNullable.group({
    isPatientOther: [false],
    patientFirstName: [''],
    patientLastName: [''],
    patientGenderID: this.fb.control<CdssGender | null>(null),
    patientAgeValue: this.fb.control<number | null>(null),
    patientAgeUnit: ['years'],
    patientDOB: this.fb.control<string | null>(null),
    chiefComplaintMode: this.fb.control<ChiefComplaintMode>('complaint'),
    chiefComplaints: ['', [Validators.maxLength(2000)]],
    provisionalDiagnosis: this.fb.control<string | null>(null),
    diseaseSummaryID: this.fb.control<number | null>(null),
    informationGiven: this.fb.control<string | null>(null),
    recommendedAction: [''],
    actionByRole: [''],
    remarks: this.fb.control<string | null>(null),
    covidQc: this.fb.control<'yes' | 'no'>('no'),
    covidTravelled: this.fb.control<boolean | null>(null),
    covidTravelDomestic: [false],
    covidTravelInternational: [false],
    covidModeOfTravel: this.fb.control<string | null>(null),
    covidTravelledFrom: [''],
    covidTravelledTo: [''],
    covidFever: [false],
    covidCough: [false],
    covidBreathingDifficulty: [false],
    covidNoSymptoms: [false],
    covidContactConfirmedCase: [false],
    covidContactSymptomatic: [false],
    covidContactTravelHistory: [false],
    covidSeekMedicalConsult: this.fb.control<boolean | null>(null),
    isCovidVaccine: [false],
    vaccineStatus: this.fb.control<VaccineStatus | null>(null),
    covidVaccineTypeID: this.fb.control<number | null>(null),
    doseTypeID: this.fb.control<number | null>(null),
    wellbeingOrInfo: this.fb.control<WellbeingOrInfo>('1'),
    categoryID: this.fb.control<number | null>(null),
    subCategoryID: this.fb.control<number | null>(null),
    riskLevel: this.fb.control<string | null>(null),
    treatmentRecommendation: [''],
  });

  /**
   * CDSS symptom input. Mirrors `chiefComplaints` for every edit — including
   * picking an entry from the chief-complaint dropdown, which legacy feeds
   * straight into `invokeDialog()`/`getQuestions` as the symptom
   * (`case-sheet.component.ts:1294-1299`).
   */
  private readonly _complaint = signal(this.form.controls.chiefComplaints.value);
  readonly complaint = this._complaint.asReadonly();

  /**
   * Chief-complaint options for the field's dropdown — legacy's
   * `chiefCompliants`, loaded from `CDSS/Symptoms` for the patient's age and
   * gender (`fetchChiefComplaintsBasedOnGender()`).
   */
  private readonly complaintOptions = signal<string[]>([]);
  /** `age|gender` the option list was last loaded for; see {@link loadChiefComplaintOptions}. */
  private complaintOptionsKey: string | null = null;
  private readonly complaintQuery = signal('');
  readonly complaintDropdownOpen = signal(false);

  /**
   * `SCTID: <conceptID>` for the picked complaint. Legacy resolves this behind
   * the scenes on selection (`getSnomedCTRecord`) and shows it as the field's
   * tooltip (`sctID_pcc`).
   */
  readonly complaintSctid = signal('');

  /** True while the CDSS questionnaire for a freshly picked complaint loads. */
  readonly cdssBusy = signal(false);
  /** Set when the CDSS chain fails, so the agent sees why nothing opened. */
  readonly cdssError = signal(false);

  /**
   * Substring match, case-insensitive — what legacy's `<md2-autocomplete>`
   * does in the browser (its own `filter()` helper is prefix-based but is
   * never wired to the template, so it is dead code there).
   */
  readonly filteredComplaints = computed(() => {
    const query = this.complaintQuery().trim().toLowerCase();
    const options = this.complaintOptions();
    if (query.length === 0) {
      return options;
    }
    return options.filter((option) => option.toLowerCase().includes(query));
  });

  private readonly wellbeingOrInfo = toSignal(this.form.controls.wellbeingOrInfo.valueChanges, {
    initialValue: this.form.controls.wellbeingOrInfo.value,
  });

  readonly roleCode = computed(() => this.authStore.currentRole()?.featureCode ?? '');
  readonly isHao = computed(() => this.roleCode() === 'HAO');
  /**
   * Action by HAO is the one field legacy does NOT gate on the role code alone
   * (`case-sheet.component.html:593`): a hybrid RO+HAO agent's feature code is
   * remapped to `RO` by `getSelectedFeature()`, so legacy ORs in the
   * Health_Advice screen privilege to keep the field visible for them. Every
   * other HAO check in that template is a plain role comparison.
   */
  readonly showActionByHao = computed(
    () => this.isHao() || collectServiceScreens(this.authStore.privileges(), SERVICE_104).includes('Health_Advice'),
  );
  readonly isMo = computed(() => this.roleCode() === 'MO');
  readonly isCo = computed(() => this.roleCode() === 'CO');
  readonly isHaoOrMo = computed(() => this.isHao() || this.isMo());

  readonly filteredCategories = computed(() => {
    const wellBeing = this.wellbeingOrInfo() === '1';
    return this.allCategories().filter((c) => (wellBeing ? c.isWellBeing === true : !c.isWellBeing));
  });

  readonly callerName = computed(() => {
    const d = this.callStore.demographics();
    if (!d) {
      return '';
    }
    return [d.firstName, d.lastName].filter(Boolean).join(' ');
  });

  readonly patientAge = computed(() =>
    this.form.controls.isPatientOther.value
      ? this.form.controls.patientAgeValue.value
      : (this.callStore.demographics()?.age ?? null),
  );
  readonly patientGender = computed<CdssGender | null>(() =>
    this.form.controls.isPatientOther.value
      ? this.form.controls.patientGenderID.value
      : toCdssGender(this.callStore.demographics()?.genderName),
  );

  readonly anySpecificSymptomChecked = computed(
    () =>
      this.form.controls.covidFever.value ||
      this.form.controls.covidCough.value ||
      this.form.controls.covidBreathingDifficulty.value,
  );
  readonly anyContactHistoryChecked = computed(
    () =>
      this.form.controls.covidContactConfirmedCase.value ||
      this.form.controls.covidContactSymptomatic.value ||
      this.form.controls.covidContactTravelHistory.value,
  );
  readonly vaccineApplicable = computed(() => (this.patientAge() ?? 0) >= MIN_VACCINE_AGE);
  readonly canSaveVaccine = computed(() => {
    const status = this.form.controls.vaccineStatus.value;
    if (status === 'NO') {
      return true;
    }
    if (status === 'YES') {
      return this.form.controls.covidVaccineTypeID.value !== null && this.form.controls.doseTypeID.value !== null;
    }
    return false;
  });

  anyGuidelineFile(results: GuidelineDetail[]): boolean {
    return results.some((r) => r.subCatFilePath);
  }

  /**
   * Legacy resolves the Counselling Sheet's Category list two-hop: fetch the
   * role's available sub-services, then match the one named "Counselling" for
   * its `subServiceID`, which the category lookup keys on alongside
   * `providerServiceMapID` (`getSubserviceID` → `getCategories`).
   */
  private loadGuidelineCategories(): void {
    const providerServiceMapID = this.providerServiceMapID();
    this.haoService.getAvailableServices(providerServiceMapID, true).subscribe({
      next: (services) => {
        const subServiceID = services.find((s) => s.subServiceName.includes('Counselling'))?.subServiceID ?? null;
        this.haoService.getGuidelineCategories(providerServiceMapID, subServiceID).subscribe({
          next: (categories) => this.allCategories.set(categories),
          error: () => this.allCategories.set([]),
        });
      },
      error: () => {
        this.haoService.getGuidelineCategories(providerServiceMapID, null).subscribe({
          next: (categories) => this.allCategories.set(categories),
          error: () => this.allCategories.set([]),
        });
      },
    });
  }

  searchGuidelines(): void {
    const categoryID = this.form.controls.categoryID.value;
    if (categoryID === null || this.loadingGuidelines()) {
      return;
    }
    this.loadingGuidelines.set(true);
    this.haoService
      .getGuidelineDetails(categoryID, this.form.controls.subCategoryID.value, this.providerServiceMapID())
      .subscribe({
        next: (results) => {
          this.loadingGuidelines.set(false);
          this.guidelineResults.set(results);
        },
        error: () => {
          this.loadingGuidelines.set(false);
          this.guidelineResults.set([]);
        },
      });
  }

  private providerServiceMapID(): number | null {
    return this.authStore.currentRole()?.providerServiceMapID ?? null;
  }

  /** Typing in the chief-complaint field re-filters and opens its dropdown. */
  onComplaintInput(): void {
    this.complaintQuery.set(this.form.controls.chiefComplaints.value ?? '');
    this.complaintDropdownOpen.set(true);
  }

  closeComplaintDropdown(): void {
    this.complaintDropdownOpen.set(false);
  }

  /**
   * Pick a complaint from the dropdown — legacy's `<md2-autocomplete>`
   * `(change)="invokeDialog(pcc)"`. Unlike the retired SNOMED box this feeds
   * the CDSS symptom input ({@link complaint}) with the picked name, because
   * that name is exactly what legacy posts to `getQuestions` as `symptom`
   * (`case-sheet.component.ts:1297`), and resolves the term's SNOMED concept
   * id behind the scenes for the field's `SCTID:` hint (legacy `sctID_pcc`).
   */
  selectComplaint(option: string): void {
    this.form.controls.chiefComplaints.setValue(option);
    this.form.controls.chiefComplaints.markAsDirty();
    this._complaint.set(option);
    this.complaintQuery.set(option);
    this.closeComplaintDropdown();
    this.fillProvisionalDiagnosisFallback(option);
    this.complaintSctid.set('');
    this.snomed.getRecordConceptId(option).subscribe((conceptId) => {
      this.complaintSctid.set(conceptId === SNOMED_NO_MATCH ? '' : `SCTID: ${conceptId}`);
    });
    void this.openCdssFlow(option);
  }

  /**
   * Legacy's `invokeDialog()`: picking a complaint goes straight into the
   * Symptoms → Symptom Results → Diseases popups, and saving there fills
   * Provisional Diagnosis + Recommended Action.
   */
  private async openCdssFlow(symptom: string): Promise<void> {
    const age = this.patientAge();
    const gender = this.patientGender();
    if (age === null || gender === null) {
      return;
    }
    const patient: CdssPatientContext = { age, gender, symptom };
    this.cdssBusy.set(true);
    try {
      const questionnaire = await firstValueFrom(this.cdss.getQuestions(patient));
      const selection = await this.cdssFlow.run(patient, questionnaire.id, questionnaire.questions, (selected) =>
        firstValueFrom(this.cdss.getResult({ complaintId: questionnaire.id, selected })),
      );
      if (selection) {
        this.onCdssSelection(selection);
      }
    } catch {
      this.cdssError.set(true);
    } finally {
      this.cdssBusy.set(false);
    }
  }

  /**
   * Load legacy's `chiefCompliants` for the patient's age + gender. Deduped on
   * the age/gender pair: the patient fields feeding it are plain form controls
   * (not signals), so the callers below can fire on edits that leave the pair
   * unchanged, and legacy only refetches when the pair actually changes.
   */
  private loadChiefComplaintOptions(): void {
    const age = this.patientAge();
    const gender = this.patientGender();
    if (age === null || gender === null) {
      return;
    }
    const key = `${age}|${gender}`;
    if (key === this.complaintOptionsKey) {
      return;
    }
    this.complaintOptionsKey = key;
    this.cdss.getChiefComplaints({ age, gender }).subscribe({
      next: (options) => this.complaintOptions.set(options),
      error: () => {
        this.complaintOptionsKey = null;
        this.complaintOptions.set([]);
      },
    });
  }

  /**
   * Legacy always keeps the (HAO/MO-readonly) Provisional Diagnosis in sync
   * with the chief complaint: it defaults to the complaint text itself, and
   * only a later CDSS accept (see {@link onCdssSelection}) overwrites it with
   * a clinically-derived diagnosis. Runs on blur (not every keystroke) so it
   * doesn't fight the field while the agent is still typing; never clobbers a
   * value already present (typed default or a prior CDSS accept).
   */
  onComplaintBlur(): void {
    this.closeComplaintDropdown();
    if (this.isCo()) {
      return;
    }
    this.fillProvisionalDiagnosisFallback(this.form.controls.chiefComplaints.value);
  }

  private fillProvisionalDiagnosisFallback(complaint: string | null): void {
    const trimmed = complaint?.trim().slice(0, 100) ?? '';
    const diagnosisControl = this.form.controls.provisionalDiagnosis;
    if (trimmed && !diagnosisControl.value?.trim()) {
      diagnosisControl.setValue(trimmed);
      diagnosisControl.markAsDirty();
    }
  }

  onCdssSelection(selection: CdssSelection): void {
    const diagnosis = selection.diagnoses
      .map((d) => d.disease)
      .filter(Boolean)
      .join(', ')
      .slice(0, 100);
    if (diagnosis) {
      this.form.controls.provisionalDiagnosis.setValue(diagnosis);
      this.form.controls.provisionalDiagnosis.markAsDirty();
    }
    const action = selection.recommendedAction?.trim().slice(0, 300);
    if (action) {
      this.form.controls.recommendedAction.setValue(action);
      this.form.controls.recommendedAction.markAsDirty();
    }
  }

  constructor() {
    this.form.controls.chiefComplaints.valueChanges.subscribe((value) => {
      this._complaint.set(value);
    });

    this.haoService.getAvailableDiseases().subscribe({
      next: (diseases) => this.diseases.set(diseases),
      error: () => this.diseases.set([]),
    });

    this.haoService.getCovidVaccineMasterData().subscribe({
      next: (master) => {
        this.vaccineTypes.set(master?.vaccineType ?? []);
        this.doseTypes.set(master?.doseType ?? []);
      },
      error: () => {
        this.vaccineTypes.set([]);
        this.doseTypes.set([]);
      },
    });

    if (this.isCo()) {
      this.loadGuidelineCategories();
    }

    this.form.controls.wellbeingOrInfo.valueChanges.subscribe(() => {
      this.form.controls.categoryID.setValue(null);
      this.form.controls.subCategoryID.setValue(null);
      this.subCategories.set([]);
      this.guidelineResults.set(null);
    });

    this.form.controls.categoryID.valueChanges.subscribe((categoryID) => {
      this.form.controls.subCategoryID.setValue(null);
      this.subCategories.set([]);
      this.guidelineResults.set(null);
      if (categoryID !== null) {
        this.haoService.getGuidelineSubCategories(categoryID).subscribe({
          next: (subCategories) => this.subCategories.set(subCategories),
          error: () => this.subCategories.set([]),
        });
      }
    });

    this.form.controls.subCategoryID.valueChanges.subscribe(() => {
      this.guidelineResults.set(null);
    });

    effect(() => {
      const id = this.beneficiaryId();
      if (id !== null && id !== this.prefilledFor) {
        this.prefilledFor = id;
        this.loadExistingCaseSheet(id);
        if (this.isHaoOrMo() && this.vaccineApplicable()) {
          this.loadExistingVaccineStatus(id);
        }
      }
      if (id !== null && this.showPrescription()) {
        this.loadRecentPrescription(id);
      }
    });

    // Legacy loads the chief-complaint list per patient age + gender
    // (`fetchChiefComplaintsBasedOnGender`). The demographics path is a signal;
    // the "Patient is: Other" fields are plain form controls, so they need
    // their own subscriptions to reach the (deduped) loader.
    effect(() => {
      this.callStore.demographics();
      this.loadChiefComplaintOptions();
    });
    const reloadComplaints = () => this.loadChiefComplaintOptions();
    this.form.controls.isPatientOther.valueChanges.subscribe(reloadComplaints);
    this.form.controls.patientAgeValue.valueChanges.subscribe(reloadComplaints);
    this.form.controls.patientGenderID.valueChanges.subscribe(reloadComplaints);

    this.setRoleRequiredValidators();
    this.form.controls.chiefComplaintMode.valueChanges.subscribe(() => this.setRoleRequiredValidators());
  }

  private setRoleRequiredValidators(): void {
    const required = this.isHaoOrMo();
    const isCo = this.isCo();
    const usingComplaint = this.form.controls.chiefComplaintMode.value === 'complaint';
    const complaintsControl = this.form.controls.chiefComplaints;
    const recommendedActionControl = this.form.controls.recommendedAction;
    const actionByRoleControl = this.form.controls.actionByRole;
    const diseaseSummaryControl = this.form.controls.diseaseSummaryID;
    const provisionalDiagnosisControl = this.form.controls.provisionalDiagnosis;
    const treatmentRecommendationControl = this.form.controls.treatmentRecommendation;

    const complaintsMaxLength = isCo ? 800 : 2000;
    complaintsControl.setValidators(
      (required || isCo) && usingComplaint
        ? [Validators.required, Validators.maxLength(complaintsMaxLength)]
        : [Validators.maxLength(complaintsMaxLength)],
    );
    recommendedActionControl.setValidators(required && usingComplaint ? [Validators.required] : []);
    actionByRoleControl.setValidators(
      required ? [Validators.required, Validators.minLength(3), Validators.maxLength(200)] : [],
    );
    diseaseSummaryControl.setValidators(required && !usingComplaint ? [Validators.required] : []);
    provisionalDiagnosisControl.setValidators(
      isCo ? [Validators.required, Validators.minLength(4), Validators.maxLength(100)] : [],
    );
    treatmentRecommendationControl.setValidators(
      isCo ? [Validators.required, Validators.minLength(3), Validators.maxLength(300)] : [],
    );
    complaintsControl.updateValueAndValidity();
    recommendedActionControl.updateValueAndValidity();
    actionByRoleControl.updateValueAndValidity();
    diseaseSummaryControl.updateValueAndValidity();
    provisionalDiagnosisControl.updateValueAndValidity();
    treatmentRecommendationControl.updateValueAndValidity();
  }

  togglePrescription(): void {
    this.openPrescriptionHistory.set(false);
    this.prescriptionOpen.update((open) => !open);
  }

  openRecentPrescription(): void {
    this.openPrescriptionHistory.set(true);
    this.prescriptionOpen.set(true);
  }

  onPrescriptionSaved(): void {
    const id = this.beneficiaryId();
    if (id !== null) {
      this.loadRecentPrescription(id);
    }
  }

  private loadRecentPrescription(beneficiaryRegID: number): void {
    this.prescriptionService.getPrescriptionList(beneficiaryRegID).subscribe({
      next: (records) => this.recentPrescription.set(this.mostRecentWithinWindow(records)),
      error: () => this.recentPrescription.set(null),
    });
  }

  private mostRecentWithinWindow(records: PrescriptionRecord[]): PrescriptionRecord | null {
    const now = Date.now();
    let latest: PrescriptionRecord | null = null;
    let latestTime = -Infinity;
    for (const record of records) {
      const created = record.createdDate ? Date.parse(record.createdDate) : NaN;
      if (Number.isNaN(created) || now - created > RECENT_PRESCRIPTION_WINDOW_MS) {
        continue;
      }
      if (created > latestTime) {
        latest = record;
        latestTime = created;
      }
    }
    return latest;
  }

  resetForm(): void {
    this.clear();
    this.diseaseDetail.set(null);
    this.diseaseError.set('');
    this.prescriptionOpen.set(false);
  }

  private loadExistingCaseSheet(beneficiaryRegID: number): void {
    this.haoService.getPresentCaseSheet(beneficiaryRegID).subscribe({
      next: (sheet) => {
        if (sheet && this.form.pristine) {
          this.applyExistingCaseSheet(sheet);
        }
      },
      error: () => undefined,
    });
  }

  private loadExistingVaccineStatus(beneficiaryRegID: number): void {
    this.haoService.getCovidVaccinationDetails(beneficiaryRegID).subscribe({
      next: (details) => {
        if (details?.covidVSID != null) {
          this.existingCovidVSID = details.covidVSID;
          this.form.patchValue({
            isCovidVaccine: true,
            vaccineStatus: details.vaccineStatus ?? null,
            covidVaccineTypeID: details.covidVaccineTypeID ?? null,
            doseTypeID: details.doseTypeID ?? null,
          });
        }
      },
      error: () => undefined,
    });
  }

  private applyExistingCaseSheet(sheet: PresentCaseSheet): void {
    this.form.patchValue({
      chiefComplaints: sheet.chiefComplaints ?? '',
      provisionalDiagnosis: sheet.provisionalDiagnosis ?? null,
      recommendedAction: sheet.addedAdvice ?? '',
      actionByRole: (this.isHao() ? sheet.actionByHAO : sheet.actionByMO) ?? '',
      remarks: sheet.remarks ?? null,
      riskLevel: sheet.riskLevel ?? null,
      treatmentRecommendation: sheet.treatmentRecommendation ?? '',
      categoryID: sheet.categoryID ?? null,
      subCategoryID: sheet.subCategoryID ?? null,
    });
  }

  isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  openDiseaseSummary(): void {
    const id = this.form.controls.diseaseSummaryID.value;
    const disease = this.diseases().find((d) => d.diseasesummaryID === id);
    if (!disease || this.loadingDisease()) {
      return;
    }
    this.loadingDisease.set(true);
    this.diseaseError.set('');
    this.haoService.getDiseaseSummaryDetail(disease).subscribe({
      next: (detail) => {
        this.loadingDisease.set(false);
        this.diseaseDetail.set(detail);
        this.form.controls.informationGiven.setValue(disease.diseaseName);
      },
      error: () => {
        this.loadingDisease.set(false);
        this.diseaseError.set(this.i18n.instant('hao.caseSheet.diseaseSummaryError'));
      },
    });
  }

  closeDiseaseSummary(): void {
    this.diseaseDetail.set(null);
  }

  toggleHistory(): void {
    this.historyOpen.update((open) => !open);
    if (this.historyOpen()) {
      this.loadHihlHistoryIfNeeded();
    }
  }

  selectHistoryTab(tab: HistoryTab): void {
    this.activeTab.set(tab);
    if (tab === 'hihl') {
      this.loadHihlHistoryIfNeeded();
    }
  }

  private loadHihlHistoryIfNeeded(): void {
    const beneficiaryRegID = this.beneficiaryId();
    if (beneficiaryRegID === null || this.activeTab() !== 'hihl' || this.hihlHistoryLoadedFor === beneficiaryRegID) {
      return;
    }
    this.hihlHistoryLoadedFor = beneficiaryRegID;
    this.hihlHistoryLoading.set(true);
    this.hihlService.getHistory(beneficiaryRegID).subscribe({
      next: (rows) => {
        this.hihlHistoryLoading.set(false);
        this.hihlHistoryRows.set(rows);
      },
      error: () => {
        this.hihlHistoryLoading.set(false);
        this.hihlHistoryLoadedFor = null;
        this.hihlHistoryRows.set([]);
      },
    });
  }

  onSelectVisit(visit: MmuVisitRow): void {
    this.selectedVisit.set(visit);
  }

  clear(): void {
    this.form.reset({
      isPatientOther: false,
      patientFirstName: '',
      patientLastName: '',
      patientGenderID: null,
      patientAgeValue: null,
      patientAgeUnit: 'years',
      patientDOB: null,
      chiefComplaintMode: 'complaint',
      chiefComplaints: '',
      provisionalDiagnosis: null,
      diseaseSummaryID: null,
      informationGiven: null,
      recommendedAction: '',
      actionByRole: '',
      remarks: null,
      covidQc: 'no',
      covidTravelled: null,
      covidTravelDomestic: false,
      covidTravelInternational: false,
      covidModeOfTravel: null,
      covidTravelledFrom: '',
      covidTravelledTo: '',
      covidFever: false,
      covidCough: false,
      covidBreathingDifficulty: false,
      covidNoSymptoms: false,
      covidContactConfirmedCase: false,
      covidContactSymptomatic: false,
      covidContactTravelHistory: false,
      covidSeekMedicalConsult: null,
      isCovidVaccine: false,
      vaccineStatus: null,
      covidVaccineTypeID: null,
      doseTypeID: null,
      wellbeingOrInfo: '1',
      categoryID: null,
      subCategoryID: null,
      riskLevel: null,
      treatmentRecommendation: '',
    });
    this.subCategories.set([]);
    this.guidelineResults.set(null);
  }

  saveCovidVaccine(): void {
    const beneficiaryRegID = this.beneficiaryId();
    const vaccineStatus = this.form.controls.vaccineStatus.value;
    if (beneficiaryRegID === null || vaccineStatus === null || !this.canSaveVaccine() || this.savingVaccine()) {
      return;
    }
    const userName = this.authStore.user()?.userName ?? '';
    const request: SaveCovidVaccinationRequest = {
      covidVSID: this.existingCovidVSID,
      beneficiaryRegID,
      vaccineStatus,
      covidVaccineTypeID: vaccineStatus === 'YES' ? this.form.controls.covidVaccineTypeID.value : null,
      doseTypeID: vaccineStatus === 'YES' ? this.form.controls.doseTypeID.value : null,
      providerServiceMapID: this.authStore.currentRole()?.providerServiceMapID ?? null,
      createdBy: userName,
      modifiedBy: this.existingCovidVSID !== null ? userName : null,
    };

    this.savingVaccine.set(true);
    this.haoService.saveCovidVaccinationDetails(request).subscribe({
      next: (result) => {
        this.savingVaccine.set(false);
        this.existingCovidVSID = result?.covidVSID ?? this.existingCovidVSID;
        this.confirmDialog
          .alert({
            title: this.i18n.instant('dashboard.dialog.success'),
            message: this.i18n.instant('hao.caseSheet.covidVaccineSaveSuccess'),
            okText: this.i18n.instant('dashboard.dialog.ok'),
            status: 'success',
          })
          .subscribe();
      },
      error: () => {
        this.savingVaccine.set(false);
        this.confirmDialog
          .alert({
            title: this.i18n.instant('dashboard.dialog.error'),
            message: this.i18n.instant('hao.caseSheet.covidVaccineSaveError'),
            okText: this.i18n.instant('dashboard.dialog.ok'),
            status: 'error',
          })
          .subscribe();
      },
    });
  }

  save(): void {
    const beneficiaryRegID = this.beneficiaryId();
    if (this.form.invalid || beneficiaryRegID === null || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const usingComplaint = value.chiefComplaintMode === 'complaint';

    const symptoms = [
      value.covidFever ? 'Fever' : null,
      value.covidCough ? 'Cough' : null,
      value.covidBreathingDifficulty ? 'Breathing Difficulties' : null,
      value.covidNoSymptoms ? 'No Symptoms' : null,
    ]
      .filter((s): s is string => s !== null)
      .join(',');

    const contactHistory = [
      value.covidContactConfirmedCase ? 'Is a confirmed case of COVID-19' : null,
      value.covidContactSymptomatic ? 'Is having symptoms of Fever, Cough or breathing difficulty' : null,
      value.covidContactTravelHistory ? 'Has a history of travel to places reporting local transmission' : null,
    ]
      .filter((s): s is string => s !== null)
      .join(',');

    const travelType = [
      value.covidTravelDomestic ? 'domestic' : null,
      value.covidTravelInternational ? 'international' : null,
    ]
      .filter((s): s is string => s !== null)
      .join(',');

    const request: CaseSheetRequest = {
      beneficiaryRegID,
      benCallID: this.callId(),
      chiefComplaints: usingComplaint ? value.chiefComplaints.trim() : '',
      provisionalDiagnosis: usingComplaint ? value.provisionalDiagnosis : null,
      healthAdvice: !usingComplaint ? value.informationGiven : null,
      addedAdvice: usingComplaint ? value.recommendedAction.trim() || null : null,
      remarks: value.remarks?.trim() || null,
      providerServiceMapID: this.authStore.currentRole()?.providerServiceMapID ?? null,
      createdBy: this.authStore.user()?.userName ?? '',
      isSelf: !value.isPatientOther,
      actionByHAO: this.isHao() ? value.actionByRole.trim() : null,
      actionByMO: this.isMo() ? value.actionByRole.trim() : null,
      ageUnits: value.isPatientOther && this.isHao() ? value.patientAgeUnit : null,
      dOB: value.isPatientOther && this.isHao() ? value.patientDOB : null,
      isCOVIDAvailable: value.covidQc === 'yes',
      travel_14days: value.covidQc === 'yes' ? (value.covidTravelled ? 'yes' : 'no') : null,
      travel_type: travelType || null,
      travelledFrom: value.covidTravelledFrom.trim() || null,
      travelledTo: value.covidTravelledTo.trim() || null,
      modeOfTravel: value.covidModeOfTravel,
      symptoms: symptoms || null,
      COVID19_contact_history: contactHistory || null,
      medical_consultation:
        value.covidSeekMedicalConsult === null ? null : value.covidSeekMedicalConsult ? 'true' : 'false',
      riskLevel: this.isCo() ? value.riskLevel : null,
      treatmentRecommendation: this.isCo() ? value.treatmentRecommendation.trim() || null : null,
      categoryID: this.isCo() ? value.categoryID : null,
      subCategoryID: this.isCo() ? value.subCategoryID : null,
    };

    this.saving.set(true);
    this.haoService.saveCaseSheet(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.serviceAvailed.emit();
        this.confirmDialog
          .alert({
            title: this.i18n.instant('dashboard.dialog.success'),
            message: this.i18n.instant('hao.caseSheet.saveSuccess'),
            okText: this.i18n.instant('dashboard.dialog.ok'),
            status: 'success',
          })
          .subscribe();
      },
      error: () => {
        this.saving.set(false);
        this.confirmDialog
          .alert({
            title: this.i18n.instant('dashboard.dialog.error'),
            message: this.i18n.instant('hao.caseSheet.saveError'),
            okText: this.i18n.instant('dashboard.dialog.ok'),
            status: 'error',
          })
          .subscribe();
      },
    });
  }
}
