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

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Z_MODAL_DATA, ZardDialogRef } from '@common-ui/ui/dialog';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CdssQuestion } from './cdss.models';

export interface CdssSymptomsDialogData {
  questions: CdssQuestion[];
}

/**
 * Legacy's "Symptoms" popup (`cdssModal.html`, opened by `invokeDialog()`):
 * a radio list of the refining questions for the picked chief complaint, with
 * emergency ones tagged by a red `[Emergency]` superscript. There is no footer
 * — choosing a radio closes the popup and advances to Symptom Results.
 */
@Component({
  selector: 'app-cdss-symptoms-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <ul class="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
      @for (question of data.questions; track $index) {
        <li>
          <label class="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-accent/50">
            <input
              type="radio"
              name="cdss-symptom-question"
              class="mt-1 h-4 w-4 shrink-0 accent-primary"
              [value]="$index"
              (change)="pick($index)"
            />
            <span>
              {{ question.question }}
              @if (question.isEmergency) {
                <sup class="ml-1 font-medium text-destructive">{{ 'cdss.emergencyTag' | translate: lang() }}</sup>
              }
            </span>
          </label>
        </li>
      }
    </ul>
  `,
})
export class CdssSymptomsDialogComponent {
  private readonly dialogRef = inject(ZardDialogRef<CdssSymptomsDialogComponent>);
  private readonly i18n = inject(I18nService);
  readonly data = inject<CdssSymptomsDialogData>(Z_MODAL_DATA);

  readonly lang = this.i18n.language;

  pick(questionIndex: number): void {
    this.dialogRef.close({ questionIndex });
  }
}
