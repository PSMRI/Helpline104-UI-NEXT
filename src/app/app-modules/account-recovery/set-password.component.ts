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

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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

import { AppFooterComponent } from '@/shared/components/layout/app-footer.component';
import { AppHeaderComponent } from '@/shared/components/layout/app-header.component';

import { LOGIN_ROUTE } from '../core/core.constants';
import { encryptPassword } from '../login/password-crypto';
import { AccountRecoveryService } from './account-recovery.service';
import { AccountRecoveryStore } from './account-recovery.store';
import { RecoveryError } from './account-recovery.models';

/**
 * Password policy (legacy parity): 8–12 chars, at least one digit, one
 * uppercase letter and one special character from `!@#$%^&*`, and only
 * alphanumerics plus those specials.
 */
const PASSWORD_PATTERN =
  /^(?=.*[0-9])(?=.*[A-Z])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,12}$/;

/** Group validator: confirm must equal the new password. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return newPassword === confirmPassword ? null : { passwordMismatch: true };
}

/**
 * Set-new-password screen (legacy `/setPassword`), reached after the
 * forgot-password flow validates the user's security answers and stores a
 * `transactionId`. Without that transaction id in memory the screen is
 * meaningless, so it redirects to login.
 */
@Component({
  selector: 'app-set-password',
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
  templateUrl: './set-password.component.html',
})
export class SetPasswordComponent implements OnInit {
  private readonly recovery = inject(AccountRecoveryService);
  private readonly store = inject(AccountRecoveryStore);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);

  readonly form = new FormGroup(
    {
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
    { validators: passwordsMatch },
  );

  ngOnInit(): void {
    // No active reset session → nothing to set. Bounce back to login.
    if (!this.store.transactionId() || !this.store.userName()) {
      void this.router.navigate([LOGIN_ROUTE]);
    }
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const userName = this.store.userName();
    const transactionId = this.store.transactionId();
    if (!userName || !transactionId) {
      void this.router.navigate([LOGIN_ROUTE]);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const encrypted = encryptPassword(this.form.controls.newPassword.value);
    this.recovery.setForgetPassword(userName, encrypted, transactionId).subscribe({
      next: () => {
        this.loading.set(false);
        this.store.clear();
        toast.success('Password changed successfully. Please sign in.');
        void this.router.navigate([LOGIN_ROUTE]);
      },
      error: (error: RecoveryError) => {
        this.loading.set(false);
        this.errorMessage.set(
          error?.errorMessage || 'Unable to change password. Please try again.',
        );
      },
    });
  }
}
