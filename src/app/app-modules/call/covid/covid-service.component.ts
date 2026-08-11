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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideShieldPlus } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../core/auth/auth.store';
import { CallStore } from '../call.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CovidService } from './covid.service';
import { CovidMasterData, CovidOption, CovidRisk } from './covid.models';

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';
const YES = 'YES';
const NO = 'NO';
const GENDER_FEMALE = 2;
const SYMPTOM_NONE = 'None';
const CONDITION_NONE = 'No existing conditions';

/** Sub-category master key per category label (legacy switch). */
const SUBCATEGORY_KEY: Record<string, keyof CovidMasterData> = {
  'Medical Assistance': 'medicalAssistance',
  'Food Supply': 'foodSupply',
  'LPG Supply': 'lpgSupply',
  'Stranded Assistance': 'strandedAssistance',
  'Law & Order': 'lawAndOrder',
  'Essential Services': 'essentialServicese',
  Transportation: 'transportation',
  'COVID Relief Fund': 'covidReliefFund',
};

/** A checkbox item for the symptom / health-condition multi-selects. */
interface CheckItem {
  value: string;
  checked: boolean;
  disabled: boolean;
}

/**
 * COVID-19 risk screening tab, ported (focused) from the legacy
 * `Covid19Component`. Captures category/sub-category, patient (self/other) age
 * & gender, the exposure/pregnancy/lab risk questions, and symptom /
 * health-condition multi-selects, computing a live COVID risk band (Low /
 * Medium / High) with the legacy rules, then saves the screening.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only. The
 * detailed domestic/international travel and fever capture are out of scope
 * here (the risk uses the travelled-in-14-days flag).
 */
