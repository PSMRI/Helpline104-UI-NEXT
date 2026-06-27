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

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff, lucideLock } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import {
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormMessageComponent,
} from '@common-ui/ui/form';
import { ZardInputDirective } from '@common-ui/ui/input';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';
import { AppFooterComponent } from '@/shared/components/layout/app-footer.component';
import { AppHeaderComponent } from '@/shared/components/layout/app-header.component';

import { LOGIN_ROUTE } from '../core/core.constants';
import { encryptPassword } from '../login/password-crypto';
import { AccountRecoveryService } from './account-recovery.service';
import { AccountRecoveryStore } from './account-recovery.store';
import {
  RecoveryError,
  SaveSecurityQuesAns,
  SecurityQuestionOption,
} from './account-recovery.models';
import { noWhitespace } from './recovery-validators';

/**
 * Password policy (legacy parity): 8–12 chars, at least one digit, one
 * uppercase letter and one special character from `!@#$%^&*`, and only
 * alphanumerics plus those specials.
 */
const PASSWORD_PATTERN =
  /^(?=.*[0-9])(?=.*[A-Z])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,12}$/;

/** Group validator: the three chosen questions must all be different. */
function distinctQuestions(group: AbstractControl): ValidationErrors | null {
  const values = [
    group.get('question1')?.value,
    group.get('question2')?.value,
    group.get('question3')?.value,
  ].filter((value) => !!value);
  return new Set(values).size === values.length ? null : { duplicateQuestion: true };
}

/** Group validator: confirm must equal the new password. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return newPassword === confirmPassword ? null : { passwordMismatch: true };
}

/**
 * First-login security-question setup (legacy `/setQuestions`). Reached when the
 * login response reports `Status === 'New'`; the login screen seeds the
 * {@link AccountRecoveryStore} with the user's id and name before routing here.
 *
 * The user picks three distinct questions, supplies answers, and chooses a new
 * password. On submit the screen runs the legacy two-call chain:
 * `saveUserSecurityQuesAns` (returns a `transactionId`) → `setForgetPassword`
 * (sets the password). Only after BOTH succeed does it navigate to login.
 *
 * Per the audit, the mobile number is NOT hardcoded — it is sent empty until the
 * screen collects a real number.
 */
@Component({
  selector: 'app-set-security-questions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NgIcon,
    ZardInputDirective,
    ZardButtonComponent,
    ZardFormFieldComponent,
    ZardFormControlComponent,
    ZardFormLabelComponent,
    ZardFormMessageComponent,
    AppHeaderComponent,
    AppFooterComponent,
  ],
  viewProviders: [provideIcons({ lucideEye, lucideEyeOff, lucideLock })],
  templateUrl: './set-security-questions.component.html',
})
export class SetSecurityQuestionsComponent implements OnInit {
  private readonly recovery = inject(AccountRecoveryService);
  private readonly store = inject(AccountRecoveryStore);
  private readonly router = inject(Router);
  private readonly dialog = inject(ConfirmDialogService);

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly questions = signal<SecurityQuestionOption[]>([]);

  /** Mirrors of the chosen question ids so later dropdowns can exclude them. */
  private readonly question1Value = signal('');
  private readonly question2Value = signal('');

  readonly form = new FormGroup(
    {
      question1: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      answer1: new FormControl('', { nonNullable: true, validators: [Validators.required, noWhitespace] }),
      question2: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      answer2: new FormControl('', { nonNullable: true, validators: [Validators.required, noWhitespace] }),
      question3: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      answer3: new FormControl('', { nonNullable: true, validators: [Validators.required, noWhitespace] }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(12),
          Validators.pattern(PASSWORD_PATTERN),
        ],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [distinctQuestions, passwordsMatch] },
  );

  // Note: a native <select> always yields its value as a string, while
  // QuestionID is a number — so the exclusion filters compare String(id) to the
  // control value. The distinctQuestions group validator is the backstop.
  /** Options for the second question, excluding the one chosen first. */
  readonly question2Options = computed(() =>
    this.questions().filter(
      (option) => String(option.QuestionID) !== this.question1Value(),
    ),
  );

  /** Options for the third question, excluding the first two choices. */
  readonly question3Options = computed(() =>
    this.questions().filter(
      (option) =>
        String(option.QuestionID) !== this.question1Value() &&
        String(option.QuestionID) !== this.question2Value(),
    ),
  );

