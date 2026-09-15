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

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { Z_MODAL_DATA, ZardDialogRef } from '@common-ui/ui/dialog';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CdssDiagnosis } from './cdss.models';

export interface CdssDiseasesDialogData {
  diagnoses: CdssDiagnosis[];
  /** Symptom indexes marked present per diagnosis, driving the Count column. */
  markedSymptoms: number[][];
  /** Rows already ticked, when re-opened after Back. */
  savedIndexes?: number[];
}

/**
 * Legacy's "Diseases" popup: a table of candidate diseases with columns
 * Save | Disease | Count | Information | Do's & Don'ts | SelfCare | Action,
 * footer Back | Save. Count is "marked/total" for that disease's symptoms.
 * Ticking Save and confirming writes the disease into Provisional Diagnosis
 * and its action into Recommended Action on the case sheet.
 */
@Component({
  selector: 'app-cdss-diseases-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, ZardButtonComponent],
  template: `
    <div class="max-h-[60vh] overflow-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-left align-bottom text-muted-foreground">
            <th class="py-2 pr-3 font-medium">{{ 'cdss.colSave' | translate: lang() }}</th>
            <th class="py-2 pr-3 font-medium">{{ 'cdss.colDisease' | translate: lang() }}</th>
            <th class="py-2 pr-3 font-medium">{{ 'cdss.colCount' | translate: lang() }}</th>
            <th class="py-2 pr-3 font-medium">{{ 'cdss.colInformation' | translate: lang() }}</th>
            <th class="py-2 pr-3 font-medium">{{ 'cdss.colDosDonts' | translate: lang() }}</th>
            <th class="py-2 pr-3 font-medium">{{ 'cdss.colSelfCare' | translate: lang() }}</th>
            <th class="py-2 font-medium">{{ 'cdss.colAction' | translate: lang() }}</th>
          </tr>
        </thead>
        <tbody>
          @for (diagnosis of data.diagnoses; track diagnosis.disease) {
            <tr class="border-b border-border/50 align-top">
              <td class="py-2 pr-3">
                <input
                  type="checkbox"
                  class="h-4 w-4 accent-primary"
                  [attr.aria-label]="diagnosis.disease"
                  [checked]="isSaved($index)"
                  (change)="toggleSaved($index)"
                />
              </td>
              <td class="py-2 pr-3 font-medium text-foreground">{{ diagnosis.disease }}</td>
              <td class="py-2 pr-3 whitespace-nowrap">{{ matchCount($index) }}/{{ diagnosis.symptoms.length }}</td>
              <td class="py-2 pr-3">
                @for (line of diagnosis.information; track $index) {
                  <p>{{ line }}</p>
                }
              </td>
              <td class="py-2 pr-3">
                @for (line of diagnosis.dosDonts; track $index) {
                  <p>{{ line }}</p>
                }
              </td>
              <td class="py-2 pr-3">
                @for (line of diagnosis.selfCare; track $index) {
                  <p>{{ line }}</p>
                }
              </td>
              <td class="py-2">
                @for (line of diagnosis.action; track $index) {
                  <p>{{ line }}</p>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="mt-4 flex justify-end gap-2">
      <button z-button type="button" (click)="back()">{{ 'cdss.back' | translate: lang() }}</button>
      <button
        z-button
        type="button"
        class="border-success bg-success text-success-foreground hover:bg-success/90"
        [zDisabled]="saved().length === 0"
        (click)="save()"
      >
        {{ 'cdss.save' | translate: lang() }}
      </button>
    </div>
  `,
})
export class CdssDiseasesDialogComponent {
  private readonly dialogRef = inject(ZardDialogRef<CdssDiseasesDialogComponent>);
  private readonly i18n = inject(I18nService);
  readonly data = inject<CdssDiseasesDialogData>(Z_MODAL_DATA);

  readonly lang = this.i18n.language;
  readonly saved = signal<number[]>([...(this.data.savedIndexes ?? [])]);

  private readonly counts = computed(() => this.data.diagnoses.map((_, index) => this.data.markedSymptoms[index]?.length ?? 0));

  matchCount(index: number): number {
    return this.counts()[index] ?? 0;
  }

  isSaved(index: number): boolean {
    return this.saved().includes(index);
  }

  toggleSaved(index: number): void {
    this.saved.update((rows) => (rows.includes(index) ? rows.filter((item) => item !== index) : [...rows, index]));
  }

  back(): void {
    this.dialogRef.close({ action: 'back' });
  }

  save(): void {
    this.dialogRef.close({ action: 'save', savedIndexes: this.saved() });
  }
}
