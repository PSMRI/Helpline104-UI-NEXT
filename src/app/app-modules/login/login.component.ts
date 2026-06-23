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
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff, lucideLock, lucideUser } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';
import {
  ZardFormControlComponent,
  ZardFormFieldComponent,
  ZardFormLabelComponent,
  ZardFormMessageComponent,
} from '@common-ui/ui/form';
import { ZardInputDirective } from '@common-ui/ui/input';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../core/auth/auth.store';
import { LoginResponse, Privilege } from '../core/auth/auth.models';
import { LoginError, LoginService } from './login.service';
import { encryptPassword } from './password-crypto';

const SERVICE_104 = '104';
const ROLE_SELECTION_ROUTE = '/role-selection';
/** Backend status code: the account is already signed in on another device. */
const CONCURRENT_SESSION_CODE = 5002;

/**
 * 104 login screen. Ported from the Angular 4 `loginContentClass`, modernised
 * to a standalone reactive-form component using ZardUI.
 *
 * Flow: encrypt password (legacy format) -> userAuthenticate -> require a 104
 * privilege -> AuthStore.setSession() -> navigate to role selection.
 *
 * Deferred from this P1 (clear TODOs): captcha, CTI login token, auto-resume
 * of an existing session, and the concurrent-session "kick & re-auth" flow.
 */
@Component({
  selector: 'app-login',
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
  ],
  viewProviders: [
    provideIcons({ lucideEye, lucideEyeOff, lucideUser, lucideLock }),
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly loginService = inject(LoginService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);

  /** Credentials of the in-flight attempt, reused for the concurrent-session retry. */
  private lastUserID = '';
  private lastEncryptedPassword = '';
  /** Guards against re-prompting if the retry still reports a concurrent session. */
  private concurrentLogoutTried = false;

  readonly form = new FormGroup({
    userID: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly showPassword = signal(false);
  readonly year = new Date().getFullYear();

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.lastUserID = this.form.controls.userID.value.trim();
    this.lastEncryptedPassword = encryptPassword(this.form.controls.password.value);
    this.concurrentLogoutTried = false;
    this.authenticate(false);
  }

  /**
   * Authenticate with the stored credentials. `doLogout` is set on the retry
   * after the user agrees to kick a session held on another device.
   */
  private authenticate(doLogout: boolean): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.loginService
      .authenticateUser(this.lastUserID, this.lastEncryptedPassword, doLogout)
      .subscribe({
        next: (response) => this.onSuccess(response, this.lastUserID),
        error: (error: LoginError) => this.onError(error),
      });
  }

  private onSuccess(response: LoginResponse, userID: string): void {
    this.loading.set(false);

    const privileges104: Privilege[] = (response.previlegeObj ?? []).filter(
      (privilege) => privilege?.serviceName === SERVICE_104,
    );

    if (privileges104.length === 0) {
      this.errorMessage.set("User doesn't have privilege to access 104");
      return;
    }

    if (response.isAuthenticated && response.Status === 'Active') {
      this.authStore.setSession({
        token: response.key,
        user: {
          userID: response.userID ?? null,
          agentID: response.agentID ?? null,
          userName: userID,
          status: response.Status,
        },
        privileges: privileges104,
      });
      void this.router.navigate([ROLE_SELECTION_ROUTE]);
    } else if (response.isAuthenticated && response.Status === 'New') {
      // TODO(P1): first-login security-question setup (legacy /setQuestions)
      // is not yet built. Do NOT establish a session until that screen lands,
      // so we never leave a half-authenticated session in storage.
      this.errorMessage.set(
        'First-time login setup is required, but is not available yet.',
      );
    } else {
      this.errorMessage.set('Unable to sign in. Please try again.');
    }
  }

  private onError(error: LoginError): void {
    this.loading.set(false);

    // 5002: the account is already signed in on another device. Offer to log
    // that session out and continue, instead of dead-ending on an error string.
    // Only prompt once: if the retry still reports 5002, fall through to the
    // error message rather than re-opening the dialog in a loop.
    if (error?.status === CONCURRENT_SESSION_CODE && !this.concurrentLogoutTried) {
      this.promptConcurrentLogout();
      return;
    }

    this.errorMessage.set(
      error?.errorMessage || 'Internal issue, please try again later.',
    );
  }

  /**
   * Confirm with the user, then log out the session on the other device and
   * retry the login with `doLogout = true`. Cancelling leaves them on the login
   * screen. Mirrors the legacy concurrent-session "kick & re-auth" flow.
   */
  private promptConcurrentLogout(): void {
    this.confirmDialog
      .confirm({
        title: 'Already logged in',
        message:
          'You are already logged in. Do you want to logout from other device and login here?',
        okText: 'Yes, logout',
        cancelText: 'Cancel',
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        this.concurrentLogoutTried = true;
        this.loading.set(true);
        this.errorMessage.set('');
        this.loginService
          .logOutUserFromConcurrentSession(this.lastUserID)
          .subscribe({
            next: () => this.authenticate(true),
            error: (error: LoginError) => {
              this.loading.set(false);
              this.errorMessage.set(
                error?.errorMessage ||
                  'Unable to log out the other session. Please try again.',
              );
            },
          });
      });
  }
}
