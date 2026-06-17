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
import { Router } from '@angular/router';

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

import { AuthStore } from '../core/auth/auth.store';
import { LoginResponse, Privilege } from '../core/auth/auth.models';
import { LoginError, LoginService } from './login.service';
import { encryptPassword } from './password-crypto';

const SERVICE_104 = '104';
const ROLE_SELECTION_ROUTE = '/role-selection';

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
    NgIcon,
    ZardInputDirective,
    ZardButtonComponent,
    ZardFormFieldComponent,
    ZardFormControlComponent,
    ZardFormLabelComponent,
    ZardFormMessageComponent,
  ],
  viewProviders: [provideIcons({ lucideEye, lucideEyeOff })],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly loginService = inject(LoginService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

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

    const userID = this.form.controls.userID.value.trim();
    const password = this.form.controls.password.value;

    this.loading.set(true);
    this.errorMessage.set('');

    const encryptedPassword = encryptPassword(password);
    this.loginService.authenticateUser(userID, encryptedPassword).subscribe({
      next: (response) => this.onSuccess(response, userID),
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
    this.errorMessage.set(
      error?.errorMessage || 'Internal issue, please try again later.',
    );
  }
}