@Component({
  selector: 'app-covid-service',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucideShieldPlus })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon name="lucideShieldPlus" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-foreground">
          {{ 'covid.title' | translate: lang() }}
        </h3>
      </header>

      @if (!hasContext()) {
        <p class="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          {{ 'covid.noContext' | translate: lang() }}
        </p>
      } @else {
        @if (errorMessage()) {
          <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
        }

        <form [formGroup]="form" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label for="covid-category" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'covid.category' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="covid-category" [class]="selectClass" formControlName="category" (change)="onCategoryChange()">
              <option [ngValue]="null" disabled>{{ 'covid.select' | translate: lang() }}</option>
              @for (c of categories(); track $index) {
                <option [ngValue]="c">{{ c.Value }}</option>
              }
            </select>
          </div>

          <div>
            <label for="covid-subcategory" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'covid.subCategory' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="covid-subcategory" [class]="selectClass" formControlName="subCategory">
              <option [ngValue]="null" disabled>{{ 'covid.select' | translate: lang() }}</option>
              @for (s of subCategories(); track $index) {
                <option [ngValue]="s">{{ s.Value }}</option>
              }
            </select>
          </div>

          <div>
            <label for="covid-forwhom" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'covid.forWhom' | translate: lang() }}
            </label>
            <select id="covid-forwhom" [class]="selectClass" formControlName="forWhom">
              <option [ngValue]="null" disabled>{{ 'covid.select' | translate: lang() }}</option>
              @for (p of testForList(); track $index) {
                <option [ngValue]="p.Value">{{ p.Value }}</option>
              }
            </select>
          </div>

          <div>
            <label for="covid-age" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'covid.age' | translate: lang() }}
            </label>
            <input id="covid-age" z-input class="w-full" type="number" inputmode="numeric" formControlName="age" />
          </div>

          <div>
            <label for="covid-gender" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'covid.gender' | translate: lang() }}
            </label>
            <select id="covid-gender" [class]="selectClass" formControlName="gender" (change)="onGenderChange()">
              <option [ngValue]="null" disabled>{{ 'covid.select' | translate: lang() }}</option>
              <option [ngValue]="1">{{ 'covid.male' | translate: lang() }}</option>
              <option [ngValue]="2">{{ 'covid.female' | translate: lang() }}</option>
              <option [ngValue]="3">{{ 'covid.transgender' | translate: lang() }}</option>
            </select>
          </div>

          @if (form.controls.gender.value === 2) {
            <div>
              <label for="covid-pregnant" class="mb-1 block text-xs font-medium text-muted-foreground">
                {{ 'covid.pregnant' | translate: lang() }}
              </label>
              <select id="covid-pregnant" [class]="selectClass" formControlName="isPregnant">
                <option [ngValue]="null" disabled>{{ 'covid.select' | translate: lang() }}</option>
                <option [ngValue]="yes">{{ 'covid.yes' | translate: lang() }}</option>
                <option [ngValue]="no">{{ 'covid.no' | translate: lang() }}</option>
              </select>
            </div>
          }

          @for (q of riskQuestions; track q.control) {
            <div>
              <label [attr.for]="'covid-' + q.control" class="mb-1 block text-xs font-medium text-muted-foreground">
                {{ q.labelKey | translate: lang() }}
              </label>
              <select [id]="'covid-' + q.control" [class]="selectClass" [formControlName]="q.control">
                <option [ngValue]="null" disabled>{{ 'covid.select' | translate: lang() }}</option>
                <option [ngValue]="yes">{{ 'covid.yes' | translate: lang() }}</option>
                <option [ngValue]="no">{{ 'covid.no' | translate: lang() }}</option>
              </select>
            </div>
          }
        </form>

        <!-- Symptoms -->
        <fieldset class="mt-5">
          <legend class="mb-2 text-sm font-medium text-foreground">{{ 'covid.symptoms' | translate: lang() }}</legend>
          <div class="flex flex-wrap gap-3">
            @for (s of symptoms(); track s.value; let i = $index) {
              <label class="flex items-center gap-2 text-sm" [class.opacity-50]="s.disabled">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  [checked]="s.checked"
                  [disabled]="s.disabled"
                  (change)="toggleSymptom(i)"
                />
                {{ s.value }}
              </label>
            }
          </div>
        </fieldset>

        <!-- Health conditions -->
        <fieldset class="mt-4">
          <legend class="mb-2 text-sm font-medium text-foreground">
            {{ 'covid.healthConditions' | translate: lang() }}
          </legend>
          <div class="flex flex-wrap gap-3">
            @for (h of healthConditions(); track h.value; let i = $index) {
              <label class="flex items-center gap-2 text-sm" [class.opacity-50]="h.disabled">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  [checked]="h.checked"
                  [disabled]="h.disabled"
                  (change)="toggleHealthCondition(i)"
                />
                {{ h.value }}
              </label>
            }
          </div>
        </fieldset>

        <!-- Risk -->
        @if (risk()) {
          <div
            class="mt-4 rounded-md border px-3 py-2 text-sm"
            [class]="
              risk() === 'Low Risk'
                ? 'border-primary text-foreground'
                : 'border-destructive bg-destructive/10 text-destructive'
            "
            role="status"
          >
            {{ 'covid.risk' | translate: lang() }}: {{ risk() }}
          </div>
        }

        <div class="mt-4">
          <button
            z-button
            type="button"
            zType="default"
            [zLoading]="saving()"
            [zDisabled]="!canSave()"
            (click)="save()"
          >
            {{ 'covid.save' | translate: lang() }}
          </button>
        </div>
      }
    </section>
  `,
})
export class CovidServiceComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly covid = inject(CovidService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly age = input<number | null>(null);
  readonly genderId = input<number | null>(null);

  /** Emitted after the screening is saved. */
  readonly saved = output<void>();

  readonly lang = this.i18n.language;
  readonly selectClass = SELECT_CLASS;
  readonly yes = YES;
  readonly no = NO;

  /** The exposure risk questions (yes/no), rendered generically. */
  readonly riskQuestions = [
    { control: 'travelledLast14Days', labelKey: 'covid.travelled' },
    { control: 'largeGathering', labelKey: 'covid.largeGathering' },
    { control: 'publicExposedPlaces', labelKey: 'covid.publicExposed' },
    { control: 'familyPublicExposedPlaces', labelKey: 'covid.familyExposed' },
    { control: 'laboratoryConfirmed', labelKey: 'covid.labConfirmed' },
  ] as const;

  private readonly master = signal<CovidMasterData>({});
  readonly categories = computed(() => this.master().covid19Category ?? []);
  readonly testForList = computed(() => this.master().testingPersonMaster ?? []);
  readonly subCategories = signal<CovidOption[]>([]);
  readonly symptoms = signal<CheckItem[]>([]);
  readonly healthConditions = signal<CheckItem[]>([]);
  readonly risk = signal<CovidRisk>('');
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    category: this.fb.control<CovidOption | null>(null, Validators.required),
    subCategory: this.fb.control<CovidOption | null>(null, Validators.required),
    forWhom: this.fb.control<string | null>(null),
    age: this.fb.control<number | null>(null),
    gender: this.fb.control<number | null>(null),
    isPregnant: this.fb.control<string | null>(null),
    travelledLast14Days: this.fb.control<string | null>(null),
    largeGathering: this.fb.control<string | null>(null),
    publicExposedPlaces: this.fb.control<string | null>(null),
    familyPublicExposedPlaces: this.fb.control<string | null>(null),
    laboratoryConfirmed: this.fb.control<string | null>(null),
  });

  readonly hasContext = computed(() => this.callStore.beneficiaryId() !== null);

  private readonly selectedSymptoms = computed(() =>
    this.symptoms()
      .filter((s) => s.checked)
      .map((s) => s.value),
  );
  private readonly selectedConditions = computed(() =>
    this.healthConditions()
      .filter((h) => h.checked)
      .map((h) => h.value),
  );

  constructor() {
    // Recompute the risk band whenever any scalar risk input changes.
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.recomputeRisk());
  }

  ngOnInit(): void {
    if (!this.hasContext()) {
      return;
    }
    this.form.patchValue({ age: this.age(), gender: this.genderId() });
    const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;
    this.covid
      .getCovidMasterData(providerServiceMapID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (master) => {
          this.master.set(master);
          this.symptoms.set(this.toItems(master.symptomsMaster));
          this.healthConditions.set(this.toItems(master.healthConditionsMaster));
        },
        error: (err: { errorMessage?: string }) =>
          this.errorMessage.set(err.errorMessage || this.i18n.instant('covid.loadError')),
      });
  }

  canSave(): boolean {
    return this.form.valid && !this.saving();
  }

  /** Clear the pregnancy answer when gender changes away from female (legacy). */
  onGenderChange(): void {
    if (this.form.controls.gender.value !== GENDER_FEMALE) {
      this.form.controls.isPregnant.setValue(null);
    }
  }

  onCategoryChange(): void {
    const category = this.form.controls.category.value;
    this.form.controls.subCategory.setValue(null);
    const key = category ? SUBCATEGORY_KEY[category.Value] : undefined;
    const list = key ? ((this.master()[key] as CovidOption[] | undefined) ?? []) : [];
    this.subCategories.set(list);
  }

  toggleSymptom(index: number): void {
    this.symptoms.update((items) => this.toggleWithExclusive(items, index, SYMPTOM_NONE));
    this.recomputeRisk();
  }

  toggleHealthCondition(index: number): void {
    this.healthConditions.update((items) => this.toggleWithExclusive(items, index, CONDITION_NONE));
    this.recomputeRisk();
  }

  save(): void {
    if (!this.canSave()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set('');
    this.covid
      .saveCovidData({
        beneficiaryRegID: this.callStore.beneficiaryId()?.toString() ?? null,
        benCallID: this.callStore.callId(),
        providerServiceMapID: this.authStore.currentRole()?.providerServiceMapID ?? null,
        genderID: v.gender,
        age: v.age,
        categoryID: v.category?.ID,
        categoryName: v.category?.Value,
        subCategoryID: v.subCategory?.ID,
        subCategoryName: v.subCategory?.Value,
        forWhomThisTest: v.forWhom ?? undefined,
        isPregnant: v.gender === GENDER_FEMALE ? (v.isPregnant ?? undefined) : undefined,
        travelledLast14Days: v.travelledLast14Days ?? undefined,
        largeGathering: v.largeGathering ?? undefined,
        publicExposedPlaces: v.publicExposedPlaces ?? undefined,
        famliyPublicExposedPlaces: v.familyPublicExposedPlaces ?? undefined,
        laboratoryConfirmed: v.laboratoryConfirmed ?? undefined,
        symptoms: this.selectedSymptoms().length ? this.selectedSymptoms() : undefined,
        healthConditions: this.selectedConditions().length ? this.selectedConditions() : undefined,
        riskOfCovid19: this.risk(),
        createdBy: this.authStore.user()?.userName ?? '',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          toast.success(this.i18n.instant('covid.saved'));
          this.reset();
          this.saved.emit();
        },
        error: (err: { errorMessage?: string }) => {
          this.saving.set(false);
          const msg = err.errorMessage || this.i18n.instant('covid.saveError');
          this.errorMessage.set(msg);
          toast.error(msg);
        },
      });
  }

  private reset(): void {
    this.form.reset({ age: this.age(), gender: this.genderId() });
    this.subCategories.set([]);
    this.symptoms.set(this.toItems(this.master().symptomsMaster));
    this.healthConditions.set(this.toItems(this.master().healthConditionsMaster));
    this.risk.set('');
  }

  private toItems(options: CovidOption[] | undefined): CheckItem[] {
    return (options ?? []).map((o) => ({ value: o.Value, checked: false, disabled: false }));
  }

  /**
   * Toggle item `index`; when the exclusive value (e.g. "None") is turned on,
   * clear + disable the others; when turned off, re-enable them.
   */
  private toggleWithExclusive(items: CheckItem[], index: number, exclusive: string): CheckItem[] {
    const target = items[index];
    if (!target) {
      return items;
    }
    const nowChecked = !target.checked;
    if (target.value === exclusive) {
      return items.map((it, i) =>
        i === index
          ? { ...it, checked: nowChecked }
          : { ...it, checked: nowChecked ? false : it.checked, disabled: nowChecked },
      );
    }
    return items.map((it, i) => (i === index ? { ...it, checked: nowChecked } : it));
  }

  /** COVID risk band, faithfully ported from the legacy `populateRisk`. */
  private recomputeRisk(): void {
    const v = this.form.getRawValue();
    const female = v.gender === GENDER_FEMALE;
    const health = this.selectedConditions().some((c) => c !== CONDITION_NONE);
    const symptom = this.selectedSymptoms().some((s) => s !== SYMPTOM_NONE);
    const large = v.largeGathering;
    const pub = v.publicExposedPlaces;
    const fam = v.familyPublicExposedPlaces;

    let risk: CovidRisk = '';
    const noneExposed = large === NO && pub === NO && fam === NO;

    if (female) {
      if (v.isPregnant === NO && noneExposed) risk = 'Low Risk';
      if (v.isPregnant === YES && v.travelledLast14Days === YES && noneExposed) risk = 'Low Risk';
      if (v.isPregnant === YES && v.travelledLast14Days === NO && noneExposed) risk = 'Low Risk';
      if (v.isPregnant === YES && large === YES && pub === YES && fam === YES) risk = 'Medium Risk';
    } else if (noneExposed) {
      risk = 'Low Risk';
    }

    if (health) risk = 'Medium Risk';
    if (large === YES || pub === YES || fam === YES) risk = 'Medium Risk';
    if (symptom && noneExposed) risk = 'Medium Risk';
    if (v.laboratoryConfirmed === YES) risk = 'High Risk';
    if (symptom && (large === YES || pub === YES || fam === YES)) risk = 'High Risk';

    this.risk.set(risk);
  }
}
