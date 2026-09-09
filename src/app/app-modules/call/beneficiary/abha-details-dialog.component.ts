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

import { ZardButtonComponent } from '@common-ui/ui/button';
import { Z_MODAL_DATA, ZardDialogRef } from '@common-ui/ui/dialog';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AbhaDetail } from './beneficiary.models';

export interface AbhaDetailsDialogData {
  abhaDetails: AbhaDetail[];
}

/** Legacy `BeneficiaryABHADetailsModal` — a read-only listing, no result to return. */
@Component({
  selector: 'app-abha-details-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, ZardButtonComponent],
  template: `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-left text-muted-foreground">
            <th class="py-1.5 pr-3 font-medium">{{ 'registration.abha.sno' | translate: lang() }}</th>
            <th class="py-1.5 pr-3 font-medium">{{ 'registration.abha.number' | translate: lang() }}</th>
            <th class="py-1.5 pr-3 font-medium">{{ 'registration.abha.address' | translate: lang() }}</th>
            <th class="py-1.5 pr-3 font-medium">{{ 'registration.abha.createdDate' | translate: lang() }}</th>
            <th class="py-1.5 font-medium">{{ 'registration.abha.mode' | translate: lang() }}</th>
          </tr>
        </thead>
        <tbody>
          @for (row of data.abhaDetails; track $index) {
            <tr class="border-b border-border/50">
              <td class="py-1.5 pr-3">{{ $index + 1 }}</td>
              <td class="py-1.5 pr-3">{{ row.HealthIDNumber || '—' }}</td>
              <td class="py-1.5 pr-3">{{ row.HealthID || '—' }}</td>
              <td class="py-1.5 pr-3">{{ row.CreatedDate || '—' }}</td>
              <td class="py-1.5">{{ row.AuthenticationMode || '—' }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <div class="mt-5 flex justify-end">
      <button z-button type="button" zType="outline" (click)="close()">
        {{ 'registration.abha.close' | translate: lang() }}
      </button>
    </div>
  `,
})
export class AbhaDetailsDialogComponent {
  private readonly dialogRef = inject(ZardDialogRef<AbhaDetailsDialogComponent>);
  private readonly i18n = inject(I18nService);
  readonly data = inject<AbhaDetailsDialogData>(Z_MODAL_DATA);

  readonly lang = this.i18n.language;

  close(): void {
    this.dialogRef.close();
  }
}
