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
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideChevronLeft,
  lucideLoaderCircle,
  lucideRotateCcw,
  lucideStethoscope,
  lucideTriangleAlert,
} from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CdssService } from './cdss.service';
import {
  CdssDiagnosis,
  CdssError,
  CdssGender,
  CdssQuestionnaire,
  CdssSelection,
} from './cdss.models';

/** Which step of the CDSS flow is on screen. */
type Stage = 'idle' | 'questions' | 'diagnoses';

/** Role that may act on an emergency without a transfer prompt. */
const MEDICAL_OFFICER_ROLE = 'MO';

/** Process-wide counter for unique element ids across component instances. */
let instanceCounter = 0;

/**
 * A suggested diagnosis plus the agent's working state: whether it is accepted
 * and which of its symptoms the agent marked present.
 */
interface DiagnosisVm extends CdssDiagnosis {
  accepted: boolean;
  /** Zero-based indices into `symptoms` that the agent marked present. */
  selectedSymptoms: number[];
}

/**
 * CDSS suggestion panel for the HAO case-sheet step, alongside the SNOMED
 * search. Given a chief complaint (+ patient age/gender) it fetches a refining
 * questionnaire, then — once the agent picks the closest question — the
 * suggested diagnoses with their health advice (information, dos & don'ts,
 * self-care, recommended action). The agent marks present symptoms, accepts the
 * relevant diagnoses, optionally edits the recommended action, and confirms;
 * the accepted {@link CdssSelection} is emitted to the parent.
 *
 * Rebuilt from the legacy `cdss-dialog` + `algo-component` as an inline,
 * accessible panel: standalone, OnPush + signals, ZardUI + Tailwind utilities
 * (no custom CSS, no jQuery, no Bootstrap). Stale responses from rapid clicks
 * are discarded via monotonic request-id guards.
 */
