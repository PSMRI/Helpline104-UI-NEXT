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
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslationKey } from '../../../core/i18n/locales';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CasesheetHistoryMctsComponent } from '../../casesheet-history/casesheet-history-mcts.component';
import { CasesheetHistoryMmuComponent } from '../../casesheet-history/casesheet-history-mmu.component';
import { MmuVisitRow } from '../../casesheet-history/other-helpline.models';
import { DiseaseSummaryDetail } from '../../case-sheet/disease-summary.models';
import { ViewDiseaseSummaryDetailsComponent } from '../../case-sheet/view-disease-summary-details.component';
import {
  AvailableDisease,
  CaseSheetRequest,
  PresentCaseSheet,
} from '../hao.models';
import { HaoService } from '../hao.service';

/** History tabs shown in the case-sheet history section. */
type HistoryTab = 'mcts' | 'mmu' | 'tm';

/**
 * Health Advisory case sheet — the primary HAO service (legacy `<app-case-sheet>`,
 * the default tab of the "Provide Service" step).
 *
 * A focused reactive form capturing the chief complaint, an optional provisional
 * diagnosis (from the disease catalogue), the advice given and remarks. Saving
 * persists the sheet for the active beneficiary and emits {@link serviceAvailed}
 * so the workspace can mark the call valid at closure (legacy
 * `serviceAvailed.next(true)`).
 */
