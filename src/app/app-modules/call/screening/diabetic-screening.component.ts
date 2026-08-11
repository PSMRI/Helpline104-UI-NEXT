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
  input,
  output,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of, switchMap } from 'rxjs';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideActivity, lucideChevronLeft } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../core/auth/auth.store';
import { CallStore } from '../call.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationKey } from '../../core/i18n/locales';
import { ScreeningService } from './screening.service';
import { QUESTION_TYPE, ScreeningError, ScreeningQuestion } from './screening.models';
import { SCREENING_SELECT_CLASS, calculateObesity, isObesityQuestion } from './screening.util';

const REMARKS_MAX = 500;

type View = 'criteria' | 'risk';
type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Diabetic screening tab of the HAO workspace service-delivery step.
 *
 * Two views, ported from the legacy `DiabeticScreeningComponent`:
 *   1. Criteria — scored questions (age is pre-filled from the patient's age);
 *      "Check" totals the score and shows the risk band (low / medium→MO /
 *      high→MO).
 *   2. Risk factors — risk-factor questions, an Obesity/BMI calculator
 *      (weight + height → BMI → obese?), reference guideline tables, and a
 *      mandatory "remarks by HAO"; Save persists the screening as a case-sheet
 *      row and emits the new history id.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only (no
 * custom CSS, jQuery or Bootstrap). Beneficiary/agent/service context is read
 * from the AuthStore/CallStore as in beneficiary registration.
 */
@Component({
  selector: 'app-diabetic-screening',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucideActivity, lucideChevronLeft })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon name="lucideActivity" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-foreground">
          {{ 'screening.diabetic.title' | translate: lang() }}
        </h3>
      </header>

      @if (!hasContext()) {
        <p class="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          {{ 'screening.noContext' | translate: lang() }}
        </p>
      } @else if (loading()) {
        <p class="py-6 text-center text-sm text-muted-foreground">
          {{ 'screening.loading' | translate: lang() }}
        </p>
      } @else {
        @if (errorMessage()) {
          <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
        }

        <!-- ===== Criteria view ===== -->
        @if (view() === 'criteria') {
          <form [formGroup]="criteriaForm">
            <h4 class="mb-3 text-sm font-medium text-foreground">
              {{ 'screening.diabetic.criteria' | translate: lang() }}
            </h4>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (q of criteriaQuestions(); track q.questionID) {
                <div>
                  <label
                    [attr.for]="'crit-' + q.questionID"
                    class="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    {{ q.question }} <span class="text-destructive">*</span>
                  </label>
                  <select
                    [id]="'crit-' + q.questionID"
                    [class]="selectClass"
                    [formControlName]="q.questionID.toString()"
                  >
                    <option [ngValue]="''" disabled>{{ 'screening.select' | translate: lang() }}</option>
                    @for (a of q.m_104QuestionScore; track $index) {
                      <option [ngValue]="a.score">{{ a.answer }}</option>
                    }
                  </select>
                </div>
              }
            </div>

            @if (scoreResult(); as r) {
              <div
                class="mt-4 rounded-md border px-3 py-2 text-sm"
                [ngClass]="
                  r.level === 'low'
                    ? 'border-primary text-foreground'
                    : 'border-destructive bg-destructive/10 text-destructive'
                "
                role="status"
              >
                {{ 'screening.diabetic.scorePrefix' | translate: lang() }} {{ r.score }} —
                {{ resultKey(r.level) | translate: lang() }}
              </div>
            }

            <div class="mt-4 flex flex-wrap gap-2">
              <button z-button type="button" zType="default" [zDisabled]="criteriaForm.invalid" (click)="checkStatus()">
                {{ 'screening.diabetic.check' | translate: lang() }}
              </button>
              <button z-button type="button" zType="outline" (click)="view.set('risk')">
                {{ 'screening.diabetic.riskFactors' | translate: lang() }}
              </button>
            </div>
          </form>
        }

        <!-- ===== Risk-factors view ===== -->
        @if (view() === 'risk') {
          <h4 class="mb-3 text-sm font-medium text-foreground">
            {{ 'screening.diabetic.riskFactors' | translate: lang() }}
          </h4>

          <!-- Obesity / BMI -->
          <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div>
              <label for="diab-weight" class="mb-1 block text-xs font-medium text-muted-foreground">
                {{ 'screening.weight' | translate: lang() }}
              </label>
              <input id="diab-weight" z-input class="w-full" type="number" inputmode="numeric" [formControl]="weight" />
            </div>
            <div>
              <label for="diab-height" class="mb-1 block text-xs font-medium text-muted-foreground">
                {{ 'screening.height' | translate: lang() }}
              </label>
              <input id="diab-height" z-input class="w-full" type="number" inputmode="numeric" [formControl]="height" />
            </div>
            <div>
              <button
                z-button
                type="button"
                zType="outline"
                [zDisabled]="weight.value == null && height.value == null"
                (click)="calculateBmi()"
              >
                {{ 'screening.calculateBmi' | translate: lang() }}
              </button>
            </div>
            <div>
              <span class="mb-1 block text-xs font-medium text-muted-foreground">
                {{ 'screening.obesity' | translate: lang() }}
              </span>
              <p class="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm">
                {{ obesity() || '—' }}
              </p>
            </div>
          </div>

          <!-- Risk-factor questions -->
          <form [formGroup]="riskForm">
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              @for (q of riskQuestions(); track q.questionID) {
                <div>
                  <label
                    [attr.for]="'risk-' + q.questionID"
                    class="mb-1 block text-xs font-medium text-muted-foreground"
                  >
                    {{ q.question }}
                  </label>
                  <select
                    [id]="'risk-' + q.questionID"
                    [class]="selectClass"
                    [formControlName]="q.questionID.toString()"
                  >
                    <option [ngValue]="''" disabled>{{ 'screening.select' | translate: lang() }}</option>
                    @for (a of q.m_104QuestionScore; track $index) {
                      <option [ngValue]="a.answer">{{ a.answer }}</option>
                    }
                  </select>
                </div>
              }
            </div>
          </form>

          <!-- Reference guidelines -->
          <div class="mt-5 grid gap-4 lg:grid-cols-2">
            <div class="overflow-x-auto rounded-md border border-border">
              <table class="w-full text-left text-xs">
                <thead class="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th class="px-2 py-1 font-medium">{{ 'screening.diabetic.parameter' | translate: lang() }}</th>
                    <th class="px-2 py-1 font-medium">{{ 'screening.normal' | translate: lang() }}</th>
                    <th class="px-2 py-1 font-medium">{{ 'screening.diabetic.prediabetic' | translate: lang() }}</th>
                    <th class="px-2 py-1 font-medium">{{ 'screening.diabetic.diabetic' | translate: lang() }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="border-t border-border">
                    <td class="px-2 py-1">HbA1c</td>
                    <td class="px-2 py-1">&lt;5.7%</td>
                    <td class="px-2 py-1">5.7–6.4%</td>
                    <td class="px-2 py-1">≥6.5%</td>
                  </tr>
                  <tr class="border-t border-border">
                    <td class="px-2 py-1">Fasting plasma glucose</td>
                    <td class="px-2 py-1">&lt;100 mg/dl</td>
                    <td class="px-2 py-1">100–125 mg/dl</td>
                    <td class="px-2 py-1">≥126 mg/dl</td>
                  </tr>
                  <tr class="border-t border-border">
                    <td class="px-2 py-1">OGTT (75 g)</td>
                    <td class="px-2 py-1">&lt;140 mg/dl</td>
                    <td class="px-2 py-1">140–199 mg/dl</td>
                    <td class="px-2 py-1">≥200 mg/dl</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="overflow-x-auto rounded-md border border-border">
              <table class="w-full text-left text-xs">
                <thead class="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th class="px-2 py-1 font-medium">{{ 'screening.diabetic.condition' | translate: lang() }}</th>
                    <th class="px-2 py-1 font-medium">{{ 'screening.action' | translate: lang() }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="border-t border-border">
                    <td class="px-2 py-1">No risk factor, glucose normal</td>
                    <td class="px-2 py-1">Retest in 1–2 years; healthy lifestyle</td>
                  </tr>
                  <tr class="border-t border-border">
                    <td class="px-2 py-1">Risk factor present, glucose normal/unknown</td>
                    <td class="px-2 py-1">Lifestyle advice; if unknown, get tested</td>
                  </tr>
                  <tr class="border-t border-border">
                    <td class="px-2 py-1">Risk factor present &amp; glucose high</td>
                    <td class="px-2 py-1">{{ 'screening.transferToMo' | translate: lang() }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Remarks + actions -->
          <div class="mt-4">
            <label for="diab-remarks" class="mb-1 block text-sm font-medium text-foreground">
              {{ 'screening.remarksByHao' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <textarea
              id="diab-remarks"
              z-input
              rows="2"
              class="w-full"
              [maxlength]="remarksMax"
              [formControl]="remarks"
            ></textarea>
            @if (remarks.invalid && remarks.touched) {
              <p class="mt-0.5 text-xs text-destructive">{{ 'screening.remarksRequired' | translate: lang() }}</p>
            }
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <button
              z-button
              type="button"
              zType="default"
              [zLoading]="saving()"
              [zDisabled]="remarks.invalid || saving()"
              (click)="save()"
            >
              {{ 'screening.save' | translate: lang() }}
            </button>
            <button z-button type="button" zType="outline" (click)="view.set('criteria')">
              <ng-icon name="lucideChevronLeft" size="16" aria-hidden="true" />
              {{ 'screening.back' | translate: lang() }}
            </button>
          </div>
        }
      }
    </section>
  `,
})
export class DiabeticScreeningComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly screening = inject(ScreeningService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly patientName = input('');
  readonly age = input<number | null>(null);
  readonly genderId = input<number | null>(null);

  /** Emits the created case-sheet history id after a successful save. */
  readonly saved = output<number>();

  readonly lang = this.i18n.language;
  readonly selectClass = SCREENING_SELECT_CLASS;
  readonly remarksMax = REMARKS_MAX;

  readonly view = signal<View>('criteria');
  readonly criteriaQuestions = signal<ScreeningQuestion[]>([]);
  readonly riskQuestions = signal<ScreeningQuestion[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly scoreResult = signal<{ score: number; level: RiskLevel } | null>(null);
  readonly obesity = signal('');

  criteriaForm: FormGroup = this.fb.group({});
  riskForm: FormGroup = this.fb.group({});
  readonly weight = this.fb.control<number | null>(null);
  readonly height = this.fb.control<number | null>(null);
  readonly remarks = this.fb.control('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(REMARKS_MAX)],
  });

  readonly hasContext = computed(() => this.callStore.beneficiaryId() !== null);

  ngOnInit(): void {
    // The parent must have the patient's age/gender inputs set by the time the
    // beneficiary is resolved — the Age band is pre-filled from age() at load.
    if (this.hasContext()) {
      this.load();
    }
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;

    this.screening
      .getQuestionTypes()
      .pipe(
        switchMap((types) => {
          const diabeticId = types.find((t) => t.questionType === QUESTION_TYPE.diabetic)?.questionTypeID;
          const riskId = types.find((t) => t.questionType === QUESTION_TYPE.diabeticRiskFactors)?.questionTypeID;
          return forkJoin({
            criteria:
              diabeticId != null
                ? this.screening.getQuestions(diabeticId, providerServiceMapID)
                : of<ScreeningQuestion[]>([]),
            risk:
              riskId != null ? this.screening.getQuestions(riskId, providerServiceMapID) : of<ScreeningQuestion[]>([]),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ criteria, risk }) => {
          this.loading.set(false);
          this.buildCriteria(criteria);
          this.buildRisk(risk);
        },
        error: (err: ScreeningError) => this.fail(err),
      });
  }

  private fail(err: ScreeningError): void {
    this.loading.set(false);
    this.errorMessage.set(err.errorMessage || this.i18n.instant('screening.loadError'));
  }

  private buildCriteria(questions: ScreeningQuestion[]): void {
    const group: Record<string, unknown[]> = {};
    for (const q of questions) {
      let initial: number | string = '';
      // Legacy pre-fills the "Age" score band from the patient's age.
      if (q.question === 'Age') {
        const a = this.age();
        const scores = q.m_104QuestionScore;
        if (a != null && scores.length >= 3) {
          initial = a < 35 ? scores[0].score : a <= 49 ? scores[1].score : scores[2].score;
        }
      }
      group[q.questionID.toString()] = [initial, Validators.required];
    }
    this.criteriaForm = this.fb.group(group);
    this.criteriaQuestions.set(questions);
    this.scoreResult.set(null);
  }

  private buildRisk(questions: ScreeningQuestion[]): void {
    // The obesity question is handled by the weight/height/BMI block, not a select.
    const selectable = questions.filter((q) => !isObesityQuestion(q.question));
    const group: Record<string, unknown[]> = {};
    for (const q of selectable) {
      group[q.questionID.toString()] = [''];
    }
    this.riskForm = this.fb.group(group);
    this.riskQuestions.set(selectable);
  }

  /** The (typed) translation key for a risk level's result message. */
  resultKey(level: RiskLevel): TranslationKey {
    return level === 'low'
      ? 'screening.diabetic.result.low'
      : level === 'medium'
        ? 'screening.diabetic.result.medium'
        : 'screening.diabetic.result.high';
  }

  checkStatus(): void {
    if (this.criteriaForm.invalid) {
      this.criteriaForm.markAllAsTouched();
      return;
    }
    let total = 0;
    for (const value of Object.values(this.criteriaForm.getRawValue())) {
      const n = Number(value);
      if (!Number.isNaN(n)) {
        total += n;
      }
    }
    const level: RiskLevel = total <= 30 ? 'low' : total <= 50 ? 'medium' : 'high';
    this.scoreResult.set({ score: total, level });
  }

  calculateBmi(): void {
    this.obesity.set(calculateObesity(this.weight.value, this.height.value));
  }

  save(): void {
    if (this.remarks.invalid || this.saving() || !this.hasContext()) {
      this.remarks.markAsTouched();
      return;
    }
    const createdBy = this.authStore.user()?.userName ?? '';
    this.saving.set(true);
    this.errorMessage.set('');
    this.screening
      .saveScreening({
        beneficiaryRegID: this.callStore.beneficiaryId(),
        diseaseSummary: 'diabetic',
        actionByHAO: this.remarks.value.trim(),
        deleted: false,
        createdBy,
        patientName: this.patientName().trim(),
        patientAge: this.age(),
        patientGenderID: this.genderId(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          toast.success(this.i18n.instant('screening.saved'));
          if (res.benHistoryID != null) {
            this.saved.emit(res.benHistoryID);
          }
          this.resetAfterSave();
        },
        error: (err: ScreeningError) => {
          this.saving.set(false);
          const msg = err.errorMessage || this.i18n.instant('screening.saveError');
          this.errorMessage.set(msg);
          toast.error(msg);
        },
      });
  }

  private resetAfterSave(): void {
    this.remarks.reset('');
    this.weight.reset(null);
    this.height.reset(null);
    this.obesity.set('');
    this.scoreResult.set(null);
    this.view.set('criteria');
    this.load();
  }
}
