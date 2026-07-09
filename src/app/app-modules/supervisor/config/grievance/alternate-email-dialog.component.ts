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
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideTrash2 } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';
import { Z_MODAL_DATA, ZardDialogRef } from '@common-ui/ui/dialog';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SupervisorError } from '../../shared/supervisor-api';
import { SupervisorGrievanceService } from './grievance.service';

/** Legacy email pattern from `AlernateEmailModelComponent`. */
const EMAIL_PATTERN = /^[0-9a-zA-Z_.]+@[a-zA-Z_]+?\.\b(org|com|COM|IN|in|co.in)\b$/;

/** Input for the dialog: the grievance being forwarded + its district. */
export interface AlternateEmailDialogData {
  feedbackID: number;
  districtID: number | null;
}

/**
 * Post-save email dialog for the supervisor grievance edit flow (legacy
 * `AlernateEmailModelComponent`): lists the district authority email ids for
 * selection, lets the supervisor add addresses manually, and sends the
 * grievance email (`emailController/SendEmail`).
 */
@Component({
  selector: 'app-alternate-email-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucidePlus, lucideTrash2 })],
  template: `
    @if (errorMessage()) {
      <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
    }

    <p class="mb-2 text-xs font-medium text-muted-foreground">
      {{ 'supGrievance.email.authorityEmails' | translate: lang() }}
    </p>
    @if (loading()) {
      <p class="py-4 text-center text-sm text-muted-foreground">
        {{ 'supGrievance.loading' | translate: lang() }}
      </p>
    } @else if (emails().length === 0) {
      <p class="rounded-md border border-dashed border-border py-4 text-center text-sm text-muted-foreground">
        {{ 'supGrievance.email.noEmails' | translate: lang() }}
      </p>
    } @else {
      <ul class="max-h-48 space-y-1 overflow-y-auto">
        @for (mail of emails(); track mail) {
          <li>
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                [checked]="selected().has(mail)"
                (change)="toggle(mail)"
              />
              {{ mail }}
            </label>
          </li>
        }
      </ul>
    }

    <form [formGroup]="manualForm" class="mt-4">
      <div formArrayName="emails" class="space-y-2">
        @for (ctrl of manualEmails.controls; track ctrl; let i = $index) {
          <div class="flex items-center gap-2">
            <input
              z-input
              class="flex-1"
              type="email"
              [formControlName]="i"
              [placeholder]="'supGrievance.email.enterEmail' | translate: lang()"
            />
            <button
              z-button
              type="button"
              zType="ghost"
              zSize="sm"
              [attr.aria-label]="'supGrievance.email.deleteRow' | translate: lang()"
              (click)="removeManual(i)"
            >
              <ng-icon name="lucideTrash2" size="16" aria-hidden="true" />
            </button>
          </div>
        }
      </div>
      <button z-button type="button" zType="outline" zSize="sm" class="mt-2" (click)="addManual()">
        <ng-icon name="lucidePlus" size="16" aria-hidden="true" />
        {{ 'supGrievance.email.addManually' | translate: lang() }}
      </button>
    </form>

    <div class="mt-5 flex justify-end gap-2">
      <button z-button type="button" zType="outline" (click)="close()">
        {{ 'supGrievance.email.close' | translate: lang() }}
      </button>
      <button
        z-button
        type="button"
        zType="default"
        [zLoading]="sending()"
        [zDisabled]="!canSend() || sending()"
        (click)="send()"
      >
        {{ 'supGrievance.email.send' | translate: lang() }}
      </button>
    </div>
  `,
})
export class AlternateEmailDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SupervisorGrievanceService);
  private readonly i18n = inject(I18nService);
  private readonly dialogRef = inject(ZardDialogRef<AlternateEmailDialogComponent>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly data = inject<AlternateEmailDialogData>(Z_MODAL_DATA);

  readonly lang = this.i18n.language;

  readonly emails = signal<string[]>([]);
  readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly errorMessage = signal('');

  readonly manualForm: FormGroup = this.fb.group({ emails: this.fb.array([]) });

  get manualEmails(): FormArray {
    return this.manualForm.get('emails') as FormArray;
  }

  ngOnInit(): void {
    this.loading.set(true);
    this.service
      .getAuthorityEmails(this.data.districtID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (emails) => {
          this.loading.set(false);
          this.emails.set(emails);
        },
        error: (err: SupervisorError) => {
          this.loading.set(false);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }

  toggle(mail: string): void {
    const next = new Set(this.selected());
    if (next.has(mail)) {
      next.delete(mail);
    } else {
      next.add(mail);
    }
    this.selected.set(next);
  }

  addManual(): void {
    this.manualEmails.push(
      this.fb.control('', [Validators.required, Validators.pattern(EMAIL_PATTERN)]),
    );
  }

  removeManual(index: number): void {
    this.manualEmails.removeAt(index);
  }

  /** Legacy gating: at least one authority email picked, manual rows all valid. */
  canSend(): boolean {
    return this.selected().size > 0 && this.manualForm.valid;
  }

  send(): void {
    if (!this.canSend()) {
      return;
    }
    const manual = (this.manualEmails.value as string[]).filter(Boolean);
    const finalEmails = [...this.selected(), ...manual].join(',');
    this.sending.set(true);
    this.errorMessage.set('');
    this.service
      .sendEmail(this.data.feedbackID, finalEmails)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Legacy closed the dialog on success AND on failure alike.
        next: () => this.dialogRef.close(),
        error: () => this.dialogRef.close(),
      });
  }

  close(): void {
    this.dialogRef.close();
  }
}
