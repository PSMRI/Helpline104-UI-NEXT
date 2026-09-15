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

import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';
import { Z_MODAL_DATA, ZardDialogRef } from '@common-ui/ui/dialog';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { LEGACY_GREEN_BUTTON } from '../legacy-theme';
import { PrescriptionRecord } from './prescription.models';
import { PrescriptionSmsService } from './prescription-sms.service';

const ALTERNATE_NUMBER_PATTERN = /^\d{10}$/;

/** The recent prescriptions the case sheet offers for re-sending. */
export interface RecentPrescriptionDialogData {
  records: readonly PrescriptionRecord[];
}

/** One table row: legacy flattens each prescription into a row per drug. */
interface RecentPrescriptionRow {
  prescriptionID?: number;
  prescribedDrugID?: number;
  diagnosisProvided?: string;
  drugName?: string;
  dosage?: string;
  frequency?: string;
  noOfDays?: string;
  remarks?: string;
}

/**
 * Legacy's "Recent Prescription History (Last 5 Days)" modal, opened by the
 * case sheet's Resend Prescription button
 * (`case-sheet-recentPrescription-modal.html`).
 *
 * Deliberately separate from the prescription dialog's own history table:
 * legacy keeps two, and only this one carries the Resend checkboxes and the
 * alternate-number/Send SMS footer. One row per prescribed drug, with the
 * prescription-level columns repeated, exactly as legacy renders it.
 */
@Component({
  selector: 'app-recent-prescription-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, ZardButtonComponent, ZardInputDirective],
  template: `
    <div class="max-h-[calc(92vh-7rem)] overflow-y-auto px-1">
      @if (rows().length === 0) {
        <p class="py-6 text-center text-sm text-muted-foreground">
          {{ 'prescription.noHistory' | translate: lang() }}
        </p>
      } @else {
        <div class="overflow-x-auto rounded-md border border-border">
          <table class="w-full text-left text-sm">
            <thead class="bg-muted/50 text-xs text-muted-foreground">
              <tr class="whitespace-nowrap">
                <th class="px-3 py-2 font-medium">{{ 'prescription.prescriptionId' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'prescription.resend' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">
                  {{ 'prescription.diagnosisProvisional' | translate: lang() }}/{{
                    'prescription.diagnosisInformation' | translate: lang()
                  }}
                </th>
                <th class="px-3 py-2 font-medium">{{ 'prescription.drug' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'prescription.strength' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'prescription.frequency' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'prescription.noOfDays' | translate: lang() }}</th>
                <th class="px-3 py-2 font-medium">{{ 'prescription.remarks' | translate: lang() }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track $index) {
                <tr class="border-t border-border">
                  <td class="px-3 py-2">{{ row.prescriptionID ?? '—' }}</td>
                  <td class="px-3 py-2">
                    @if (row.prescribedDrugID != null) {
                      <input
                        type="checkbox"
                        class="h-4 w-4 accent-primary"
                        [checked]="isSelected(row.prescribedDrugID)"
                        (change)="toggle(row.prescribedDrugID)"
                        [attr.aria-label]="'prescription.resend' | translate: lang()"
                      />
                    }
                  </td>
                  <td class="px-3 py-2">{{ row.diagnosisProvided || '—' }}</td>
                  <td class="px-3 py-2">{{ row.drugName || '—' }}</td>
                  <td class="px-3 py-2">{{ row.dosage || '—' }}</td>
                  <td class="px-3 py-2">{{ row.frequency || '—' }}</td>
                  <td class="px-3 py-2">{{ row.noOfDays || '—' }}</td>
                  <td class="px-3 py-2">{{ row.remarks || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Legacy's footer row: the alternate-number opt-in, its number, and
             Send SMS (accent green), disabled until a line is ticked. -->
        <div class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <label class="flex items-center gap-1.5 text-sm text-foreground">
            <input type="checkbox" class="h-4 w-4 accent-primary" [checked]="useAltNumber()" (change)="toggleAlt()" />
            {{ 'prescription.alternateNumber' | translate: lang() }} :
          </label>

          @if (useAltNumber()) {
            <div class="flex flex-col gap-1">
              <input
                id="rx-recent-alt-number"
                z-input
                class="w-44"
                inputmode="numeric"
                maxlength="10"
                [attr.aria-label]="'prescription.alternateNumber' | translate: lang()"
                [value]="altNumber()"
                (input)="altNumber.set($any($event.target).value)"
                [attr.aria-invalid]="altNumberValid() ? null : true"
              />
              @if (!altNumberValid()) {
                <p class="text-xs font-medium text-destructive" role="alert">
                  {{ 'prescription.alternateNumberInvalid' | translate: lang() }}
                </p>
              }
            </div>
          }

          <button
            z-button
            type="button"
            [class]="legacyGreen + ' ml-auto'"
            [zLoading]="sending()"
            [zDisabled]="!canSend()"
            (click)="send()"
          >
            {{ 'prescription.sendSms' | translate: lang() }}
          </button>
        </div>
      }
    </div>
  `,
})
export class RecentPrescriptionDialogComponent {
  private readonly data = inject<RecentPrescriptionDialogData>(Z_MODAL_DATA);
  private readonly dialogRef = inject<ZardDialogRef<RecentPrescriptionDialogComponent>>(ZardDialogRef);
  private readonly prescriptionSms = inject(PrescriptionSmsService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly legacyGreen = LEGACY_GREEN_BUTTON;

  readonly selected = signal<ReadonlySet<number>>(new Set());
  readonly useAltNumber = signal(false);
  readonly altNumber = signal('');
  readonly sending = signal(false);

  readonly rows = computed<RecentPrescriptionRow[]>(() =>
    this.data.records.flatMap((record) =>
      (record.prescribedDrugs ?? []).map((drug) => ({
        prescriptionID: record.prescriptionID,
        prescribedDrugID: drug.prescribedDrugID,
        diagnosisProvided: record.diagnosisProvided,
        drugName: drug.drugName,
        dosage: drug.dosage,
        frequency: drug.frequency,
        noOfDays: drug.noOfDays,
        remarks: record.remarks,
      })),
    ),
  );

  readonly altNumberValid = computed(
    () => !this.useAltNumber() || ALTERNATE_NUMBER_PATTERN.test(this.altNumber().trim()),
  );

  /** Legacy: needs a ticked line, and a valid number when one is being used. */
  canSend(): boolean {
    return this.selected().size > 0 && !this.sending() && this.altNumberValid();
  }

  isSelected(prescribedDrugID: number): boolean {
    return this.selected().has(prescribedDrugID);
  }

  toggle(prescribedDrugID: number): void {
    this.selected.update((ids) => {
      const next = new Set(ids);
      if (next.has(prescribedDrugID)) {
        next.delete(prescribedDrugID);
      } else {
        next.add(prescribedDrugID);
      }
      return next;
    });
  }

  toggleAlt(): void {
    this.useAltNumber.update((v) => !v);
    if (!this.useAltNumber()) {
      this.altNumber.set('');
    }
  }

  send(): void {
    if (!this.canSend()) {
      return;
    }
    this.sending.set(true);
    this.prescriptionSms
      .send([...this.selected()], this.useAltNumber() ? this.altNumber().trim() : null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sent) => {
          this.sending.set(false);
          if (sent) {
            toast.success(this.i18n.instant('prescription.smsSent'));
            this.dialogRef.close();
          }
        },
        error: () => this.sending.set(false),
      });
  }
}
