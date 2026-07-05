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

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHeartPulse } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CallStore } from '../../call.store';
import { BeneficiaryService } from '../../beneficiary/beneficiary.service';
import { Gender } from '../../beneficiary/beneficiary.models';
import { SIO_SELECT_CLASS } from '../shared/sio-ui';
import { SioError } from '../shared/sio-api';
import { OrganDonationService } from './organ-donation.service';
import {
  DonatableOrgan,
  DonationType,
  OrganDonationRow,
} from './organ-donation.models';

/**
 * Organ Donation (donation request) service tab. The agent captures the donor,
 * their age / gender, the donation type and the donatable organ, then saves the
 * request; prior requests for the beneficiary are listed below.
 *
 * Ported (inbound-focused) from the legacy SIO organ-donation flow. Standalone,
 * OnPush + signals, Reactive Forms, ZardUI + Tailwind only. The legacy
 * hospital-referral search, institute-details save, outbound follow-up and SMS
 * flow are separate concerns and are intentionally out of scope here.
 */
@Component({
  selector: 'app-sio-organ-donation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucideHeartPulse })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon name="lucideHeartPulse" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-foreground">{{ 'sio.organ.title' | translate: lang() }}</h3>
      </header>

      @if (!hasContext()) {
        <p class="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          {{ 'sio.common.noContext' | translate: lang() }}
        </p>
      } @else {
        @if (errorMessage()) {
          <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
        }

        <form [formGroup]="form" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label for="organ-donor" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.organ.donorName' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input id="organ-donor" z-input class="w-full" type="text" maxlength="25" formControlName="donorName" />
          </div>

          <div>
            <label for="organ-age" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.age' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input id="organ-age" z-input class="w-full" type="number" inputmode="numeric" min="1" max="120" formControlName="donorAge" />
          </div>

          <div>
            <label for="organ-gender" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.gender' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="organ-gender" [class]="selectClass" formControlName="donorGenderID">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (g of genders(); track g.genderID) {
                <option [ngValue]="g.genderID">{{ g.genderName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="organ-type" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.organ.donationType' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="organ-type" [class]="selectClass" formControlName="donationTypeID">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (t of donationTypes(); track t.donationTypeID) {
                <option [ngValue]="t.donationTypeID">{{ t.donationType }}</option>
              }
            </select>
          </div>

          <div>
            <label for="organ-organ" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.organ.organ' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="organ-organ" [class]="selectClass" formControlName="donatableOrganID">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (o of donatableOrgans(); track o.donatableOrganID) {
                <option [ngValue]="o.donatableOrganID">{{ o.donatableOrgan }}</option>
              }
            </select>
          </div>

          <div class="sm:col-span-2 lg:col-span-3">
            <label for="organ-remarks" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.remarks' | translate: lang() }}
            </label>
            <textarea id="organ-remarks" [class]="textareaClass" rows="2" maxlength="500" formControlName="remarks"></textarea>
          </div>
        </form>

        <div class="mt-4">
          <button z-button type="button" zType="default" [zLoading]="saving()" [zDisabled]="form.invalid || saving()" (click)="save()">
            {{ 'sio.common.save' | translate: lang() }}
          </button>
        </div>

        <div class="mt-6">
          <h4 class="mb-2 text-sm font-medium text-foreground">{{ 'sio.common.history' | translate: lang() }}</h4>
          @if (history().length === 0) {
            <p class="text-sm text-muted-foreground">{{ 'sio.common.noHistory' | translate: lang() }}</p>
          } @else {
            <div class="overflow-x-auto rounded-md border border-border">
              <table class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th class="px-3 py-2 font-medium">{{ 'sio.organ.colRequestId' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.organ.colDonor' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.common.gender' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.common.age' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.organ.donationType' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.organ.organ' | translate: lang() }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of history(); track $index) {
                    <tr class="border-t border-border align-top">
                      <td class="px-3 py-2">{{ row.requestID ?? '—' }}</td>
                      <td class="px-3 py-2">{{ row.donarName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.m_gender?.genderName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.donarAge ?? '—' }}</td>
                      <td class="px-3 py-2">{{ row.m_donationType?.donationType || '—' }}</td>
                      <td class="px-3 py-2">{{ row.m_donatableOrgan?.donatableOrgan || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class OrganDonationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly organ = inject(OrganDonationService);
  private readonly beneficiary = inject(BeneficiaryService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted after an organ-donation request is saved (marks the call service-availed). */
  readonly serviceProvided = output<void>();

  readonly lang = this.i18n.language;
  readonly selectClass = SIO_SELECT_CLASS;
  readonly textareaClass = SIO_SELECT_CLASS + ' min-h-[3.5rem]';

  readonly genders = signal<Gender[]>([]);
  readonly donationTypes = signal<DonationType[]>([]);
  readonly donatableOrgans = signal<DonatableOrgan[]>([]);
  readonly history = signal<OrganDonationRow[]>([]);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    donorName: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(25),
    ]),
    donorAge: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(120),
    ]),
    donorGenderID: this.fb.control<number | null>(null, Validators.required),
    donationTypeID: this.fb.control<number | null>(null, Validators.required),
    donatableOrganID: this.fb.control<number | null>(null, Validators.required),
    remarks: this.fb.control<string | null>(null, Validators.maxLength(500)),
  });

  readonly hasContext = computed(() => this.callStore.beneficiaryId() !== null);

  ngOnInit(): void {
    if (!this.hasContext()) {
      return;
    }
    const role = this.authStore.currentRole();
    const providerServiceMapID = role?.providerServiceMapID ?? null;

    this.organ.getDonationTypes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (list) => this.donationTypes.set(list),
      error: (err: SioError) => this.setError(err),
    });
    this.organ.getDonatableOrgans().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (list) => this.donatableOrgans.set(list),
      error: (err: SioError) => this.setError(err),
    });
    this.beneficiary
      .getRegistrationData(providerServiceMapID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (master) => this.genders.set(master?.m_genders ?? []),
        error: (err: SioError) => this.setError(err),
      });

    this.loadHistory();
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set('');
    this.organ
      .saveRequest({
        t_organDonations: [
          {
            donatableOrganID: v.donatableOrganID,
            beneficiaryRegID: this.callStore.beneficiaryId(),
            donarName: v.donorName ?? '',
            donarAge: v.donorAge,
            donarGenderID: v.donorGenderID,
            donationTypeID: v.donationTypeID,
            deleted: false,
            createdBy: this.authStore.user()?.userName ?? '',
            isSelf: false,
            providerServiceMapID: this.authStore.currentRole()?.providerServiceMapID ?? null,
            benCallID: this.callStore.callId(),
            remarks: v.remarks?.trim() || null,
          },
        ],
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          toast.success(this.i18n.instant('sio.common.saved'));
          this.resetForm();
          this.serviceProvided.emit();
          this.loadHistory();
        },
        error: (err: SioError) => {
          this.saving.set(false);
          const msg = err.errorMessage || this.i18n.instant('sio.common.saveError');
          this.errorMessage.set(msg);
          toast.error(msg);
        },
      });
  }

  private resetForm(): void {
    this.form.reset();
  }

  private loadHistory(): void {
    this.organ
      .getHistory(this.callStore.beneficiaryId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (rows) => this.history.set(rows), error: () => this.history.set([]) });
  }

  private setError(err: SioError): void {
    this.errorMessage.set(err.errorMessage || this.i18n.instant('sio.common.loadError'));
  }
}
