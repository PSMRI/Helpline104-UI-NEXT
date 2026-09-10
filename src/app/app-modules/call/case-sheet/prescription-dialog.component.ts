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
import { ConfirmationService } from '../../core/services/confirmation.service';
import { PrescriptionComponent } from './prescription.component';

/** Patient/diagnosis context the case sheet passes into the dialog. */
export interface PrescriptionDialogData {
  patientName: string;
  age: number | null;
  gender: string;
  initialDiagnosis: string;
  /** Label toggle: "Provisional Diagnosis" (true) vs "Information Given". */
  provisionalDiagnosis: boolean;
  openHistory: boolean;
}

/**
 * Hosts the prescription form in a modal, the way legacy does — legacy opened
 * `prescriptionComponent` as a dialog and closed it with the created
 * prescription id (`prescription.component.ts:323`), so a successful save
 * closes this dialog with that id and the case sheet reacts to the result.
 *
 * Dismissing asks first, matching legacy's `closePrescription()` confirm.
 * The opener wires that up through `zOnCancel`, which blocks the close while
 * {@link confirmClose} returns `false`.
 */
@Component({
  selector: 'app-prescription-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrescriptionComponent],
  template: `
    <app-prescription
      [patientName]="data.patientName"
      [age]="data.age"
      [gender]="data.gender"
      [initialDiagnosis]="data.initialDiagnosis"
      [provisionalDiagnosis]="data.provisionalDiagnosis"
      [openHistory]="data.openHistory"
      [inDialog]="true"
      (saved)="dialogRef.close($event)"
    />
  `,
})
export class PrescriptionDialogComponent {
  readonly data = inject<PrescriptionDialogData>(Z_MODAL_DATA);
  readonly dialogRef = inject<ZardDialogRef<PrescriptionDialogComponent, number>>(ZardDialogRef);

  private readonly confirmation = inject(ConfirmationService);
  private readonly i18n = inject(I18nService);

  /**
   * Legacy `closePrescription()`: confirm before discarding the form. Always
   * returns `false` so the dialog stays open; the confirm's Ok closes it.
   */
  confirmClose(): false {
    void this.confirmation.confirm(this.i18n.instant('prescription.closeConfirm')).then((confirmed) => {
      if (confirmed) {
        this.dialogRef.close();
      }
    });
    return false;
  }
}
