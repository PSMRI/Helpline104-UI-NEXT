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
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of, switchMap, tap } from 'rxjs';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2 } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SIO_SELECT_CLASS } from '../shared/sio-ui';
import { SioError } from '../shared/sio-api';
import { SioOutboundProviderService } from './sio-outbound-provider.service';
import { BloodRequestDetail, OutboundProviderInput } from './sio-outbound-provider.models';

/**
 * SIO outbound blood-bank provider management. Opened from the outbound worklist
 * for a specific blood request: it shows the requirement (recipient, component,
 * group, units) read-only, then captures the blood-bank provider contact and
 * marks the request fulfilled.
 *
 * Ported (focused) from the legacy `SioOutboundProviderComponent`. Standalone,
 * OnPush + signals, Reactive Forms, ZardUI + Tailwind only. Driven by the
 * {@link request} worklist input rather than the live-call CallStore (this is an
 * outbound screen); the SMS-on-save step is a separate concern and omitted.
 */
@Component({
  selector: 'app-sio-outbound-provider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucideBuilding2 })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon name="lucideBuilding2" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-foreground">{{ 'sio.outbound.title' | translate: lang() }}</h3>
      </header>

      @if (!hasContext()) {
        <p class="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          {{ 'sio.outbound.noRequest' | translate: lang() }}
        </p>
      } @else {
        @if (errorMessage()) {
          <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
        }

        <!-- Request under fulfilment (read-only) -->
        <dl class="mb-5 grid gap-3 rounded-md border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt class="text-xs font-medium text-muted-foreground">{{ 'sio.outbound.recipient' | translate: lang() }}</dt>
            <dd class="font-medium text-foreground">{{ request()?.beneficiaryName || detail()?.recipientName || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted-foreground">{{ 'sio.blood.componentType' | translate: lang() }}</dt>
            <dd class="font-medium text-foreground">{{ detail()?.m_componentType?.componentType || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted-foreground">{{ 'sio.blood.bloodGroup' | translate: lang() }}</dt>
            <dd class="font-medium text-foreground">{{ detail()?.m_bloodGroup?.bloodGroup || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-muted-foreground">{{ 'sio.outbound.unitRequired' | translate: lang() }}</dt>
            <dd class="font-medium text-foreground">{{ detail()?.unitRequired ?? '—' }}</dd>
          </div>
        </dl>

        <form [formGroup]="form" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label for="ob-person" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.outbound.contactPerson' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input id="ob-person" z-input class="w-full" type="text" maxlength="25" formControlName="contactPerson" />
          </div>

          <div>
            <label for="ob-designation" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.outbound.designation' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input id="ob-designation" z-input class="w-full" type="text" maxlength="25" formControlName="designation" />
          </div>

          <div>
            <label for="ob-mobile" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.mobileNumber' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input id="ob-mobile" z-input class="w-full" type="text" inputmode="numeric" maxlength="10" formControlName="mobileNo" />
          </div>

          <div class="sm:col-span-2 lg:col-span-3">
            <label for="ob-address" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.address' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <textarea id="ob-address" [class]="textareaClass" rows="2" maxlength="100" formControlName="address"></textarea>
          </div>

          <div class="sm:col-span-2 lg:col-span-3">
            <label for="ob-feedback" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.outbound.feedback' | translate: lang() }}
            </label>
            <textarea id="ob-feedback" [class]="textareaClass" rows="2" maxlength="500" formControlName="feedback"></textarea>
          </div>

          <div class="sm:col-span-2 lg:col-span-3">
            <label for="ob-remarks" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.remarks' | translate: lang() }}
            </label>
            <textarea id="ob-remarks" [class]="textareaClass" rows="2" maxlength="500" formControlName="remarks"></textarea>
          </div>

          <label class="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              formControlName="isRequestFulfilled"
            />
            {{ 'sio.outbound.requestFulfilled' | translate: lang() }}
          </label>
        </form>

        <div class="mt-4">
          <button z-button type="button" zType="default" [zLoading]="saving()" [zDisabled]="form.invalid || saving()" (click)="save()">
            {{ 'sio.common.save' | translate: lang() }}
          </button>
        </div>
      }
    </section>
  `,
})
export class SioOutboundProviderComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SioOutboundProviderService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** The worklist item (beneficiary + blood-request id) being fulfilled. */
  readonly request = input<OutboundProviderInput | null>(null);

  /** Emitted after the provider contact is saved. */
  readonly saved = output<void>();

  readonly lang = this.i18n.language;
  readonly textareaClass = SIO_SELECT_CLASS + ' min-h-[3.5rem]';

  readonly detail = signal<BloodRequestDetail | null>(null);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    contactPerson: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(25),
    ]),
    designation: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(25),
    ]),
    mobileNo: this.fb.control<string | null>(null, [Validators.required, Validators.pattern(/^[0-9]{10}$/)]),
    address: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(100),
    ]),
    feedback: this.fb.control<string | null>(null, Validators.maxLength(500)),
    remarks: this.fb.control<string | null>(null, Validators.maxLength(500)),
    isRequestFulfilled: this.fb.control<boolean>(false, { nonNullable: true }),
  });

  readonly hasContext = computed(() => this.request()?.beneficiaryRegID != null);

  constructor() {
    // Load the blood request whenever the worklist item changes. `switchMap`
    // cancels any in-flight request so a slower earlier response can't overwrite
    // a newer selection, and the error is cleared on each new load.
    toObservable(this.request)
      .pipe(
        tap(() => this.errorMessage.set('')),
        switchMap((req) => {
          if (req?.beneficiaryRegID == null) {
            return of<BloodRequestDetail | null>(null);
          }
          // Catch inside switchMap so a load error surfaces a message without
          // terminating the outer stream (later selections must still reload).
          return this.service.getBloodRequest(req.beneficiaryRegID, req.bloodReqID ?? null).pipe(
            catchError((err: SioError) => {
              this.errorMessage.set(err.errorMessage || this.i18n.instant('sio.common.loadError'));
              return of<BloodRequestDetail | null>(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((detail) => this.detail.set(detail));
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const bloodReqID = this.detail()?.bloodReqID ?? this.request()?.bloodReqID ?? null;
    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .saveBloodBankDetails({
        bloodReqID,
        bloodBankPersonName: v.contactPerson ?? '',
        bBPersonDesignation: v.designation ?? '',
        bloodBankMobileNo: v.mobileNo ?? '',
        bloodBankAddress: v.address ?? '',
        feedback: v.feedback?.trim() || null,
        remarks: v.remarks?.trim() || null,
        isRequestFulfilled: v.isRequestFulfilled,
        sendSMS: false,
        deleted: false,
        createdBy: this.authStore.user()?.userName ?? '',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          toast.success(this.i18n.instant('sio.common.saved'));
          this.form.reset({ isRequestFulfilled: false });
          this.saved.emit();
        },
        error: (err: SioError) => {
          this.saving.set(false);
          const msg = err.errorMessage || this.i18n.instant('sio.common.saveError');
          this.errorMessage.set(msg);
          toast.error(msg);
        },
      });
  }
}
