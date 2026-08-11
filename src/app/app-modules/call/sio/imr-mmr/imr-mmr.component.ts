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
import { lucideClipboardList } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CallStore } from '../../call.store';
import { BeneficiaryService } from '../../beneficiary/beneficiary.service';
import { BlockOption, DistrictOption, StateOption, VillageOption } from '../../beneficiary/beneficiary.models';
import { SIO_SELECT_CLASS } from '../shared/sio-ui';
import { SioError } from '../shared/sio-api';
import { ImrMmrService } from './imr-mmr.service';
import { ImrMmrInfoType, ImrMmrRow } from './imr-mmr.models';

/**
 * IMR/MMR (Infant / Maternal Mortality) information service tab. The agent
 * records the informer, the victim (with a cascaded location) and the reason of
 * death, then saves the report; prior reports for the beneficiary are listed
 * below. The guardian field's label switches between mother / father with the
 * reported death type (CDR vs MDSR).
 *
 * Ported (inbound-focused) from the legacy IMR-MMR capture flow. Standalone,
 * OnPush + signals, Reactive Forms, ZardUI + Tailwind only. The legacy support
 * services, stages-of-death, identity-proof and death-confirmation update flow
 * is a separate concern and is intentionally out of scope here.
 */
@Component({
  selector: 'app-sio-imr-mmr',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucideClipboardList })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon name="lucideClipboardList" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-foreground">{{ 'sio.imrMmr.title' | translate: lang() }}</h3>
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
          <div class="sm:col-span-2 lg:col-span-3">
            <span class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.imrMmr.typeOfInformation' | translate: lang() }} <span class="text-destructive">*</span>
            </span>
            <div class="flex flex-wrap gap-4">
              <label class="flex items-center gap-2 text-sm text-foreground">
                <input type="radio" value="CDR" formControlName="typeOfInformation" />
                {{ 'sio.imrMmr.cdr' | translate: lang() }}
              </label>
              <label class="flex items-center gap-2 text-sm text-foreground">
                <input type="radio" value="MDSR" formControlName="typeOfInformation" />
                {{ 'sio.imrMmr.mdsr' | translate: lang() }}
              </label>
            </div>
          </div>

          <div>
            <label for="imr-informer-name" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.imrMmr.informerName' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input
              id="imr-informer-name"
              z-input
              class="w-full"
              type="text"
              maxlength="25"
              formControlName="informerName"
            />
          </div>

          <div>
            <label for="imr-informer-mobile" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.imrMmr.informerMobile' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input
              id="imr-informer-mobile"
              z-input
              class="w-full"
              type="text"
              inputmode="numeric"
              maxlength="10"
              formControlName="informerMobileNumber"
            />
          </div>

          <div class="sm:col-span-2 lg:col-span-1">
            <label for="imr-informer-address" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.imrMmr.informerAddress' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <textarea
              id="imr-informer-address"
              [class]="textareaClass"
              rows="2"
              maxlength="100"
              formControlName="informerAddress"
            ></textarea>
          </div>

          <div>
            <label for="imr-victim-name" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.imrMmr.victimName' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <input
              id="imr-victim-name"
              z-input
              class="w-full"
              type="text"
              maxlength="25"
              formControlName="victimName"
            />
          </div>

          <div>
            <label for="imr-victim-guardian" class="mb-1 block text-xs font-medium text-muted-foreground">
              @if (infoType() === 'CDR') {
                {{ 'sio.imrMmr.motherName' | translate: lang() }}
              } @else {
                {{ 'sio.imrMmr.fatherName' | translate: lang() }}
              }
              <span class="text-destructive">*</span>
            </label>
            <input
              id="imr-victim-guardian"
              z-input
              class="w-full"
              type="text"
              maxlength="25"
              formControlName="victimGuardian"
            />
          </div>

          <div>
            <label for="imr-victim-age" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.age' | translate: lang() }}
            </label>
            <input
              id="imr-victim-age"
              z-input
              class="w-full"
              type="number"
              inputmode="numeric"
              min="1"
              max="120"
              formControlName="victimAge"
            />
          </div>

          <div>
            <label for="imr-state" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.state' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="imr-state" [class]="selectClass" formControlName="stateID" (change)="onStateChange()">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (s of states(); track s.stateID) {
                <option [ngValue]="s.stateID">{{ s.stateName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="imr-district" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.district' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="imr-district" [class]="selectClass" formControlName="districtID" (change)="onDistrictChange()">
              <option [ngValue]="null" disabled>{{ 'sio.common.select' | translate: lang() }}</option>
              @for (d of districts(); track d.districtID) {
                <option [ngValue]="d.districtID">{{ d.districtName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="imr-taluk" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.subDistrict' | translate: lang() }}
            </label>
            <select id="imr-taluk" [class]="selectClass" formControlName="talukID" (change)="onTalukChange()">
              <option [ngValue]="null">{{ 'sio.common.select' | translate: lang() }}</option>
              @for (b of taluks(); track b.blockID) {
                <option [ngValue]="b.blockID">{{ b.blockName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="imr-village" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.village' | translate: lang() }}
            </label>
            <select id="imr-village" [class]="selectClass" formControlName="villageID">
              <option [ngValue]="null">{{ 'sio.common.select' | translate: lang() }}</option>
              @for (v of villages(); track v.districtBranchID) {
                <option [ngValue]="v.districtBranchID">{{ v.villageName }}</option>
              }
            </select>
          </div>

          <div class="sm:col-span-2 lg:col-span-3">
            <label for="imr-victim-address" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.common.address' | translate: lang() }}
            </label>
            <textarea
              id="imr-victim-address"
              [class]="textareaClass"
              rows="2"
              maxlength="500"
              formControlName="victimAddress"
            ></textarea>
          </div>

          <div class="sm:col-span-2 lg:col-span-3">
            <label for="imr-reason" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'sio.imrMmr.reasonOfDeath' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <textarea
              id="imr-reason"
              [class]="textareaClass"
              rows="2"
              maxlength="100"
              formControlName="reasonOfDeath"
            ></textarea>
          </div>
        </form>

        <div class="mt-4">
          <button
            z-button
            type="button"
            zType="default"
            [zLoading]="saving()"
            [zDisabled]="form.invalid || saving()"
            (click)="save()"
          >
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
                    <th class="px-3 py-2 font-medium">{{ 'sio.imrMmr.deathId' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.imrMmr.victim' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.common.age' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.common.district' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.imrMmr.informer' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.imrMmr.informerMobile' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.imrMmr.referenceDate' | translate: lang() }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of history(); track $index) {
                    <tr class="border-t border-border align-top">
                      <td class="px-3 py-2">{{ row.requestID ?? '—' }}</td>
                      <td class="px-3 py-2">{{ row.victimName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.victimAge ?? '—' }}</td>
                      <td class="px-3 py-2">{{ row.victimDistrictName?.districtName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.informerName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.informerMobileNumber ?? '—' }}</td>
                      <td class="px-3 py-2">{{ row.referenceDate || '—' }}</td>
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
export class ImrMmrComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly imrMmr = inject(ImrMmrService);
  private readonly beneficiary = inject(BeneficiaryService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted after a report is saved (marks the call service-availed). */
  readonly serviceProvided = output<void>();

  readonly lang = this.i18n.language;
  readonly selectClass = SIO_SELECT_CLASS;
  readonly textareaClass = SIO_SELECT_CLASS + ' min-h-[3.5rem]';

  readonly states = signal<StateOption[]>([]);
  readonly districts = signal<DistrictOption[]>([]);
  readonly taluks = signal<BlockOption[]>([]);
  readonly villages = signal<VillageOption[]>([]);
  readonly history = signal<ImrMmrRow[]>([]);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  /** Drives the mother/father guardian label; kept in sync with the radio group. */
  readonly infoType = signal<ImrMmrInfoType>('CDR');

  readonly form = this.fb.group({
    typeOfInformation: this.fb.control<ImrMmrInfoType>('CDR', Validators.required),
    informerName: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(25),
    ]),
    informerMobileNumber: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.pattern(/^[0-9]{10}$/),
    ]),
    informerAddress: this.fb.control<string | null>(null, [Validators.required, Validators.maxLength(100)]),
    victimName: this.fb.control<string | null>(null, [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(25),
    ]),
    victimGuardian: this.fb.control<string | null>(null, [Validators.required, Validators.maxLength(25)]),
    victimAge: this.fb.control<number | null>(null, [Validators.min(1), Validators.max(120)]),
    stateID: this.fb.control<number | null>(null, Validators.required),
    districtID: this.fb.control<number | null>(null, Validators.required),
    talukID: this.fb.control<number | null>(null),
    villageID: this.fb.control<number | null>(null),
    victimAddress: this.fb.control<string | null>(null, Validators.maxLength(500)),
    reasonOfDeath: this.fb.control<string | null>(null, [Validators.required, Validators.maxLength(100)]),
  });

  readonly hasContext = computed(() => this.callStore.beneficiaryId() !== null);

  ngOnInit(): void {
    if (!this.hasContext()) {
      return;
    }
    const role = this.authStore.currentRole();

    this.form.controls.typeOfInformation.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) => this.infoType.set(type ?? 'CDR'));

    this.beneficiary
      .getProviderStates(role?.serviceProviderID ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (states) => this.states.set(states),
        error: (err: SioError) => this.setError(err),
      });

    this.loadHistory();
  }

  onStateChange(): void {
    this.form.patchValue({ districtID: null, talukID: null, villageID: null });
    this.districts.set([]);
    this.taluks.set([]);
    this.villages.set([]);
    const stateID = this.form.controls.stateID.value;
    if (stateID == null) {
      return;
    }
    this.beneficiary
      .getDistricts(stateID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d) => this.districts.set(d), error: (e: SioError) => this.setError(e) });
  }

  onDistrictChange(): void {
    this.form.patchValue({ talukID: null, villageID: null });
    this.taluks.set([]);
    this.villages.set([]);
    const districtID = this.form.controls.districtID.value;
    if (districtID == null) {
      return;
    }
    this.beneficiary
      .getSubDistricts(districtID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (t) => this.taluks.set(t), error: (e: SioError) => this.setError(e) });
  }

  onTalukChange(): void {
    this.form.patchValue({ villageID: null });
    this.villages.set([]);
    const talukID = this.form.controls.talukID.value;
    if (talukID == null) {
      return;
    }
    this.beneficiary
      .getVillages(talukID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (v) => this.villages.set(v), error: (e: SioError) => this.setError(e) });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set('');
    const userName = this.authStore.user()?.userName ?? '';
    this.imrMmr
      .save({
        victimName: v.victimName ?? '',
        victimAge: v.victimAge ?? null,
        victimDistrict: v.districtID,
        victimTaluk: v.talukID ?? null,
        victimVillage: v.villageID ?? null,
        victimAddress: v.victimAddress?.trim() || null,
        victimGuardian: v.victimGuardian ?? '',
        referenceDate: new Date().toISOString(),
        reasonOfDeath: v.reasonOfDeath ?? '',
        informerName: v.informerName ?? '',
        informerMobileNumber: Number(v.informerMobileNumber),
        informerAddress: v.informerAddress?.trim() ?? '',
        typeOfInfromation: v.typeOfInformation ?? 'CDR',
        createdBy: userName,
        modifiedBy: userName,
        providerServiceMapID: this.authStore.currentRole()?.providerServiceMapID ?? null,
        beneficiaryRegID: this.callStore.beneficiaryId(),
        benCallID: this.callStore.callId(),
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
    this.form.reset({ typeOfInformation: 'CDR' });
    this.infoType.set('CDR');
    this.districts.set([]);
    this.taluks.set([]);
    this.villages.set([]);
  }

  private loadHistory(): void {
    this.imrMmr
      .getHistory(this.callStore.beneficiaryId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (rows) => this.history.set(rows), error: () => this.history.set([]) });
  }

  private setError(err: SioError): void {
    this.errorMessage.set(err.errorMessage || this.i18n.instant('sio.common.loadError'));
  }
}
