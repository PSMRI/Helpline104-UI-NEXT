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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SupervisorError } from '../../shared/supervisor-api';
import { ForceLogoutService } from './force-logout.service';

/**
 * Agent force-logout (legacy `ForceLogoutComponent`, the supervisor console
 * screen): kick a logged-in agent out of the system by username, after a
 * confirmation prompt.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-force-logout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        {{ 'supLogout.title' | translate: lang() }}
      </h1>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      <form class="flex flex-wrap items-end gap-4" (ngSubmit)="kickout()">
        <div class="w-full max-w-xs">
          <label for="fl-username" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supLogout.userName' | translate: lang() }}
            <span class="text-destructive">*</span>
          </label>
          <input id="fl-username" z-input class="w-full" [formControl]="userName" />
        </div>
        <button
          z-button
          type="submit"
          zType="default"
          [zLoading]="saving()"
          [zDisabled]="userName.invalid || saving()"
        >
          {{ 'supLogout.kickout' | translate: lang() }}
        </button>
      </form>
    </section>
  `,
})
export class ForceLogoutComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ForceLogoutService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly userName = this.fb.control('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(3)],
  });

  kickout(): void {
    if (this.userName.invalid) {
      this.userName.markAsTouched();
      return;
    }
    const userName = this.userName.value.trim();
    this.confirmDialog
      .confirm({
        title: this.i18n.instant('supLogout.title'),
        message: `${this.i18n.instant('supLogout.confirm')} ${userName}?`,
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.doKickout(userName);
        }
      });
  }

  private doKickout(userName: string): void {
    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .forceLogout(userName, this.authStore.currentRole()?.providerServiceMapID ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          // The legacy screen treated a non-"success" response text as failure.
          if ((res?.response ?? '').toLowerCase() === 'success') {
            toast.success(this.i18n.instant('supLogout.success'));
          } else {
            this.errorMessage.set(
              res?.errorMessage || this.i18n.instant('supLogout.failed'),
            );
          }
          this.userName.reset('');
        },
        error: (err: SupervisorError) => {
          this.saving.set(false);
          this.errorMessage.set(err.errorMessage);
          this.userName.reset('');
        },
      });
  }
}
