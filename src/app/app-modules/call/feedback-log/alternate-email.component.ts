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
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideTrash2, lucideX } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { AlternateEmailError } from './alternate-email.models';
import { AlternateEmailService } from './alternate-email.service';

/** Basic email pattern (broader than the legacy org/com-only regex). */
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Alternate-email modal: sends a grievance/feedback to authority recipients.
 * Ported from the legacy `AlernateEmailModelComponent`. Loads the district's
 * pre-configured authority emails (multi-select) and lets the agent add extra
 * addresses manually, then sends via {@link AlternateEmailService}. Emits
 * {@link sent} on success and {@link closed} on dismiss.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-alternate-email',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucidePlus, lucideTrash2, lucideX })],
  template: `
    <section class="rounded-lg border border-border bg-card">
      <header class="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 class="text-sm font-semibold text-foreground">
          {{ 'alternateEmail.title' | translate: lang() }}
        </h3>
        <button
          type="button"
          class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          [attr.aria-label]="'alternateEmail.close' | translate: lang()"
          (click)="closed.emit()"
        >
          <ng-icon name="lucideX" size="16" aria-hidden="true" />
        </button>
      </header>

      <div class="p-5">
        @if (errorMessage()) {
          <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
        }

        <!-- Authority emails -->
        <fieldset class="mb-4">
          <legend class="mb-1 text-xs font-medium text-muted-foreground">
            {{ 'alternateEmail.authorityEmails' | translate: lang() }}
          </legend>
          @if (loading()) {
            <p class="text-sm text-muted-foreground">
              {{ 'alternateEmail.loading' | translate: lang() }}
            </p>
          } @else if (authorityEmails().length === 0) {
            <p class="text-sm text-muted-foreground">
              {{ 'alternateEmail.noAuthorityEmails' | translate: lang() }}
            </p>
          } @else {
            <div class="flex flex-col gap-1.5">
              @for (email of authorityEmails(); track email) {
                <label class="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    [checked]="isSelected(email)"
                    (change)="toggleEmail(email)"
                  />
                  {{ email }}
                </label>
              }
            </div>
          }
        </fieldset>

        <!-- Manual emails -->
        <div class="mb-4">
          <div class="mb-1 flex items-center justify-between">
            <span class="text-xs font-medium text-muted-foreground">
              {{ 'alternateEmail.manualEmails' | translate: lang() }}
            </span>
            <button z-button type="button" zType="outline" zSize="sm" (click)="addManual()">
              <ng-icon name="lucidePlus" size="14" aria-hidden="true" />
              {{ 'alternateEmail.add' | translate: lang() }}
            </button>
          </div>

          <form [formGroup]="form">
            <div formArrayName="emails" class="flex flex-col gap-2">
              @for (control of manualControls; track $index; let i = $index) {
                <div class="flex items-start gap-2">
                  <div class="flex-1">
                    <input
                      z-input
                      class="w-full"
                      type="email"
                      [formControl]="control"
                      [placeholder]="'alternateEmail.enterEmail' | translate: lang()"
                    />
                    @if (control.invalid && control.touched) {
                      <p class="mt-0.5 text-xs text-destructive">
                        {{ 'alternateEmail.invalidEmail' | translate: lang() }}
                      </p>
                    }
                  </div>
                  <button
                    z-button
                    type="button"
                    zType="ghost"
                    zSize="sm"
                    [attr.aria-label]="'alternateEmail.delete' | translate: lang()"
                    (click)="removeManual(i)"
                  >
                    <ng-icon name="lucideTrash2" size="14" aria-hidden="true" />
                  </button>
                </div>
              }
            </div>
          </form>
        </div>

        <div class="flex justify-end gap-2">
          <button z-button type="button" zType="outline" (click)="closed.emit()">
            {{ 'alternateEmail.close' | translate: lang() }}
          </button>
          <button
            z-button
            type="button"
            zType="default"
            [zLoading]="sending()"
            [zDisabled]="!canSend()"
            (click)="send()"
          >
            {{ 'alternateEmail.send' | translate: lang() }}
          </button>
        </div>
      </div>
    </section>
  `,
})
export class AlternateEmailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly emailService = inject(AlternateEmailService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** The grievance/feedback the email relates to. */
  readonly feedbackID = input<number | null>(null);
  /** District whose authority emails are offered. */
  readonly districtID = input<number | null>(null);

  readonly sent = output<void>();
  readonly closed = output<void>();

  readonly lang = this.i18n.language;

  readonly authorityEmails = signal<string[]>([]);
  readonly selectedEmails = signal<string[]>([]);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    emails: this.fb.array<FormControl<string>>([]),
  });

  private get emailsArray(): FormArray<FormControl<string>> {
    return this.form.controls.emails;
  }

  get manualControls(): FormControl<string>[] {
    return this.emailsArray.controls;
  }

  /** At least one recipient chosen and every manual row a valid email. */
  readonly canSend = computed(
    () =>
      !this.sending() &&
      (this.selectedEmails().length > 0 || this.manualCount() > 0) &&
      this.manualInvalidCount() === 0,
  );

  private readonly manualCount = signal(0);
  private readonly manualInvalidCount = signal(0);

  constructor() {
    // Keep the manual-email counts (which gate the Send button) in step with
    // what the agent types, not just add/remove of rows.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.refreshManualCounts());
  }

  ngOnInit(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.emailService
      .fetchEmails(this.districtID())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (emails) => {
          this.loading.set(false);
          this.authorityEmails.set(emails);
        },
        error: (err: AlternateEmailError) => {
          this.loading.set(false);
          this.authorityEmails.set([]);
          this.errorMessage.set(err.errorMessage || this.i18n.instant('alternateEmail.loadError'));
        },
      });
  }

  isSelected(email: string): boolean {
    return this.selectedEmails().includes(email);
  }

  toggleEmail(email: string): void {
    this.selectedEmails.update((emails) =>
      emails.includes(email) ? emails.filter((e) => e !== email) : [...emails, email],
    );
  }

  addManual(): void {
    this.emailsArray.push(
      this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(EMAIL_PATTERN)],
      }),
    );
    this.refreshManualCounts();
  }

  removeManual(index: number): void {
    this.emailsArray.removeAt(index);
    this.refreshManualCounts();
  }

  send(): void {
    // Re-sync counts from the live form before validating (input events don't
    // update the signals used by `canSend`).
    this.refreshManualCounts();
    if (!this.canSend()) {
      this.emailsArray.markAllAsTouched();
      return;
    }
    const manual = this.emailsArray.controls.map((c) => c.value.trim()).filter((v) => v.length > 0);
    const recipients = [...this.selectedEmails(), ...manual];
    if (recipients.length === 0) {
      return;
    }
    this.sending.set(true);
    this.errorMessage.set('');
    this.emailService
      .sendEmail({
        FeedbackID: this.feedbackID(),
        emailID: recipients.join(','),
        is1097: false,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.sent.emit();
        },
        error: (err: AlternateEmailError) => {
          this.sending.set(false);
          this.errorMessage.set(err.errorMessage || this.i18n.instant('alternateEmail.sendError'));
        },
      });
  }

  private refreshManualCounts(): void {
    const controls = this.emailsArray.controls;
    this.manualCount.set(controls.filter((c) => c.value.trim().length > 0).length);
    // Only a row the agent has actually typed into (non-empty) and that fails
    // the email pattern blocks Send; a freshly-added blank row must not disable
    // sending to already-selected authority emails.
    this.manualInvalidCount.set(controls.filter((c) => c.value.trim().length > 0 && c.invalid).length);
  }
}