@Component({
  selector: 'app-cdss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [
    provideIcons({
      lucideStethoscope,
      lucideTriangleAlert,
      lucideLoaderCircle,
      lucideCheck,
      lucideChevronLeft,
      lucideRotateCcw,
    }),
  ],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon
          name="lucideStethoscope"
          size="18"
          class="text-primary"
          aria-hidden="true"
        />
        <h3 class="text-sm font-semibold text-foreground">
          {{ 'cdss.title' | translate: lang() }}
        </h3>
      </header>

      <!-- Trigger / context -->
      <div class="flex flex-wrap items-center gap-3">
        <button
          z-button
          type="button"
          zType="default"
          [zLoading]="loading()"
          [zDisabled]="!canFetch()"
          (click)="getSuggestions()"
        >
          {{ 'cdss.getSuggestions' | translate: lang() }}
        </button>
        @if (complaint().trim()) {
          <span class="text-sm text-muted-foreground">
            {{ 'cdss.forComplaint' | translate: lang() }}:
            <span class="font-medium text-foreground">{{ complaint().trim() }}</span>
          </span>
        }
      </div>

      @if (!hasContext()) {
        <p class="mt-3 text-sm text-muted-foreground">
          {{ 'cdss.missingContext' | translate: lang() }}
        </p>
      }

      @if (errorMessage()) {
        <p class="mt-3 text-sm font-medium text-destructive" role="alert">
          {{ errorMessage() }}
        </p>
      }

      <!-- Questions -->
      @if (stage() === 'questions') {
        <div class="mt-5">
          <h4 class="mb-2 text-sm font-medium text-foreground">
            {{ 'cdss.questionsHeading' | translate: lang() }}
          </h4>
          @if (questionnaire()?.questions?.length) {
            <ul class="flex flex-col gap-2" role="list">
              @for (
                q of questionnaire()!.questions;
                track $index;
                let i = $index
              ) {
                <li>
                  <button
                    type="button"
                    class="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    [class.border-primary]="selectedQuestion() === i"
                    [class.bg-accent]="selectedQuestion() === i"
                    [class.border-border]="selectedQuestion() !== i"
                    [attr.aria-pressed]="selectedQuestion() === i"
                    (click)="selectQuestion(i)"
                  >
                    <span>{{ q.question }}</span>
                    @if (q.isEmergency) {
                      <span
                        class="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                      >
                        <ng-icon
                          name="lucideTriangleAlert"
                          size="12"
                          aria-hidden="true"
                        />
                        {{ 'cdss.emergencyBadge' | translate: lang() }}
                      </span>
                    }
                  </button>
                </li>
              }
            </ul>
          } @else {
            <p class="text-sm text-muted-foreground">
              {{ 'cdss.noQuestions' | translate: lang() }}
            </p>
          }
        </div>
      }

      <!-- Diagnoses & advice -->
      @if (stage() === 'diagnoses') {
        <div class="mt-5">
          @if (emergencyWarning()) {
            <div
              class="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              <ng-icon
                name="lucideTriangleAlert"
                size="16"
                class="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <span>{{ 'cdss.emergencyWarning' | translate: lang() }}</span>
            </div>
          }

          <h4 class="mb-3 text-sm font-medium text-foreground">
            {{ 'cdss.diagnosesHeading' | translate: lang() }}
          </h4>

          @if (diagnoses().length) {
            <ul class="flex flex-col gap-3" role="list">
              @for (d of diagnoses(); track $index; let di = $index) {
                <li
                  class="rounded-md border p-3"
                  [class.border-primary]="d.accepted"
                  [class.border-border]="!d.accepted"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <label class="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        [checked]="d.accepted"
                        (change)="toggleAccept(di)"
                      />
                      {{ d.disease }}
                    </label>
                    @if (d.symptoms.length) {
                      <span class="text-xs text-muted-foreground">
                        {{ 'cdss.match' | translate: lang() }}:
                        {{ matchCount(d) }}/{{ d.symptoms.length }}
                      </span>
                    }
                  </div>

                  @if (d.symptoms.length) {
                    <div class="mt-2">
                      <p class="mb-1 text-xs font-medium text-muted-foreground">
                        {{ 'cdss.symptomsPresent' | translate: lang() }}
                      </p>
                      <div class="flex flex-wrap gap-1.5">
                        @for (s of d.symptoms; track $index; let si = $index) {
                          <button
                            type="button"
                            class="rounded-full border px-2.5 py-1 text-xs"
                            [class.border-primary]="d.selectedSymptoms.includes(si)"
                            [class.bg-primary]="d.selectedSymptoms.includes(si)"
                            [class.text-primary-foreground]="
                              d.selectedSymptoms.includes(si)
                            "
                            [class.border-border]="!d.selectedSymptoms.includes(si)"
                            [attr.aria-pressed]="d.selectedSymptoms.includes(si)"
                            (click)="toggleSymptom(di, si)"
                          >
                            {{ s }}
                          </button>
                        }
                      </div>
                    </div>
                  }

                  @if (d.information.length) {
                    <div class="mt-3">
                      <p class="mb-1 text-xs font-medium text-muted-foreground">
                        {{ 'cdss.information' | translate: lang() }}
                      </p>
                      <ul
                        class="list-disc pl-5 text-sm text-foreground marker:text-muted-foreground"
                      >
                        @for (item of d.information; track $index) {
                          <li>{{ item }}</li>
                        }
                      </ul>
                    </div>
                  }

                  @if (d.dosDonts.length) {
                    <div class="mt-3">
                      <p class="mb-1 text-xs font-medium text-muted-foreground">
                        {{ 'cdss.dosDonts' | translate: lang() }}
                      </p>
                      <ul
                        class="list-disc pl-5 text-sm text-foreground marker:text-muted-foreground"
                      >
                        @for (item of d.dosDonts; track $index) {
                          <li>{{ item }}</li>
                        }
                      </ul>
                    </div>
                  }

                  @if (d.selfCare.length) {
                    <div class="mt-3">
                      <p class="mb-1 text-xs font-medium text-muted-foreground">
                        {{ 'cdss.selfCare' | translate: lang() }}
                      </p>
                      <ul
                        class="list-disc pl-5 text-sm text-foreground marker:text-muted-foreground"
                      >
                        @for (item of d.selfCare; track $index) {
                          <li>{{ item }}</li>
                        }
                      </ul>
                    </div>
                  }

                  @if (d.action.length) {
                    <div class="mt-3">
                      <p class="mb-1 text-xs font-medium text-muted-foreground">
                        {{ 'cdss.action' | translate: lang() }}
                      </p>
                      <ul
                        class="list-disc pl-5 text-sm text-foreground marker:text-muted-foreground"
                      >
                        @for (item of d.action; track $index) {
                          <li>{{ item }}</li>
                        }
                      </ul>
                    </div>
                  }
                </li>
              }
            </ul>

            <!-- Editable recommended action (agent may modify before accepting) -->
            <div class="mt-4">
              <div class="mb-1 flex items-center justify-between gap-2">
                <label
                  [attr.for]="actionId"
                  class="block text-sm font-medium text-foreground"
                >
                  {{ 'cdss.recommendedActionLabel' | translate: lang() }}
                </label>
                @if (actionEdited()) {
                  <button
                    type="button"
                    class="text-xs font-medium text-primary hover:underline"
                    (click)="resetAction()"
                  >
                    {{ 'cdss.resetAction' | translate: lang() }}
                  </button>
                }
              </div>
              <textarea
                [id]="actionId"
                z-input
                rows="3"
                class="w-full"
                [value]="actionText()"
                [placeholder]="'cdss.recommendedActionPlaceholder' | translate: lang()"
                (input)="onActionInput($event)"
              ></textarea>
            </div>

            @if (!canAccept()) {
              <p class="mt-2 text-sm text-muted-foreground">
                {{ 'cdss.selectAtLeastOne' | translate: lang() }}
              </p>
            }

            <div class="mt-4 flex flex-wrap gap-2">
              <button
                z-button
                type="button"
                zType="default"
                [zDisabled]="!canAccept() || disabled()"
                (click)="accept()"
              >
                <ng-icon name="lucideCheck" size="16" aria-hidden="true" />
                {{ 'cdss.accept' | translate: lang() }}
              </button>
              <button z-button type="button" zType="outline" (click)="back()">
                <ng-icon name="lucideChevronLeft" size="16" aria-hidden="true" />
                {{ 'cdss.back' | translate: lang() }}
              </button>
              <button z-button type="button" zType="ghost" (click)="restart()">
                <ng-icon name="lucideRotateCcw" size="16" aria-hidden="true" />
                {{ 'cdss.restart' | translate: lang() }}
              </button>
            </div>
          } @else {
            <p class="text-sm text-muted-foreground">
              {{ 'cdss.noDiagnoses' | translate: lang() }}
            </p>
            <div class="mt-4">
              <button z-button type="button" zType="outline" (click)="back()">
                <ng-icon name="lucideChevronLeft" size="16" aria-hidden="true" />
                {{ 'cdss.back' | translate: lang() }}
              </button>
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class CdssComponent {
  private readonly i18n = inject(I18nService);
  private readonly cdss = inject(CdssService);
  private readonly destroyRef = inject(DestroyRef);

  /** Chief complaint to advise on (e.g. the selected SNOMED term). */
  readonly complaint = input('');
  /** Patient age (years); required by the CDSS API. */
  readonly age = input<number | null>(null);
  /** Patient gender code; required by the CDSS API. */
  readonly gender = input<CdssGender | null>(null);
  /** Current agent role; a non-MO role gets an emergency-transfer warning. */
  readonly role = input('');
  /** Disable the trigger (e.g. while the parent form is submitting). */
  readonly disabled = input(false);

  /** Emitted when the agent accepts one or more CDSS suggestions. */
  readonly selection = output<CdssSelection>();

  readonly lang = this.i18n.language;

  private readonly uid = instanceCounter++;
  /** Unique id for the recommended-action textarea / its label association. */
  readonly actionId = `cdss-action-${this.uid}`;

  readonly stage = signal<Stage>('idle');
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly questionnaire = signal<CdssQuestionnaire | null>(null);
  readonly selectedQuestion = signal<number | null>(null);
  readonly emergencyWarning = signal(false);

  readonly diagnoses = signal<DiagnosisVm[]>([]);

  /**
   * Agent's edit of the recommended action. `null` means "use the suggested
   * text derived from the accepted diagnoses"; any string is an explicit edit.
   */
  private readonly actionOverride = signal<string | null>(null);

  /** Monotonic guards so a slow, superseded response is discarded. */
  private questionsReqId = 0;
  private diagnosesReqId = 0;

  /** Patient context is complete enough to call the API. */
  readonly hasContext = computed(
    () =>
      this.complaint().trim().length > 0 &&
      this.age() !== null &&
      this.gender() !== null,
  );

  readonly canFetch = computed(
    () => this.hasContext() && !this.disabled() && !this.loading(),
  );

  readonly acceptedDiagnoses = computed(() =>
    this.diagnoses().filter((d) => d.accepted),
  );

  readonly canAccept = computed(() => this.acceptedDiagnoses().length > 0);

  /** Recommended action suggested from the accepted diagnoses' actions. */
  private readonly suggestedAction = computed(() => {
    const actions = this.acceptedDiagnoses().flatMap((d) => d.action);
    return Array.from(new Set(actions)).join('\n');
  });

  /** Value shown in the editable action box: the agent's edit, else suggested. */
  readonly actionText = computed(() => this.actionOverride() ?? this.suggestedAction());

  /** Whether the agent has manually edited the action (override is active). */
  readonly actionEdited = computed(() => this.actionOverride() !== null);

  /** Fetch the questionnaire for the current complaint + patient context. */
  getSuggestions(): void {
    const symptom = this.complaint().trim();
    const age = this.age();
    const gender = this.gender();
    if (!symptom || age === null || gender === null) {
      return;
    }

    const reqId = ++this.questionsReqId;
    this.resetFlow();
    this.loading.set(true);
    this.errorMessage.set('');

    this.cdss
      .getQuestions({ age, gender, symptom })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (questionnaire) => {
          if (reqId !== this.questionsReqId) {
            return;
          }
          this.loading.set(false);
          this.questionnaire.set(questionnaire);
          this.stage.set('questions');
        },
        error: (err: CdssError) => {
          if (reqId !== this.questionsReqId) {
            return;
          }
          this.loading.set(false);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }

  /** Pick the closest question and fetch the suggested diagnoses. */
  selectQuestion(index: number): void {
    const questionnaire = this.questionnaire();
    if (!questionnaire) {
      return;
    }
    const question = questionnaire.questions[index];
    this.selectedQuestion.set(index);
    this.emergencyWarning.set(
      question?.isEmergency === true && this.role() !== MEDICAL_OFFICER_ROLE,
    );

    const reqId = ++this.diagnosesReqId;
    this.loading.set(true);
    this.errorMessage.set('');

    this.cdss
      .getResult({ complaintId: questionnaire.id, selected: index })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          if (reqId !== this.diagnosesReqId) {
            return;
          }
          this.loading.set(false);
          this.diagnoses.set(
            list.map((d) => ({ ...d, accepted: false, selectedSymptoms: [] })),
          );
          this.actionOverride.set(null);
          this.stage.set('diagnoses');
        },
        error: (err: CdssError) => {
          if (reqId !== this.diagnosesReqId) {
            return;
          }
          this.loading.set(false);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }

  /** Number of a diagnosis's symptoms the agent marked present. */
  matchCount(diagnosis: DiagnosisVm): number {
    return diagnosis.selectedSymptoms.length;
  }

  toggleSymptom(diagnosisIndex: number, symptomIndex: number): void {
    this.diagnoses.update((list) =>
      list.map((d, i) => {
        if (i !== diagnosisIndex) {
          return d;
        }
        const present = d.selectedSymptoms.includes(symptomIndex);
        return {
          ...d,
          selectedSymptoms: present
            ? d.selectedSymptoms.filter((s) => s !== symptomIndex)
            : [...d.selectedSymptoms, symptomIndex],
        };
      }),
    );
  }

  toggleAccept(diagnosisIndex: number): void {
    this.diagnoses.update((list) =>
      list.map((d, i) =>
        i === diagnosisIndex ? { ...d, accepted: !d.accepted } : d,
      ),
    );
    // With nothing accepted there is no suggested action to diverge from, so
    // drop any manual edit and fall back to the (empty) suggestion.
    if (this.acceptedDiagnoses().length === 0) {
      this.actionOverride.set(null);
    }
  }

  onActionInput(event: Event): void {
    this.actionOverride.set((event.target as HTMLTextAreaElement).value);
  }

  /** Discard the manual edit and revert to the diagnosis-derived suggestion. */
  resetAction(): void {
    this.actionOverride.set(null);
  }

  /** Confirm the accepted diagnoses and emit them to the parent. */
  accept(): void {
    if (this.disabled() || !this.canAccept()) {
      return;
    }
    const diagnoses = this.acceptedDiagnoses().map((d) => ({
      disease: d.disease,
      symptoms: d.selectedSymptoms
        .map((i) => d.symptoms[i])
        .filter((s): s is string => !!s),
      action: d.action.join(', '),
    }));
    this.selection.emit({
      diagnoses,
      recommendedAction: this.actionText().trim(),
    });
  }

  /** Return to the questionnaire, keeping it loaded. */
  back(): void {
    this.stage.set('questions');
    this.errorMessage.set('');
  }

  /** Clear everything back to the initial state. */
  restart(): void {
    this.resetFlow();
    this.errorMessage.set('');
  }

  private resetFlow(): void {
    // Invalidate any in-flight response of either kind so a superseded one is
    // discarded even if a future change lets a fetch start mid-flight.
    this.questionsReqId++;
    this.diagnosesReqId++;
    this.stage.set('idle');
    this.questionnaire.set(null);
    this.selectedQuestion.set(null);
    this.emergencyWarning.set(false);
    this.diagnoses.set([]);
    this.actionOverride.set(null);
  }
}
