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
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SupervisorError } from '../../shared/supervisor-api';
import { SUP_TEXTAREA_CLASS } from '../../shared/supervisor-ui';
import { UploadSymptomsService } from './upload-symptoms.service';

/**
 * The legacy backend answers with a status text inside `data.message`;
 * `"sucess"` is the backend's spelling (`"success"` accepted defensively).
 */
const SUCCESS_MESSAGES = ['sucess', 'success'];
const ALREADY_EXISTS_MESSAGE = 'data already exist in database';

/**
 * Upload symptoms (legacy `InsertComplaintComponent`, supervisor activity 12):
 * paste a CDSS symptom algorithm as plain text and submit it to the 104 API
 * (`CDSS/saveSymptom`). Ctrl+Enter submits, matching the legacy hotkey.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-upload-symptoms',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, ZardButtonComponent],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-1 text-base font-semibold text-foreground">
        {{ 'supSymptom.title' | translate: lang() }}
      </h1>
      <p class="mb-4 text-sm text-muted-foreground">
        {{ 'supSymptom.prompt' | translate: lang() }}
      </p>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      <form (ngSubmit)="submit()">
        <label for="sym-algorithm" class="mb-1 block text-xs font-medium text-muted-foreground">
          {{ 'supSymptom.algorithmLabel' | translate: lang() }}
          <span class="text-destructive">*</span>
        </label>
        <textarea
          id="sym-algorithm"
          [class]="textareaClass"
          rows="15"
          [formControl]="algorithm"
          [attr.placeholder]="'supSymptom.algorithmLabel' | translate: lang()"
          (keydown.control.enter)="submit()"
        ></textarea>
        @if (algorithm.invalid && algorithm.touched) {
          <p class="mt-1 text-xs font-medium text-destructive">
            {{ 'supSymptom.enterAlgorithm' | translate: lang() }}
          </p>
        }
        <div class="mt-4 flex justify-end">
          <button
            z-button
            type="submit"
            zType="default"
            [zLoading]="saving()"
            [zDisabled]="algorithm.invalid || saving()"
          >
            {{ 'supSymptom.submit' | translate: lang() }}
          </button>
        </div>
      </form>
    </section>
  `,
})
export class UploadSymptomsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(UploadSymptomsService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly textareaClass = SUP_TEXTAREA_CLASS;

  readonly saving = signal(false);
  readonly errorMessage = signal('');

  /** Whitespace-only input is rejected, like the legacy trim-before-send. */
  readonly algorithm = this.fb.control('', {
    nonNullable: true,
    validators: [Validators.required, notBlankValidator],
  });

  submit(): void {
    if (this.algorithm.invalid || this.saving()) {
      this.algorithm.markAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .saveSymptom({ Msg: this.algorithm.value.trim() || null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.saving.set(false);
          const message = (result?.message ?? '').toString().trim();
          if (SUCCESS_MESSAGES.includes(message.toLowerCase())) {
            toast.success(this.i18n.instant('supSymptom.uploaded'));
            this.algorithm.reset();
          } else if (message.toLowerCase() === ALREADY_EXISTS_MESSAGE) {
            this.errorMessage.set(this.i18n.instant('supSymptom.alreadyExists'));
          } else {
            // Any other backend status text is surfaced as-is (legacy alert).
            this.errorMessage.set(message || this.i18n.instant('supSymptom.uploadFailed'));
          }
        },
        error: (err: SupervisorError) => {
          this.saving.set(false);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }
}

/** `required` passes whitespace; the legacy screen trimmed before sending. */
function notBlankValidator(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim().length > 0 ? null : { blank: true };
}
