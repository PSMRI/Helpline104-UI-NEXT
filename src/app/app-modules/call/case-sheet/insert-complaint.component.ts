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

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CdssService } from './cdss.service';

/** Backend save-symptom result envelope (legacy read `.message`). */
interface SaveSymptomResult {
  message?: string;
}

/**
 * Insert-complaint tool: uploads a CDSS complaint/algorithm entry via
 * `CDSS/saveSymptom` (reusing {@link CdssService}). Ported from the legacy
 * `InsertComplaintComponent` — a single free-text field with success /
 * already-exists handling, and Ctrl+Enter to submit.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-insert-complaint',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  host: { '(keydown)': 'onKeydown($event)' },
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h3 class="mb-3 text-sm font-semibold text-foreground">
        {{ 'insertComplaint.title' | translate: lang() }}
      </h3>

      <label for="complaint-algorithm" class="mb-1 block text-sm font-medium text-foreground">
        {{ 'insertComplaint.label' | translate: lang() }} <span class="text-destructive">*</span>
      </label>
      <textarea
        id="complaint-algorithm"
        z-input
        rows="12"
        class="w-full"
        [formControl]="algorithm"
        [placeholder]="'insertComplaint.placeholder' | translate: lang()"
      ></textarea>

      <div class="mt-4 flex items-center gap-3">
        <button
          z-button
          type="button"
          zType="default"
          [zLoading]="saving()"
          [zDisabled]="algorithm.invalid || saving()"
          (click)="submit()"
        >
          {{ 'insertComplaint.submit' | translate: lang() }}
        </button>
        <span class="text-xs text-muted-foreground">{{
          'insertComplaint.hint' | translate: lang()
        }}</span>
      </div>
    </section>
  `,
})
export class InsertComplaintComponent {
  private readonly cdss = inject(CdssService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly saving = signal(false);

  readonly algorithm = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(1)],
  });

  onKeydown(event: KeyboardEvent): void {
    // Ctrl+Enter submits (legacy hotkey).
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      this.submit();
    }
  }

  submit(): void {
    const value = this.algorithm.value.trim();
    if (!value || this.saving()) {
      this.algorithm.markAsTouched();
      return;
    }
    this.saving.set(true);
    this.cdss
      .saveSymptom({ Msg: value })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          const message = (res as SaveSymptomResult | null)?.message ?? '';
          const normalized = message.toString().toLowerCase();
          // Legacy success sentinel is the (misspelled) "sucess".
          if (normalized === 'sucess' || normalized === 'success') {
            toast.success(this.i18n.instant('insertComplaint.uploaded'));
            this.algorithm.reset('');
          } else if (normalized === 'data already exist in database') {
            toast.error(this.i18n.instant('insertComplaint.exists'));
          } else {
            toast.error(message || this.i18n.instant('insertComplaint.error'));
          }
        },
        error: () => {
          this.saving.set(false);
          toast.error(this.i18n.instant('insertComplaint.error'));
        },
      });
  }
}
