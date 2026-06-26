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

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff } from '@ng-icons/lucide';

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
import { AccountRecoveryService } from './account-recovery.service';
import { AccountRecoveryStore } from './account-recovery.store';
import { RecoveryError, SecurityAnswer, SecurityQuestion } from './account-recovery.models';

const SET_PASSWORD_ROUTE = '/set-password';
/** Privacy-preserving fallback so the user always gets feedback (never a blank notice). */
const NEUTRAL_FALLBACK =
  'If the username is registered, you will be asked a security question.';

/**
 * Account-support / forgot-password screen (legacy `/resetPassword`).
 *
 * Step 1 collects a username and calls `forgetPassword`. To avoid username
 * enumeration the screen only advances when the backend actually returns
 * questions; the `5002` "maybe-registered" code (and every other negative
 * outcome) surfaces the same neutral notice. Step 2 then asks the returned
 * questions one at a time and validates the answers, handing a `transactionId`
 * to the set-password screen on success.
 */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
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
  viewProviders: [provideIcons({ lucideEye, lucideEyeOff })],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  private readonly recovery = inject(AccountRecoveryService);
  private readonly store = inject(AccountRecoveryStore);
  private readonly router = inject(Router);
  private readonly dialog = inject(ConfirmDialogService);

  readonly loginRoute = LOGIN_ROUTE;

  /** Which step of the flow is on screen. */
  readonly step = signal<'username' | 'questions'>('username');
  readonly loading = signal(false);
  /** Non-revealing notice shown for the neutral / unknown-user outcome. */
  readonly neutralMessage = signal('');
  /** Reveal the typed answer so agents can verify it (masked by default). */
  readonly showAnswer = signal(false);

  readonly usernameForm = new FormGroup({
    userName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
  });

  readonly answerForm = new FormGroup({
    answer: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly questions = signal<SecurityQuestion[]>([]);
  readonly currentIndex = signal(0);
  private collectedAnswers: SecurityAnswer[] = [];

  /** The question currently being asked. */
  readonly currentQuestion = computed(
    () => this.questions()[this.currentIndex()] ?? null,
  );
  /** True on the final question, so the button reads "Submit" not "Next". */
  readonly isLastQuestion = computed(
    () => this.currentIndex() === this.questions().length - 1,
  );

  toggleAnswer(): void {
    this.showAnswer.update((v) => !v);
  }

  submitUsername(): void {
    if (this.usernameForm.invalid) {
      this.usernameForm.markAllAsTouched();
      return;
    }

    const userName = this.usernameForm.controls.userName.value.trim();
    this.loading.set(true);
    this.neutralMessage.set('');

    this.recovery.requestSecurityQuestions(userName).subscribe({
      next: (result) => {
        this.loading.set(false);
        if (result.kind === 'questions') {
          this.store.startReset(userName);
          this.questions.set(result.questions);
          this.currentIndex.set(0);
          this.collectedAnswers = [];
          this.answerForm.reset({ answer: '' });
          this.showAnswer.set(false);
          this.step.set('questions');
        } else {
          this.neutralMessage.set(result.message);
        }
      },
      error: (error: RecoveryError) => {
        this.loading.set(false);
        // Stay neutral even on transport failure — never reveal existence, and
        // never render a blank notice (the exact legacy bug from audit §0).
        this.neutralMessage.set(error?.errorMessage || NEUTRAL_FALLBACK);
      },
    });
  }

  submitAnswer(): void {
    const question = this.currentQuestion();
    if (!question || this.answerForm.invalid) {
      this.answerForm.markAllAsTouched();
      return;
    }

    this.collectedAnswers.push({
      questionId: question.questionId,
      answer: this.answerForm.controls.answer.value.trim(),
    });

    if (!this.isLastQuestion()) {
      this.currentIndex.update((i) => i + 1);
      this.answerForm.reset({ answer: '' });
      this.showAnswer.set(false);
      return;
    }

    this.validateAnswers();
  }

  private validateAnswers(): void {
    const userName = this.store.userName();
    if (!userName) {
      void this.router.navigate([this.loginRoute]);
      return;
    }

    this.loading.set(true);
    this.recovery.validateSecurityAnswers(userName, this.collectedAnswers).subscribe({
      next: (transactionId) => {
        this.loading.set(false);
        this.store.setTransactionId(transactionId);
        void this.router.navigate([SET_PASSWORD_ROUTE]);
      },
      error: (error: RecoveryError) => {
        this.loading.set(false);
        this.dialog
          .alert({
            title: 'Error',
            message: error?.errorMessage || 'Unable to verify your answers. Please try again.',
          })
          .subscribe(() => this.restartQuestions());
      },
    });
  }

  /** Reset to the first question so the user can re-answer after a failure. */
  private restartQuestions(): void {
    this.currentIndex.set(0);
    this.collectedAnswers = [];
    this.answerForm.reset({ answer: '' });
    this.showAnswer.set(false);
  }
}
