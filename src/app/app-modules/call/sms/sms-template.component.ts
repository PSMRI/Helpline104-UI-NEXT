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
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, of, switchMap } from 'rxjs';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSend } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../core/auth/auth.store';
import { CallStore } from '../call.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SmsService } from './sms.service';
import { SmsError, SmsTemplate, SmsType } from './sms.models';

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring';
const PHONE_PATTERN = /^[0-9]{10}$/;

/**
 * Post-registration SMS send with a template picker, ported from the legacy
 * send flow (`SmsTemplateService.getSMSTypes/getSMSTemplates/sendSMS`). The
 * agent picks an SMS type → an active template, optionally overrides the
 * recipient with an alternate number (else the caller's CLI is used), and
 * sends. Beneficiary/agent/service context comes from the stores.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-sms-template',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucideSend })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon name="lucideSend" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-foreground">
          {{ 'sms.title' | translate: lang() }}
        </h3>
      </header>

      @if (!hasContext()) {
        <p class="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          {{ 'sms.noContext' | translate: lang() }}
        </p>
      } @else {
        @if (errorMessage()) {
          <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
        }

        <form [formGroup]="form" class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="sms-type" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sms.type' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="sms-type" [class]="selectClass" formControlName="smsTypeID" (change)="onTypeChange()">
              <option [ngValue]="null" disabled>{{ 'sms.selectType' | translate: lang() }}</option>
              @for (t of types(); track t.smsTypeID) {
                <option [ngValue]="t.smsTypeID">{{ t.smsType }}</option>
              }
            </select>
          </div>

          <div>
            <label for="sms-template" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sms.template' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="sms-template" [class]="selectClass" formControlName="smsTemplateID">
              <option [ngValue]="null" disabled>{{ 'sms.selectTemplate' | translate: lang() }}</option>
              @for (tpl of templates(); track tpl.smsTemplateID) {
                <option [ngValue]="tpl.smsTemplateID">{{ tpl.smsTemplateName }}</option>
              }
            </select>
          </div>

          <div class="sm:col-span-2">
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-input text-primary focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                formControlName="useAlternate"
              />
              {{ 'sms.altNumber' | translate: lang() }}
            </label>
            @if (form.controls.useAlternate.value) {
              <div class="mt-2 max-w-xs">
                <input
                  z-input
                  class="w-full"
                  formControlName="alternateNumber"
                  inputmode="numeric"
                  maxlength="10"
                  [attr.aria-label]="'sms.enterMobile' | translate: lang()"
                  [placeholder]="'sms.enterMobile' | translate: lang()"
                />
                @if (!altNumberValid()) {
                  <p class="mt-0.5 text-xs text-destructive">{{ 'sms.mobileError' | translate: lang() }}</p>
                }
              </div>
            }
          </div>
        </form>

        <div class="mt-4">
          <button z-button type="button" zType="default" [zLoading]="sending()" [zDisabled]="!canSend()" (click)="send()">
            <ng-icon name="lucideSend" size="16" aria-hidden="true" />
            {{ 'sms.send' | translate: lang() }}
          </button>
        </div>
      }
    </section>
  `,
})
export class SmsTemplateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly sms = inject(SmsService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted after the SMS is sent. */
  readonly sent = output<void>();

  readonly lang = this.i18n.language;
  readonly selectClass = SELECT_CLASS;

  readonly types = signal<SmsType[]>([]);
  readonly templates = signal<SmsTemplate[]>([]);
  readonly sending = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    smsTypeID: this.fb.control<number | null>(null, Validators.required),
    smsTemplateID: this.fb.control<number | null>(null, Validators.required),
    useAlternate: this.fb.control(false, { nonNullable: true }),
    alternateNumber: this.fb.control('', { nonNullable: true }),
  });

  readonly hasContext = computed(() => this.callStore.beneficiaryId() !== null);

  /** Emits the chosen SMS type; switchMap cancels an in-flight templates load. */
  private readonly typeChanges = new Subject<number>();

  constructor() {
    this.typeChanges
      .pipe(
        switchMap((typeID) => {
          const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;
          return this.sms.getSmsTemplates(providerServiceMapID, typeID).pipe(
            // Keep the stream alive on error so later type changes still load.
            catchError((err: SmsError) => {
              this.errorMessage.set(err.errorMessage || this.i18n.instant('sms.loadError'));
              return of<SmsTemplate[]>([]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      // Only offer active (non-deleted) templates.
      .subscribe((list) => this.templates.set(list.filter((t) => t.deleted !== true)));
  }

  ngOnInit(): void {
    if (!this.hasContext()) {
      return;
    }
    const serviceID = this.authStore.currentRole()?.serviceID ?? null;
    this.sms
      .getSmsTypes(serviceID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => this.types.set(types),
        error: (err: SmsError) => this.errorMessage.set(err.errorMessage || this.i18n.instant('sms.loadError')),
      });
  }

  /** Alternate number valid unless enabled and not a 10-digit number. */
  altNumberValid(): boolean {
    if (!this.form.controls.useAlternate.value) {
      return true;
    }
    return PHONE_PATTERN.test(this.form.controls.alternateNumber.value.trim());
  }

  canSend(): boolean {
    return this.form.valid && !this.sending() && this.altNumberValid();
  }

  onTypeChange(): void {
    this.form.controls.smsTemplateID.setValue(null);
    this.templates.set([]);
    const typeID = this.form.controls.smsTypeID.value;
    if (typeID == null) {
      return;
    }
    this.errorMessage.set('');
    this.typeChanges.next(typeID);
  }

  send(): void {
    if (!this.canSend()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const alt = v.alternateNumber.trim();
    const role = this.authStore.currentRole();
    this.sending.set(true);
    this.errorMessage.set('');
    this.sms
      .sendSms([
        {
          beneficiaryRegID: this.callStore.beneficiaryId(),
          smsTemplateID: v.smsTemplateID as number,
          smsTemplateTypeID: v.smsTypeID as number,
          providerServiceMapID: role?.providerServiceMapID ?? null,
          createdBy: this.authStore.user()?.userName ?? '',
          // Only override the recipient when an alternate number is entered;
          // otherwise leave it null so the backend uses the registered number
          // (matching the legacy send flow).
          alternateNo: v.useAlternate && alt ? alt : null,
          is1097: false,
        },
      ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.sending.set(false);
          toast.success(this.i18n.instant('sms.sent'));
          this.form.reset({ smsTypeID: null, smsTemplateID: null, useAlternate: false, alternateNumber: '' });
          this.templates.set([]);
          this.sent.emit();
        },
        error: (err: SmsError) => {
          this.sending.set(false);
          const msg = err.errorMessage || this.i18n.instant('sms.error');
          this.errorMessage.set(msg);
          toast.error(msg);
        },
      });
  }
}
