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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { of, switchMap } from 'rxjs';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHeartPulse } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../core/auth/auth.store';
import { CallStore } from '../call.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ScreeningService } from './screening.service';
import {
  QUESTION_TYPE,
  ScreeningError,
  ScreeningQuestion,
} from './screening.models';
import {
  SCREENING_SELECT_CLASS,
  calculateObesity,
  isObesityQuestion,
  normalizeLabel,
} from './screening.util';

const REMARKS_MAX = 50;
const GENDER_MALE = 1;
const GENDER_FEMALE = 2;

/**
 * Blood-pressure screening tab of the HAO workspace service-delivery step.
 *
 * Ported from the legacy `BPScreeningComponent`: BP questions (rank-0 hidden;
 * Gender / Age / Pregnancy pre-filled from the patient), an Obesity/BMI
 * calculator, a reference BP-range table (transfer to MO), and a mandatory
 * "remarks by HAO". Save persists the screening as a case-sheet row and emits
 * the new history id.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only (no
 * custom CSS, jQuery or Bootstrap).
 */
@Component({
  selector: 'app-bp-screening',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucideHeartPulse })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon name="lucideHeartPulse" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-foreground">
          {{ 'screening.bp.title' | translate: lang() }}
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

        <!-- Obesity / BMI -->
        <div class="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div>
            <label for="bp-weight" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'screening.weight' | translate: lang() }}
            </label>
            <input id="bp-weight" z-input class="w-full" type="number" inputmode="numeric" [formControl]="weight" />
          </div>
          <div>
            <label for="bp-height" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'screening.height' | translate: lang() }}
            </label>
            <input id="bp-height" z-input class="w-full" type="number" inputmode="numeric" [formControl]="height" />
          </div>
          <div>
            <button z-button type="button" zType="outline" [zDisabled]="weight.value == null && height.value == null" (click)="calculateBmi()">
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

        <!-- BP questions -->
        <form [formGroup]="bpForm">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            @for (q of questions(); track q.questionID) {
              <div>
                <label [attr.for]="'bp-' + q.questionID" class="mb-1 block text-xs font-medium text-muted-foreground">
                  {{ q.question }}
                </label>
                <select [id]="'bp-' + q.questionID" [class]="selectClass" [formControlName]="q.questionID.toString()">
                  <option [ngValue]="''" disabled>{{ 'screening.select' | translate: lang() }}</option>
                  @for (a of q.m_104QuestionScore; track $index) {
                    <option [ngValue]="a.answer">{{ a.answer }}</option>
                  }
                </select>
              </div>
            }
          </div>
        </form>

        <!-- Reference guideline (transfer to MO) -->
        <div class="mt-5">
          <h4 class="mb-2 text-sm font-medium text-foreground">
            {{ 'screening.guidelines' | translate: lang() }} — {{ 'screening.transferToMo' | translate: lang() }}
          </h4>
          <div class="overflow-x-auto rounded-md border border-border">
            <table class="w-full text-left text-xs">
              <thead class="bg-muted/50 text-muted-foreground">
                <tr>
                  <th class="px-2 py-1 font-medium">{{ 'screening.bp.category' | translate: lang() }}</th>
                  <th class="px-2 py-1 font-medium">{{ 'screening.bp.systolic' | translate: lang() }}</th>
                  <th class="px-2 py-1 font-medium">{{ 'screening.bp.diastolic' | translate: lang() }}</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-t border-border"><td class="px-2 py-1">{{ 'screening.normal' | translate: lang() }}</td><td class="px-2 py-1">90–119</td><td class="px-2 py-1">60–79</td></tr>
                <tr class="border-t border-border"><td class="px-2 py-1">{{ 'screening.bp.prehypertension' | translate: lang() }}</td><td class="px-2 py-1">120–139</td><td class="px-2 py-1">80–89</td></tr>
                <tr class="border-t border-border"><td class="px-2 py-1">{{ 'screening.bp.stage1' | translate: lang() }}</td><td class="px-2 py-1">140–159</td><td class="px-2 py-1">90–99</td></tr>
                <tr class="border-t border-border"><td class="px-2 py-1">{{ 'screening.bp.isolatedSystolic' | translate: lang() }}</td><td class="px-2 py-1">≥140</td><td class="px-2 py-1">&lt;90</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Remarks + save -->
        <div class="mt-4">
          <label for="bp-remarks" class="mb-1 block text-sm font-medium text-foreground">
            {{ 'screening.remarksByHao' | translate: lang() }} <span class="text-destructive">*</span>
          </label>
          <textarea id="bp-remarks" z-input rows="2" class="w-full" [maxlength]="remarksMax" [formControl]="remarks"></textarea>
          @if (remarks.invalid && remarks.touched) {
            <p class="mt-0.5 text-xs text-destructive">{{ 'screening.remarksRequired' | translate: lang() }}</p>
          }
        </div>

        <div class="mt-4">
          <button z-button type="button" zType="default" [zLoading]="saving()" [zDisabled]="remarks.invalid || saving()" (click)="save()">
            {{ 'screening.save' | translate: lang() }}
          </button>
        </div>
      }
    </section>
  `,
})
export class BpScreeningComponent implements OnInit {
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

  readonly questions = signal<ScreeningQuestion[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly obesity = signal('');

  bpForm: FormGroup = this.fb.group({});
  readonly weight = this.fb.control<number | null>(null);
  readonly height = this.fb.control<number | null>(null);
  readonly remarks = this.fb.control('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(REMARKS_MAX)],
  });

  readonly hasContext = computed(() => this.callStore.beneficiaryId() !== null);

  ngOnInit(): void {
    // The parent must have the patient's age/gender inputs set by the time the
    // beneficiary is resolved — Gender/Age/Pregnancy are pre-filled at load.
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
          const bpId = types.find((t) => t.questionType === QUESTION_TYPE.bp)?.questionTypeID;
          return bpId == null
            ? of<ScreeningQuestion[]>([])
            : this.screening.getQuestions(bpId, providerServiceMapID);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (questions) => {
          this.loading.set(false);
          this.buildForm(questions);
        },
        error: (err: ScreeningError) => this.fail(err),
      });
  }

  private fail(err: ScreeningError): void {
    this.loading.set(false);
    this.errorMessage.set(err.errorMessage || this.i18n.instant('screening.loadError'));
  }

  private buildForm(all: ScreeningQuestion[]): void {
    // Legacy hides rank-0 questions and handles obesity via the BMI block.
    const shown = all.filter((q) => q.questionRank !== 0 && !isObesityQuestion(q.question));
    const group: Record<string, unknown[]> = {};
    for (const q of shown) {
      group[q.questionID.toString()] = [this.prefill(q)];
    }
    this.bpForm = this.fb.group(group);
    this.questions.set(shown);
  }

  /** Pre-fill Gender / Age / Pregnancy answers from the patient (legacy logic). */
  private prefill(q: ScreeningQuestion): string {
    const scores = q.m_104QuestionScore;
    const gender = this.genderId();
    const age = this.age();
    // Normalise labels so whitespace/case drift in the backend text still matches.
    const label = normalizeLabel(q.question);
    if (label === normalizeLabel('Gender')) {
      if (gender === GENDER_MALE && scores[0]) return scores[0].answer;
      if (gender === GENDER_FEMALE && scores[1]) return scores[1].answer;
    }
    if (label === normalizeLabel('Age; Men > 30, Women> 50') && age != null && scores.length >= 2) {
      const meets = (age > 30 && gender === GENDER_MALE) || (age > 50 && gender === GENDER_FEMALE);
      return meets ? scores[0].answer : scores[1].answer;
    }
    if (label === normalizeLabel('Pregnancy ?') && gender === GENDER_MALE && scores[2]) {
      return scores[2].answer;
    }
    return '';
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
        diseaseSummary: 'Hyper Tension',
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
          this.remarks.reset('');
          this.weight.reset(null);
          this.height.reset(null);
          this.obesity.set('');
          this.load();
        },
        error: (err: ScreeningError) => {
          this.saving.set(false);
          const msg = err.errorMessage || this.i18n.instant('screening.saveError');
          this.errorMessage.set(msg);
          toast.error(msg);
        },
      });
  }
}
