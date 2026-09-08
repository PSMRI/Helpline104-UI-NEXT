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
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';
import { Z_MODAL_DATA, ZardDialogRef } from '@common-ui/ui/dialog';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

const ALTERNATE_NUMBER_PATTERN = /^\d{10}$/;

export interface RegistrationSuccessDialogData {
  registrationId: string;
}

export type RegistrationSuccessDialogResult =
  | { sendSms: true; alternateNumber: string | null }
  | { sendSms: false };

@Component({
  selector: 'app-registration-success-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  template: `
    <p class="text-sm font-medium text-foreground">
      {{ 'registration.success.message' | translate: lang() }} {{ data.registrationId }}
    </p>

    <label class="mt-4 flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        class="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        [checked]="showAlternate()"
        (change)="toggleAlternate()"
      />
      {{ 'registration.field.alternateNumber' | translate: lang() }}
    </label>

    @if (showAlternate()) {
      <div class="mt-2">
        <label for="reg-success-alt-number" class="sr-only">
          {{ 'registration.success.mobileNumber' | translate: lang() }}
        </label>
        <input
          id="reg-success-alt-number"
          z-input
          [formControl]="alternateNumber"
          inputmode="numeric"
          maxlength="10"
          [placeholder]="'registration.success.mobileNumber' | translate: lang()"
        />
        @if (alternateNumber.touched && alternateNumber.invalid) {
          <p class="mt-1 text-xs font-medium text-destructive" role="alert">
            {{ 'registration.success.mobileNumberError' | translate: lang() }}
          </p>
        }
      </div>
    }

    <div class="mt-5 flex justify-end gap-2">
      <button z-button type="button" zType="outline" (click)="close()">
        {{ 'registration.success.close' | translate: lang() }}
      </button>
      <button z-button type="button" zType="default" [zDisabled]="showAlternate() && alternateNumber.invalid" (click)="sendSms()">
        {{ 'registration.success.sendSms' | translate: lang() }}
      </button>
    </div>
  `,
})
export class RegistrationSuccessDialogComponent {
  private readonly dialogRef = inject(ZardDialogRef<RegistrationSuccessDialogComponent>);
  private readonly i18n = inject(I18nService);
  readonly data = inject<RegistrationSuccessDialogData>(Z_MODAL_DATA);

  readonly lang = this.i18n.language;

  readonly showAlternate = signal(false);
  readonly alternateNumber = new FormControl('', {
    nonNullable: true,
    validators: [Validators.pattern(ALTERNATE_NUMBER_PATTERN)],
  });

  toggleAlternate(): void {
    this.showAlternate.set(!this.showAlternate());
    if (!this.showAlternate()) {
      this.alternateNumber.reset('');
    }
  }

  sendSms(): void {
    if (this.showAlternate() && this.alternateNumber.invalid) {
      this.alternateNumber.markAsTouched();
      return;
    }
    const result: RegistrationSuccessDialogResult = {
      sendSms: true,
      alternateNumber: this.showAlternate() ? this.alternateNumber.value.trim() : null,
    };
    this.dialogRef.close(result);
  }

  close(): void {
    const result: RegistrationSuccessDialogResult = { sendSms: false };
    this.dialogRef.close(result);
  }
}