@Component({
  selector: 'app-hao-case-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ZardButtonComponent,
    ZardInputDirective,
    CasesheetHistoryMctsComponent,
    CasesheetHistoryMmuComponent,
    ViewDiseaseSummaryDetailsComponent,
  ],
  template: `
    <form
      class="flex flex-col gap-5"
      [formGroup]="form"
      (ngSubmit)="save()"
      novalidate
    >
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium" for="hao-cs-complaints">
          {{ 'hao.caseSheet.chiefComplaints' | translate: lang() }}
          <span class="text-destructive" aria-hidden="true">*</span>
        </label>
        <textarea
          z-input
          id="hao-cs-complaints"
          rows="3"
          maxlength="2000"
          formControlName="chiefComplaints"
          [attr.aria-invalid]="isInvalid('chiefComplaints') || null"
          [attr.aria-describedby]="
            isInvalid('chiefComplaints') ? 'hao-cs-complaints-error' : null
          "
          [placeholder]="'hao.caseSheet.chiefComplaintsPlaceholder' | translate: lang()"
        ></textarea>
        @if (isInvalid('chiefComplaints')) {
          <p
            id="hao-cs-complaints-error"
            class="text-xs font-medium text-destructive"
            role="alert"
          >
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
        </label>
        <div class="flex flex-wrap items-center gap-2">
          <select
            id="hao-cs-diagnosis"
            formControlName="provisionalDiagnosisID"
            class="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option [ngValue]="null">
              {{ 'hao.caseSheet.selectDiagnosis' | translate: lang() }}
            </option>
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
            [zDisabled]="form.controls.provisionalDiagnosisID.value === null || loadingDisease()"
            (click)="openDiseaseSummary()"
          >
            {{ 'hao.caseSheet.viewDiseaseSummary' | translate: lang() }}
          </button>
        </div>
        @if (diseaseError()) {
          <p class="text-xs font-medium text-destructive" role="alert">{{ diseaseError() }}</p>
        }
      </div>

      @if (diseaseDetail(); as detail) {
        <app-view-disease-summary-details
          [detail]="detail"
          (accepted)="closeDiseaseSummary()"
          (cancelled)="closeDiseaseSummary()"
        />
      }

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium" for="hao-cs-advice">
          {{ 'hao.caseSheet.healthAdvice' | translate: lang() }}
        </label>
        <textarea
          z-input
          id="hao-cs-advice"
          rows="3"
          formControlName="healthAdvice"
          [placeholder]="'hao.caseSheet.healthAdvicePlaceholder' | translate: lang()"
        ></textarea>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium" for="hao-cs-remarks">
          {{ 'hao.caseSheet.remarks' | translate: lang() }}
        </label>
        <textarea
          z-input
          id="hao-cs-remarks"
          rows="2"
          formControlName="remarks"
        ></textarea>
      </div>

      <div class="flex justify-end">
        <button
          z-button
          type="submit"
          [zLoading]="saving()"
          [zDisabled]="saving() || beneficiaryId() === null"
        >
          {{ 'hao.caseSheet.save' | translate: lang() }}
        </button>
      </div>
    </form>

    @if (beneficiaryId() !== null) {
      <section class="mt-6 border-t border-border pt-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-foreground">
            {{ 'casesheetHistory.sectionTitle' | translate: lang() }}
          </h2>
          <button z-button type="button" zType="ghost" zSize="sm" (click)="toggleHistory()">
            {{
              (historyOpen() ? 'casesheetHistory.hide' : 'casesheetHistory.show')
                | translate: lang()
            }}
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
                (click)="activeTab.set(tab.id)"
              >
                {{ tab.labelKey | translate: lang() }}
              </button>
            }
          </div>

          <div class="mt-3">
            @switch (activeTab()) {
              @case ('mcts') {
                <app-casesheet-history-mcts [benRegID]="beneficiaryId()" />
              }
              @case ('mmu') {
                <app-casesheet-history-mmu
                  [benRegID]="beneficiaryId()"
                  (selectVisit)="onSelectVisit($event)"
                />
              }
              @case ('tm') {
                <app-casesheet-history-mmu
                  [benRegID]="beneficiaryId()"
                  [isTm]="true"
                  (selectVisit)="onSelectVisit($event)"
                />
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
                    <dt class="text-muted-foreground">{{ 'casesheetHistory.mmu.visitCategory' | translate: lang() }}</dt>
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
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly lang = this.i18n.language;

  /** Beneficiary the case sheet is recorded against (from the CallStore). */
  readonly beneficiaryId = input<number | null>(null);
  /** AMRIT call id, linked onto the saved sheet when available. */
  readonly callId = input<string | null>(null);

  /** Emitted after a successful save so the call can be marked valid. */
  readonly serviceAvailed = output<void>();

  readonly diseases = signal<AvailableDisease[]>([]);
  readonly saving = signal(false);

  /** Disease-summary detail modal state (null = closed). */
  readonly diseaseDetail = signal<DiseaseSummaryDetail | null>(null);
  readonly loadingDisease = signal(false);
  readonly diseaseError = signal('');

  /** Case-sheet history section state. */
  readonly historyOpen = signal(false);
  readonly activeTab = signal<HistoryTab>('mcts');
  readonly selectedVisit = signal<MmuVisitRow | null>(null);

  /** History tab definitions (label keys resolved in the template). */
  readonly historyTabs: ReadonlyArray<{ id: HistoryTab; labelKey: TranslationKey }> = [
    { id: 'mcts', labelKey: 'casesheetHistory.tabMcts' },
    { id: 'mmu', labelKey: 'casesheetHistory.tabMmu' },
    { id: 'tm', labelKey: 'casesheetHistory.tabTm' },
  ];

  /** Beneficiary whose existing sheet has already been fetched (prefill once). */
  private prefilledFor: number | null = null;

  readonly form = this.fb.nonNullable.group({
    chiefComplaints: ['', [Validators.required, Validators.maxLength(2000)]],
    provisionalDiagnosisID: this.fb.control<number | null>(null),
    healthAdvice: this.fb.control<string | null>(null),
    remarks: this.fb.control<string | null>(null),
  });

  constructor() {
    this.haoService.getAvailableDiseases().subscribe({
      next: (diseases) => this.diseases.set(diseases),
      // A missing catalogue must not block free-text complaints/advice; the
      // diagnosis selector simply stays empty.
      error: () => this.diseases.set([]),
    });

    // Prefill from any case sheet already saved for the caller, so re-entering
    // the service step restores prior work instead of starting blank (which
    // could also trigger a duplicate save). Runs once per beneficiary.
    effect(() => {
      const id = this.beneficiaryId();
      if (id !== null && id !== this.prefilledFor) {
        this.prefilledFor = id;
        this.loadExistingCaseSheet(id);
      }
    });
  }

  /** Fetch and apply any previously saved case sheet for the beneficiary. */
  private loadExistingCaseSheet(beneficiaryRegID: number): void {
    this.haoService.getPresentCaseSheet(beneficiaryRegID).subscribe({
      next: (sheet) => {
        // Best-effort prefill: never clobber edits the agent has already made.
        if (sheet && this.form.pristine) {
          this.applyExistingCaseSheet(sheet);
        }
      },
      // Prefill is best-effort; a failure just leaves a blank form.
      error: () => undefined,
    });
  }

  /** Patch the form from an existing case sheet, keeping it pristine. */
  private applyExistingCaseSheet(sheet: PresentCaseSheet): void {
    this.form.patchValue({
      chiefComplaints: sheet.chiefComplaints ?? '',
      provisionalDiagnosisID: sheet.provisionalDiagnosisID ?? null,
      healthAdvice: sheet.healthAdvice ?? null,
      remarks: sheet.remarks ?? null,
    });
  }

  /** True when a control is invalid and has been touched/dirtied. */
  isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  /** Fetch and open the disease-summary detail for the selected diagnosis. */
  openDiseaseSummary(): void {
    const id = this.form.controls.provisionalDiagnosisID.value;
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
      },
      error: () => {
        this.loadingDisease.set(false);
        this.diseaseError.set(
          this.i18n.instant('hao.caseSheet.diseaseSummaryError'),
        );
      },
    });
  }

  /** Dismiss the disease-summary detail modal. */
  closeDiseaseSummary(): void {
    this.diseaseDetail.set(null);
  }

  /** Toggle the case-sheet history section. */
  toggleHistory(): void {
    this.historyOpen.update((open) => !open);
  }

  /** Record the visit the agent chose to view from the MMU/TM history. */
  onSelectVisit(visit: MmuVisitRow): void {
    this.selectedVisit.set(visit);
  }

  save(): void {
    const beneficiaryRegID = this.beneficiaryId();
    if (this.form.invalid || beneficiaryRegID === null || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const selectedDisease = this.diseases().find(
      (disease) => disease.diseasesummaryID === value.provisionalDiagnosisID,
    );

    const request: CaseSheetRequest = {
      beneficiaryRegID,
      benCallID: this.callId(),
      chiefComplaints: value.chiefComplaints.trim(),
      provisionalDiagnosisID: value.provisionalDiagnosisID,
      provisionalDiagnosis: selectedDisease?.diseaseName ?? null,
      healthAdvice: value.healthAdvice?.trim() || null,
      remarks: value.remarks?.trim() || null,
      providerServiceMapID:
        this.authStore.currentRole()?.providerServiceMapID ?? null,
      createdBy: this.authStore.user()?.userName ?? '',
    };

    this.saving.set(true);
    this.haoService.saveCaseSheet(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.serviceAvailed.emit();
        this.confirmDialog
          .alert({
            title: this.i18n.instant('dashboard.dialog.info'),
            message: this.i18n.instant('hao.caseSheet.saveSuccess'),
            okText: this.i18n.instant('dashboard.dialog.ok'),
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
          })
          .subscribe();
      },
    });
  }
}
