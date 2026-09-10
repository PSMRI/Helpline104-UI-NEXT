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

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { Z_MODAL_DATA, ZardDialogRef } from '@common-ui/ui/dialog';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CdssDiagnosis } from './cdss.models';

export interface CdssSymptomResultsDialogData {
  diagnoses: CdssDiagnosis[];
  /** Symptom indexes already marked per diagnosis, when re-opened via Back. */
  markedSymptoms?: number[][];
}

/**
 * Legacy's "Symptom Results" popup: one tab per candidate disease, each listing
 * that disease's symptoms as chips the agent toggles to mark "present". Footer
 * is Back | Result, where Result advances to the Diseases table.
 */
@Component({
  selector: 'app-cdss-symptom-results-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, ZardButtonComponent],
  template: `
    <div role="tablist" class="flex flex-wrap gap-1 border-b border-border">
      @for (diagnosis of data.diagnoses; track diagnosis.disease) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="activeTab() === $index"
          class="-mb-px border-b-2 px-4 py-2 text-sm font-semibold"
          [class.border-primary]="activeTab() === $index"
          [class.text-primary]="activeTab() === $index"
          [class.border-transparent]="activeTab() !== $index"
          [class.text-muted-foreground]="activeTab() !== $index"
          (click)="activeTab.set($index)"
        >
          {{ diagnosis.disease }}
        </button>
      }
    </div>

    @if (data.diagnoses[activeTab()]; as diagnosis) {
      <div role="tabpanel" class="flex max-h-[50vh] flex-wrap content-start gap-2 overflow-y-auto py-4">
        @for (symptom of diagnosis.symptoms; track symptom) {
          <button
            type="button"
            [attr.aria-pressed]="isMarked(activeTab(), $index)"
            class="rounded-md border px-3 py-1.5 text-left text-sm"
            [class.border-primary]="isMarked(activeTab(), $index)"
            [class.bg-primary]="isMarked(activeTab(), $index)"
            [class.text-primary-foreground]="isMarked(activeTab(), $index)"
            [class.border-border]="!isMarked(activeTab(), $index)"
            [class.bg-background]="!isMarked(activeTab(), $index)"
            (click)="toggle(activeTab(), $index)"
          >
            {{ symptom }}
          </button>
        }
      </div>
    }

    <div class="mt-2 flex justify-end gap-2">
      <button z-button type="button" (click)="back()">{{ 'cdss.back' | translate: lang() }}</button>
      <button
        z-button
        type="button"
        class="border-success bg-success text-success-foreground hover:bg-success/90"
        (click)="result()"
      >
        {{ 'cdss.result' | translate: lang() }}
      </button>
    </div>
  `,
})
export class CdssSymptomResultsDialogComponent {
  private readonly dialogRef = inject(ZardDialogRef<CdssSymptomResultsDialogComponent>);
  private readonly i18n = inject(I18nService);
  readonly data = inject<CdssSymptomResultsDialogData>(Z_MODAL_DATA);

  readonly lang = this.i18n.language;
  readonly activeTab = signal(0);

  private readonly marked = signal<number[][]>(
    this.data.diagnoses.map((_, index) => [...(this.data.markedSymptoms?.[index] ?? [])]),
  );

  isMarked(diagnosisIndex: number, symptomIndex: number): boolean {
    return this.marked()[diagnosisIndex]?.includes(symptomIndex) ?? false;
  }

  toggle(diagnosisIndex: number, symptomIndex: number): void {
    this.marked.update((rows) =>
      rows.map((row, index) => {
        if (index !== diagnosisIndex) {
          return row;
        }
        return row.includes(symptomIndex) ? row.filter((item) => item !== symptomIndex) : [...row, symptomIndex];
      }),
    );
  }

  back(): void {
    this.dialogRef.close({ action: 'back' });
  }

  result(): void {
    this.dialogRef.close({ action: 'result', markedSymptoms: this.marked() });
  }
}