  constructor() {
    this.form.controls.question1.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        this.question1Value.set(value);
        this.clearIfNowExcluded('question2', value);
        this.clearIfNowExcluded('question3', value);
      });

    this.form.controls.question2.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => {
        this.question2Value.set(value);
        this.clearIfNowExcluded('question3', value);
      });

    // If the user edits any question or answer after a save, drop the stored
    // transactionId so the next submit re-saves the updated answers rather than
    // reusing the stale id (which would strand the edits on the backend).
    for (const control of [
      this.form.controls.question1,
      this.form.controls.answer1,
      this.form.controls.question2,
      this.form.controls.answer2,
      this.form.controls.question3,
      this.form.controls.answer3,
    ]) {
      control.valueChanges
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.store.clearTransactionId());
    }
  }

  /** Clear a later question control if it now matches an earlier (excluded) choice. */
  private clearIfNowExcluded(
    control: 'question2' | 'question3',
    excluded: string,
  ): void {
    if (excluded && this.form.controls[control].value === excluded) {
      this.form.controls[control].setValue('');
    }
  }

  ngOnInit(): void {
    if (this.store.userId() == null || !this.store.userName()) {
      void this.router.navigate([LOGIN_ROUTE]);
      return;
    }
    this.loadQuestions();
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  private loadQuestions(): void {
    this.loading.set(true);
    this.recovery.getSecurityQuestionOptions().subscribe({
      next: (options) => {
        this.loading.set(false);
        this.questions.set(options);
      },
      error: (error: RecoveryError) => {
        this.loading.set(false);
        this.dialog.alert({
          title: 'Error',
          message:
            error?.errorMessage || 'Unable to load security questions. Please try again.',
        });
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const userId = this.store.userId();
    const userName = this.store.userName();
    if (userId == null || !userName) {
      void this.router.navigate([LOGIN_ROUTE]);
      return;
    }

    // If a previous attempt already saved the questions (returning a
    // transactionId) and only the password step failed, reuse that saved id
    // rather than replaying saveSecurityQuestions — a replay would persist a
    // duplicate set of answers and strand the first transactionId.
    const savedTransactionId = this.store.transactionId();
    if (savedTransactionId) {
      this.setPassword(userName, savedTransactionId);
      return;
    }

    const values = this.form.getRawValue();
    const payload: SaveSecurityQuesAns[] = [
      this.toRow(userId, userName, values.question1, values.answer1),
      this.toRow(userId, userName, values.question2, values.answer2),
      this.toRow(userId, userName, values.question3, values.answer3),
    ];

    this.loading.set(true);
    // Legacy two-call chain: save the questions, persist the returned
    // transactionId, then set the new password. Persisting before the password
    // call means a failure there can be retried against the saved id instead of
    // re-running the save.
    this.recovery.saveSecurityQuestions(payload).subscribe({
      next: (transactionId) => {
        this.store.setTransactionId(transactionId);
        this.setPassword(userName, transactionId);
      },
      error: (error: RecoveryError) => this.showSetupError(error),
    });
  }

  /**
   * Set the new password with a transactionId from {@link saveSecurityQuestions}.
   * The password is re-encrypted from the current form value on each call, so a
   * retry after a failure still picks up any edit the user made. Only on success
   * is the recovery store cleared and the user routed back to login.
   */
  private setPassword(userName: string, transactionId: string): void {
    const encryptedPassword = encryptPassword(this.form.controls.newPassword.value);
    this.loading.set(true);
    this.recovery
      .setForgetPassword(userName, encryptedPassword, transactionId)
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.store.clear();
          toast.success('Security questions saved and password set. Please sign in.');
          void this.router.navigate([LOGIN_ROUTE]);
        },
        error: (error: RecoveryError) => this.showSetupError(error),
      });
  }

  private showSetupError(error: RecoveryError): void {
    this.loading.set(false);
    this.dialog.alert({
      title: 'Error',
      message: error?.errorMessage || 'Unable to complete setup. Please try again.',
    });
  }

  private toRow(
    userId: number,
    userName: string,
    questionId: string,
    answer: string,
  ): SaveSecurityQuesAns {
    return {
      userID: userId,
      questionID: Number(questionId),
      answers: answer.trim(),
      mobileNumber: '',
      createdBy: userName,
    };
  }
}
