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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SupervisorError } from '../../shared/supervisor-api';
import { BloodUrlService } from './blood-url.service';

/** Legacy website pattern (`website_expression`). */
const WEBSITE_PATTERN = /^(http[s]?:\/\/){0,1}(www\.){0,1}[a-zA-Z0-9.-]+\.[a-zA-Z]{2,5}[.]{0,1}/;

/**
 * Blood bank URL config (legacy `SupervisorBloodUrlComponent`): shows the
 * service's configured blood-bank website and lets the supervisor update it.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-blood-url',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucidePencil })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        {{ 'supBlood.title' | translate: lang() }}
      </h1>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      @if (!editing()) {
        <div class="flex flex-wrap items-center gap-2 text-sm">
          <span class="font-medium text-foreground">
            {{ 'supBlood.currentUrl' | translate: lang() }}:
          </span>
          @if (hasUrl()) {
            <a
              class="text-primary underline-offset-2 hover:underline"
              [href]="currentUrl()"
              target="_blank"
              rel="noopener noreferrer"
              >{{ currentUrl() }}</a
            >
          } @else {
            <span class="text-muted-foreground">
              {{ 'supBlood.urlPlaceholder' | translate: lang() }}
            </span>
          }
          <button
            z-button
            type="button"
            zType="ghost"
            zSize="sm"
            [attr.aria-label]="'supBlood.edit' | translate: lang()"
            (click)="startEdit()"
          >
            <ng-icon name="lucidePencil" size="16" aria-hidden="true" />
          </button>
        </div>
      } @else {
        <form class="flex flex-wrap items-end gap-4" (ngSubmit)="update()">
          <div class="w-full max-w-sm">
            <label for="blood-url" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supBlood.urlLabel' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="blood-url" z-input class="w-full" [formControl]="url" />
            @if (url.hasError('pattern') && url.touched) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supBlood.invalidUrl' | translate: lang() }}
              </p>
            }
          </div>
          <div class="flex gap-2">
            <button z-button type="button" zType="outline" (click)="cancelEdit()">
              {{ 'supBlood.cancel' | translate: lang() }}
            </button>
            <button
              z-button
              type="submit"
              zType="default"
              [zLoading]="saving()"
              [zDisabled]="url.hasError('pattern') || saving()"
            >
              {{ 'supBlood.update' | translate: lang() }}
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class BloodUrlComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(BloodUrlService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly currentUrl = signal('');
  readonly hasUrl = signal(false);

  private institutionID: number | null = null;

  readonly url = this.fb.control('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(WEBSITE_PATTERN)],
  });

  ngOnInit(): void {
    this.loadUrl();
  }

  private psmID(): number | null {
    return this.authStore.currentRole()?.providerServiceMapID ?? null;
  }

  private loadUrl(): void {
    this.service
      .getBloodBankUrl(this.psmID())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res?.institutionID) {
            this.institutionID = res.institutionID;
            this.currentUrl.set(res.website ?? '');
            this.hasUrl.set(true);
          } else {
            this.institutionID = null;
            this.currentUrl.set('');
            this.hasUrl.set(false);
          }
        },
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
  }

  startEdit(): void {
    this.url.reset(this.hasUrl() ? this.currentUrl() : '');
    this.errorMessage.set('');
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.errorMessage.set('');
  }

  update(): void {
    if (this.url.invalid) {
      this.url.markAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .saveBloodBankUrl({
        institutionID: this.institutionID,
        providerServiceMapID: this.psmID(),
        website: this.url.value.trim() || null,
        createdBy: this.authStore.user()?.userName ?? null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          toast.success(this.i18n.instant('supBlood.updated'));
          this.editing.set(false);
          this.loadUrl();
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set(this.i18n.instant('supBlood.updateError'));
        },
      });
  }
}
