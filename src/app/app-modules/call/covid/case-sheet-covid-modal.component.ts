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

import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

const PHONE_PATTERN = /^[0-9]{10}$/;

/**
 * Post-save COVID modal (legacy `case-sheet-covid-modal`): confirms the case
 * sheet was saved and optionally captures an alternate mobile number to send
 * the certificate/details SMS to. "Send SMS" emits the chosen number (blank →
 * the default/caller number is used by the parent); "Close" dismisses.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-case-sheet-covid-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  template: `
    <section class="rounded-lg border border-border bg-card">
      <header class="border-b border-border px-5 py-3">
        <h3 class="text-sm font-semibold text-foreground">
          {{ title() || ('covidModal.title' | translate: lang()) }}
        </h3>
      </header>

      <div class="p-5">
        <p class="mb-3 text-sm text-foreground">{{ 'covidModal.saved' | translate: lang() }}</p>

        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            [formControl]="useAlternate"
          />
          {{ 'covidModal.altNumber' | translate: lang() }}
        </label>

        @if (useAlternate.value) {
          <div class="mt-2 max-w-xs">
            <input
              z-input
              class="w-full"
              [formControl]="mobileNumber"
              inputmode="numeric"
              maxlength="10"
              [attr.aria-label]="'covidModal.enterMobile' | translate: lang()"
              [placeholder]="'covidModal.enterMobile' | translate: lang()"
            />
            @if (!numberValid()) {
              <p class="mt-0.5 text-xs text-destructive">
                {{ 'covidModal.mobileError' | translate: lang() }}
              </p>
            }
          </div>
        }

        <div class="mt-4 flex justify-end gap-2">
          <button z-button type="button" zType="outline" (click)="closed.emit()">
            {{ 'covidModal.close' | translate: lang() }}
          </button>
          <button
            z-button
            type="button"
            zType="default"
            [zDisabled]="!numberValid()"
            (click)="onSend()"
          >
            {{ 'covidModal.sendSms' | translate: lang() }}
          </button>
        </div>
      </div>
    </section>
  `,
})
export class CaseSheetCovidModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject(I18nService);

  /** Optional heading (legacy `data.Title`). */
  readonly title = input('');

  /** Emits the number to send the SMS to (empty string → use the default). */
  readonly send = output<string>();
  readonly closed = output<void>();

  readonly lang = this.i18n.language;

  readonly useAlternate = this.fb.control(false, { nonNullable: true });
  readonly mobileNumber = this.fb.control('', { nonNullable: true });

  /** Valid unless an alternate is requested but not a 10-digit number. */
  numberValid(): boolean {
    if (!this.useAlternate.value) {
      return true;
    }
    return PHONE_PATTERN.test(this.mobileNumber.value.trim());
  }

  onSend(): void {
    if (!this.numberValid()) {
      return;
    }
    this.send.emit(this.useAlternate.value ? this.mobileNumber.value.trim() : '');
  }
}
