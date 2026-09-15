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

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { HihlHistoryRow } from './hihl-case-sheet.models';

/** History table for the Detailed HIHL case sheet (legacy `104-counsellor-history.html`), ported column-for-column. */
@Component({
  selector: 'app-hihl-case-sheet-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <div class="mt-4 overflow-x-auto rounded-md border border-border">
      <table class="w-full text-left text-sm">
        <thead class="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th class="px-3 py-2 font-medium">{{ 'hihl.history.id' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.chiefComplaints' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.appetite' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.sleep' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.hygieneAndTakingCare' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.bladder' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.bowel' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.libido' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.goingToWork' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.issuesAtWorkplace' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.doingOfHouseholdWork' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.history.gettingAlongWithFamily' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.treatmentDetails' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.history.precipitatingFactors' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.history.concurrentMedicalCondition' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.pastPsychiatricCondition' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.history.pastMedicalConditions' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.history.currentDrugsMedication' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.history.conditionsInFamily' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.personalAndSocialHistory' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.mentalStatusExamination' | translate: lang() }}</th>
            <th class="px-3 py-2 font-medium">{{ 'hihl.summary' | translate: lang() }}</th>
          </tr>
        </thead>
        <tbody>
          @if (loading()) {
            <tr>
              <td colspan="21" class="px-3 py-8 text-center text-muted-foreground">
                {{ 'hihl.history.loading' | translate: lang() }}
              </td>
            </tr>
          } @else if (rows().length === 0) {
            <tr>
              <td colspan="21" class="px-3 py-8 text-center text-muted-foreground">
                {{ 'hihl.history.noRecordFound' | translate: lang() }}
              </td>
            </tr>
          } @else {
            @for (row of rows(); track $index; let i = $index) {
              <tr class="border-t border-border align-top">
                <td class="px-3 py-2">{{ i + 1 }}</td>
                <td class="px-3 py-2">
                  @for (complaint of row.chiefComplaints ?? []; track $index) {
                    @if (complaint) {
                      <span>{{ complaint.chiefComplaint }}, </span>
                    }
                  }
                </td>
                <td class="px-3 py-2">{{ row.biologicalFunctioning?.appetite }}</td>
                <td class="px-3 py-2">{{ row.biologicalFunctioning?.sleep }}</td>
                <td class="px-3 py-2">{{ row.biologicalFunctioning?.hygieneAndTakingCare }}</td>
                <td class="px-3 py-2">{{ row.biologicalFunctioning?.bladder }}</td>
                <td class="px-3 py-2">{{ row.biologicalFunctioning?.bowel }}</td>
                <td class="px-3 py-2">{{ row.biologicalFunctioning?.sexualLibido }}</td>
                <td class="px-3 py-2">{{ row.occupationalFunctioning?.goingToWork }}</td>
                <td class="px-3 py-2">{{ row.occupationalFunctioning?.issuesAtWorkplace }}</td>
                <td class="px-3 py-2">{{ row.socialFunctioning?.householdWork }}</td>
                <td class="px-3 py-2">{{ row.socialFunctioning?.gettingAlong }}</td>
                <td class="px-3 py-2">{{ row.treatmentDetails }}</td>
                <td class="px-3 py-2">{{ row.precipitatingFactors }}</td>
                <td class="px-3 py-2">{{ row.concurrentMedicalCondition }}</td>
                <td class="px-3 py-2">
                  @for (condition of row.pastHistory?.pastPsychiatricConditions ?? []; track $index) {
                    @if (condition) {
                      <span>{{ condition.pastPsychiatricCondition }}, </span>
                    }
                  }
                </td>
                <td class="px-3 py-2">
                  @for (condition of row.pastHistory?.pastMedicalConditions ?? []; track $index) {
                    @if (condition) {
                      <span>{{ condition.pastMedicalCondition }}, </span>
                    }
                  }
                </td>
                <td class="px-3 py-2">{{ row.currentDrugsMedication }}</td>
                <td class="px-3 py-2">
                  @for (condition of row.conditionInFamilyList ?? []; track $index) {
                    @if (condition) {
                      <span>{{ condition.familyCondition?.familyConditionName }}, </span>
                    }
                  }
                </td>
                <td class="px-3 py-2">{{ row.personalAndSocialHistory }}</td>
                <td class="px-3 py-2">{{ row.mentalStatusExamination }}</td>
                <td class="px-3 py-2">{{ row.summary }}</td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
})
export class HihlCaseSheetHistoryComponent {
  private readonly i18n = inject(I18nService);
  readonly lang = this.i18n.language;

  readonly rows = input<HihlHistoryRow[]>([]);
  readonly loading = input(false);
}
