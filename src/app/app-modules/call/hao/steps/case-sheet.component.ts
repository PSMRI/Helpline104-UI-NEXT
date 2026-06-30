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
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { AvailableDisease, CaseSheetRequest } from '../hao.models';
import { HaoService } from '../hao.service';

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
          formControlName="chiefComplaints"
          [attr.aria-invalid]="isInvalid('chiefComplaints') || null"
          [placeholder]="'hao.caseSheet.chiefComplaintsPlaceholder' | translate: lang()"
        ></textarea>
        @if (isInvalid('chiefComplaints')) {
          <p class="text-xs font-medium text-destructive" role="alert">
            {{ 'hao.caseSheet.chiefComplaintsRequired' | translate: lang() }}
          </p>
        }
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium" for="hao-cs-diagnosis">
          {{ 'hao.caseSheet.provisionalDiagnosis' | translate: lang() }}
        </label>
        <select
          id="hao-cs-diagnosis"
          formControlName="provisionalDiagnosisID"
          class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option [ngValue]="null">
            {{ 'hao.caseSheet.selectDiagnosis' | translate: lang() }}
          </option>
          @for (disease of diseases(); track disease.diseasesummaryID) {
            <option [ngValue]="disease.diseasesummaryID">{{ disease.diseaseName }}</option>
          }
        </select>
      </div>

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
  }

  /** True when a control is invalid and has been touched/dirtied. */
  isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
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
