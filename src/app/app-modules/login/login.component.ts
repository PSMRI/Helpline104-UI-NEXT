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

import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { CzentrixService } from '../core/services/czentrix.service';
import { AccountRecoveryStore } from '../account-recovery/account-recovery.store';
import { CaptchaComponent } from './captcha.component';
import { isCaptchaConfigured } from './captcha.service';
import { LoginError, LoginService } from './login.service';
import { encryptPassword } from './password-crypto';

const SERVICE_104 = '104';
const ROLE_SELECTION_ROUTE = '/role-selection';
const SET_SECURITY_QUESTIONS_ROUTE = '/set-security-questions';
/** Backend status code: the account is already signed in on another device. */
const CONCURRENT_SESSION_CODE = 5002;

/**
 * 104 login screen. Ported from the Angular 4 `loginContentClass`, modernised
 * to a standalone reactive-form component using ZardUI.
 *
 * Flow: encrypt password (legacy format) -> userAuthenticate -> require a 104
 * privilege -> AuthStore.setSession() -> CTI handshake (fire-and-forget) ->
 * navigate to role selection.
 *
 * Deferred from this P1 (clear TODOs): auto-resume of an existing session.
 *
 * Captcha (Cloudflare Turnstile, as in the legacy login) is wired but inert:
 * it renders — and lazily loads the challenge script — only when
 * `environment.enableCaptcha` is true AND a `siteKey` AND a
 * `captchaChallengeURL` are configured. With the current empty prod
 * placeholders nothing loads; filling the environment values activates it
 * with no code change.
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
    CaptchaComponent,
    TranslatePipe,
  ],
  viewProviders: [provideIcons({ lucideEye, lucideEyeOff, lucideUser, lucideLock })],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly loginService = inject(LoginService);
  private readonly authStore = inject(AuthStore);
  private readonly czentrix = inject(CzentrixService);
  private readonly recoveryStore = inject(AccountRecoveryStore);
  private readonly router = inject(Router);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly i18n = inject(I18nService);

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
  readonly lang = this.i18n.language;

  /**
   * Whether the Turnstile captcha is active. All parts are deploy-time
   * constants, so this is fixed for the lifetime of the app: the flag must be
   * on AND a site key AND a challenge URL must exist (prod currently ships
   * empty placeholders, so the widget renders nothing and the challenge
   * script is never loaded).
   */
  readonly captchaEnabled = isCaptchaConfigured();

  /** Latest solved Turnstile token; empty while unsolved/expired/reset. */
  readonly captchaToken = signal('');

  /** True when the widget failed to initialise; shows the error + retry UI. */
  readonly captchaFailed = signal(false);

  private readonly captchaCmp = viewChild(CaptchaComponent);

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onCaptchaToken(token: string): void {
    this.captchaToken.set(token);
  }

  onCaptchaFailed(): void {
    this.captchaFailed.set(true);
  }

  /**
   * Re-mounts the captcha widget after an init failure (the @if in the
   * template destroys and recreates the component, which re-runs the load —
   * the service clears its cached promise on failure, so this is a real
   * retry, not a replay of the rejection).
   */
  retryCaptcha(): void {
    this.captchaFailed.set(false);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // The button is disabled until the challenge is solved; this guards
    // programmatic/Enter-key submits the same way.
    if (this.captchaEnabled && !this.captchaToken()) {
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
      .authenticateUser(
        this.lastUserID,
        this.lastEncryptedPassword,
        doLogout,
        // Same contract as legacy: the token rides on the login body only when
        // captcha is active and solved (the service drops falsy tokens).
        this.captchaEnabled ? this.captchaToken() || undefined : undefined,
      )
      .subscribe({
        next: (response) => this.onSuccess(response, this.lastUserID),
        error: (error: LoginError) => this.onError(error),
      });
  }

  /**
   * Discard the used challenge and demand a fresh one. Turnstile tokens are
   * single-use, so this runs after every authentication attempt (success or
   * failure), mirroring the legacy `resetCaptcha()` placement.
   */
  private resetCaptcha(): void {
    if (!this.captchaEnabled) {
      return;
    }
    this.captchaToken.set('');
    this.captchaCmp()?.reset();
  }

  private onSuccess(response: LoginResponse, userID: string): void {
    this.loading.set(false);
    this.resetCaptcha();

    const privileges104: Privilege[] = (response.previlegeObj ?? []).filter(
      (privilege) => privilege?.serviceName === SERVICE_104,
    );

    if (privileges104.length === 0) {
      this.errorMessage.set("User doesn't have privilege to access 104");
      return;
    }

    if (response.isAuthenticated && response.Status === 'Active') {
      const agentID = resolveAgentID(response, privileges104);
      this.authStore.setSession({
        token: response.key,
        user: {
          userID: response.userID ?? null,
          agentID,
          userName: userID,
          status: response.Status,
        },
        privileges: privileges104,
      });
      // CTI handshake: getLoginKey -> getAgentIPAddress -> doAgentLogin. Fired
      // in the background (as the legacy app did) so a dark softphone never
      // blocks the portal login; the service stores the key/IP for later use.
      // Always run it, even with no agentID (e.g. a supervisor) — the login
      // key it captures is also what the supervisor Agent Status screen
      // needs, and CzentrixService itself skips the dialer-registration
      // steps for a null id.
      this.czentrix.startCtiSession(userID, this.lastEncryptedPassword, agentID).subscribe();
      void this.router.navigate([ROLE_SELECTION_ROUTE]);
    } else if (response.isAuthenticated && response.Status === 'New') {
      // First-login: the user must set security questions before a session is
      // established. We deliberately do NOT call authStore.setSession() here, so
      // no half-authenticated session is persisted; the setup screen reads the
      // user id/name it needs from the in-memory recovery store instead.
      const userId = response.userID ?? null;
      if (userId == null) {
        this.errorMessage.set('Unable to start first-time setup. Please contact your administrator.');
        return;
      }
      this.recoveryStore.startSecurityQuestionSetup(userID, userId);
      void this.router.navigate([SET_SECURITY_QUESTIONS_ROUTE]);
    } else {
      this.errorMessage.set('Unable to sign in. Please try again.');
    }
  }

  private onError(error: LoginError): void {
    this.loading.set(false);
    this.resetCaptcha();

    // 5002: the account is already signed in on another device. Offer to log
    // that session out and continue, instead of dead-ending on an error string.
    // Only prompt once: if the retry still reports 5002, fall through to the
    // error message rather than re-opening the dialog in a loop.
    if (error?.status === CONCURRENT_SESSION_CODE && !this.concurrentLogoutTried) {
      this.promptConcurrentLogout();
      return;
    }

    this.errorMessage.set(error?.errorMessage || 'Internal issue, please try again later.');
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
        message: 'You are already logged in. Do you want to logout from other device and login here?',
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
        this.loginService.logOutUserFromConcurrentSession(this.lastUserID).subscribe({
          next: () => this.authenticate(true),
          error: (error: LoginError) => {
            this.loading.set(false);
            this.errorMessage.set(error?.errorMessage || 'Unable to log out the other session. Please try again.');
          },
        });
      });
  }
}

/**
 * The agent's CZentrix dialer id. The backend does not return it at the top
 * level of the login response: it rides on each 104 privilege (and its roles),
 * sometimes as a string (e.g. `previlegeObj[0].agentID === "2145"` on UAT).
 * Checks the top level first for backward compatibility, then the privilege
 * tree; returns null when the user has no dialer id (CTI stays dark).
 */
function resolveAgentID(response: LoginResponse, privileges: Privilege[]): number | null {
  const candidates: unknown[] = [
    response.agentID,
    ...privileges.flatMap((privilege) => [
      privilege['agentID'],
      ...(privilege.roles ?? []).map((role) => role.agentID),
    ]),
  ];
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === '') {
      continue;
    }
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}
