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

import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../../../core/auth/auth.store';
import { CzentrixService } from '../../../core/services/czentrix.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { BeneficiaryService } from '../../beneficiary/beneficiary.service';
import { Community, Education } from '../../beneficiary/beneficiary.models';
import { CallStore } from '../../call.store';
import { CallWrapupService } from '../../call-wrapup.service';
import { OutboundStore } from '../../../outbound/outbound.store';
import { ScheduleAppointmentComponent } from '../../schedule-appointment/schedule-appointment.component';
import {
  AvailableService,
  CallSubType,
  CallType,
  CampaignSkill,
  CloseCallRequest,
  InstituteName,
  InstituteType,
  TransferCampaign,
} from '../hao.models';
import { HaoService } from '../hao.service';

const ROLE_HAO = 'HAO';
const ROLE_MO = 'MO';
const ROLE_CO = 'CO';
const ROLE_RO = 'RO';

const HEALTH_ADVISORY_SERVICE_NAME = 'Health Advisory Service';

type TransferRole = 'hao' | 'co' | 'mo';

function roleForService(serviceName: string): TransferRole | null {
  const name = serviceName.toLowerCase();
  if (name.includes('health advisory')) {
    return 'hao';
  }
  if (name.includes('counselling')) {
    return 'co';
  }
  if (name.includes('medical')) {
    return 'mo';
  }
  return null;
}

function getCampaignName(campaigns: TransferCampaign[], role: TransferRole): string | undefined {
  return campaigns.find((c) => c.campaignName.toLowerCase().includes(role))?.campaignName;
}

const CONFIGURE_CAMPAIGN_ERROR_KEYS = {
  hao: 'hao.closure.configureHaoCampaign',
  co: 'hao.closure.configureCoCampaign',
  mo: 'hao.closure.configureMoCampaign',
} as const;

/**
 * "Closure" step of the HAO workspace (legacy carousel slide 1 — `<app-closure>`).
 *
 * Captures the call disposition: emergency/suicidal flags, the mandatory Call
 * Type / Call Sub-Type, optional follow-up, optional transfer (campaign + skill),
 * and remarks. Offers three actions mirroring the legacy closure:
 *  - **Submit & Close** — record disposition, then {@link closed} so the
 *    workspace ends the call and returns to the dashboard.
 *  - **Submit & Continue** — record disposition, then {@link continued} so the
 *    workspace resets to the service step for the same caller (inbound only).
 *  - **Transfer Call** — hand the live call to another campaign, then
 *    {@link transferred}.
 *
 * Conditional fields are driven by signals (mirrored from the reactive form) so
 * they update under the app's zoneless change detection.
 */
@Component({
  selector: 'app-hao-closure-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, TranslatePipe, ZardButtonComponent, ZardInputDirective, ScheduleAppointmentComponent],
  template: `
    <form class="flex flex-col gap-5" [formGroup]="form" novalidate>
      @if (disconnectedByCaller()) {
        <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {{ 'hao.closure.callerDisconnectedNotice' | translate: lang() }}
        </p>
      }

      @if (currentRole() === roleRO) {
        <fieldset class="flex flex-wrap gap-6">
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" class="h-4 w-4 accent-primary" formControlName="isEmergency" />
            {{ 'hao.closure.emergency' | translate: lang() }}
          </label>
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" class="h-4 w-4 accent-primary" formControlName="isSuicidal" />
            {{ 'hao.closure.suicidal' | translate: lang() }}
          </label>
        </fieldset>
      }

      <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium" for="hao-cl-type">
            {{ 'hao.closure.callType' | translate: lang() }}
            <span class="text-destructive" aria-hidden="true">*</span>
          </label>
          <select
            id="hao-cl-type"
            formControlName="callGroupType"
            [disabled]="disableCallType()"
            class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            [attr.aria-invalid]="isInvalid('callGroupType') || null"
          >
            <option [ngValue]="null">
              {{ 'hao.closure.selectCallType' | translate: lang() }}
            </option>
            @for (type of visibleCallTypes(); track type.callGroupType) {
              <option [ngValue]="type.callGroupType">{{ type.callGroupType }}</option>
            }
          </select>
          @if (isInvalid('callGroupType')) {
            <p class="text-xs font-medium text-destructive" role="alert">
              {{ 'hao.closure.callTypeRequired' | translate: lang() }}
            </p>
          }
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium" for="hao-cl-subtype">
            {{ 'hao.closure.callSubType' | translate: lang() }}
            @if (subTypes().length > 0) {
              <span class="text-destructive" aria-hidden="true">*</span>
            }
          </label>
          <select
            id="hao-cl-subtype"
            formControlName="callSubTypeID"
            class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            [attr.aria-invalid]="isInvalid('callSubTypeID') || null"
          >
            <option [ngValue]="null">
              {{ 'hao.closure.selectCallSubType' | translate: lang() }}
            </option>
            @for (sub of subTypes(); track sub.callTypeID) {
              <option [ngValue]="sub.callTypeID">{{ sub.callTypeDesc }}</option>
            }
          </select>
          @if (isInvalid('callSubTypeID')) {
            <p class="text-xs font-medium text-destructive" role="alert">
              {{ 'hao.closure.callSubTypeRequired' | translate: lang() }}
            </p>
          }
        </div>

        @if (canTransfer()) {
          <div class="flex flex-col gap-1.5" [class.cursor-not-allowed]="disconnectedByCaller()">
            <label class="text-sm font-medium" for="hao-cl-transfer-service">
              {{ 'hao.closure.transferService' | translate: lang() }}
            </label>
            <select
              id="hao-cl-transfer-service"
              formControlName="transferService"
              class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <option [ngValue]="null">
                {{ 'hao.closure.selectTransferService' | translate: lang() }}
              </option>
              @for (service of transferServices(); track service.subServiceName) {
                <option [ngValue]="service.subServiceName">{{ service.subServiceName }}</option>
              }
            </select>
          </div>
        }

        @if (canTransfer() && currentRole() !== roleCO && skills().length > 0) {
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" for="hao-cl-skill">
              {{ 'hao.closure.transferSkill' | translate: lang() }}
            </label>
            <select
              id="hao-cl-skill"
              formControlName="skill"
              class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <option [ngValue]="null">
                {{ 'hao.closure.selectSkill' | translate: lang() }}
              </option>
              @for (skill of skills(); track skill.skillName) {
                <option [ngValue]="skill.skillName">{{ skill.skillName }}</option>
              }
            </select>
          </div>
        }
      </div>

      @if (showFeedbackRequired()) {
        <label class="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" class="h-4 w-4 accent-primary" formControlName="isFeedback" />
          {{ 'hao.closure.ivrFeedbackRequired' | translate: lang() }}
        </label>
      }

      <div class="flex flex-col gap-3">
        <label class="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" class="h-4 w-4 accent-primary" formControlName="isFollowupRequired" />
          {{ 'hao.closure.followUpRequired' | translate: lang() }}
        </label>
        @if (followUpRequired()) {
          <div class="flex flex-col gap-1.5 sm:max-w-xs">
            <label class="text-sm font-medium" for="hao-cl-followup">
              {{ 'hao.closure.followUpDate' | translate: lang() }}
              <span class="text-destructive" aria-hidden="true">*</span>
            </label>
            <input
              z-input
              id="hao-cl-followup"
              type="date"
              formControlName="followUpDate"
              [min]="today"
              [attr.aria-invalid]="isInvalid('followUpDate') || null"
            />
            @if (isInvalid('followUpDate')) {
              <p class="text-xs font-medium text-destructive" role="alert">
                {{ 'hao.closure.followUpDateRequired' | translate: lang() }}
              </p>
            }
          </div>
        }
      </div>

      <div class="grid gap-5 sm:grid-cols-2">
        @if (currentRole() !== roleRO && hasBeneficiary()) {
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" for="hao-cl-caste">
              {{ 'hao.closure.caste' | translate: lang() }}
            </label>
            <select
              id="hao-cl-caste"
              formControlName="caste"
              class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option [ngValue]="null">
                {{ 'hao.closure.selectCaste' | translate: lang() }}
              </option>
              @for (community of communities(); track community.communityID) {
                <option [ngValue]="community.communityID">{{ community.communityType }}</option>
              }
            </select>
          </div>
        }

        @if (currentRole() === roleCO && hasBeneficiary()) {
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" for="hao-cl-education">
              {{ 'hao.closure.education' | translate: lang() }}
            </label>
            <select
              id="hao-cl-education"
              formControlName="education"
              class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option [ngValue]="null">
                {{ 'hao.closure.selectEducation' | translate: lang() }}
              </option>
              @for (educ of educations(); track educ.educationID) {
                <option [ngValue]="educ.educationID">{{ educ.educationType }}</option>
              }
            </select>
          </div>
        }
      </div>

      @if (currentRole() === roleCO) {
        <div class="grid gap-5 sm:grid-cols-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" for="hao-cl-external-referral">
              {{ 'hao.closure.externalReferral' | translate: lang() }}
            </label>
            <select
              id="hao-cl-external-referral"
              formControlName="externalRefferal"
              class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option [ngValue]="null">
                {{ 'hao.closure.selectExternalReferral' | translate: lang() }}
              </option>
              <option [ngValue]="'Yes'">{{ 'hao.closure.yes' | translate: lang() }}</option>
              <option [ngValue]="'No'">{{ 'hao.closure.no' | translate: lang() }}</option>
            </select>
          </div>

          @if (enableInstitute()) {
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium" for="hao-cl-institute-type">
                {{ 'hao.closure.instituteType' | translate: lang() }}
              </label>
              <select
                id="hao-cl-institute-type"
                formControlName="institutionID"
                class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option [ngValue]="null">
                  {{ 'hao.closure.selectInstituteType' | translate: lang() }}
                </option>
                @for (type of instituteTypes(); track type.institutionTypeID) {
                  <option [ngValue]="type.institutionTypeID">{{ type.institutionType }}</option>
                }
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium" for="hao-cl-institute-name">
                {{ 'hao.closure.instituteName' | translate: lang() }}
              </label>
              <select
                id="hao-cl-institute-name"
                formControlName="instituteName"
                multiple
                class="h-24 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                @for (name of instituteNames(); track name.institutionName) {
                  <option [ngValue]="name.institutionName">{{ name.institutionName }}</option>
                }
              </select>
            </div>
          }
        </div>
      }

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium" for="hao-cl-remarks">
          {{ 'hao.closure.remarks' | translate: lang() }}
        </label>
        <input z-input id="hao-cl-remarks" type="text" maxlength="100" formControlName="remarks" />
      </div>

      @if (currentRole() === roleCO) {
        <div class="grid gap-5 sm:grid-cols-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium" for="hao-cl-external-referral">
              {{ 'hao.closure.externalReferral' | translate: lang() }}
            </label>
            <select
              id="hao-cl-external-referral"
              formControlName="externalRefferal"
              class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option [ngValue]="null">
                {{ 'hao.closure.selectExternalReferral' | translate: lang() }}
              </option>
              <option [ngValue]="'Yes'">{{ 'hao.closure.yes' | translate: lang() }}</option>
              <option [ngValue]="'No'">{{ 'hao.closure.no' | translate: lang() }}</option>
            </select>
          </div>

          @if (enableInstitute()) {
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium" for="hao-cl-institute-type">
                {{ 'hao.closure.instituteType' | translate: lang() }}
              </label>
              <select
                id="hao-cl-institute-type"
                formControlName="institutionID"
                class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option [ngValue]="null">
                  {{ 'hao.closure.selectInstituteType' | translate: lang() }}
                </option>
                @for (type of instituteTypes(); track type.institutionTypeID) {
                  <option [ngValue]="type.institutionTypeID">{{ type.institutionType }}</option>
                }
              </select>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium" for="hao-cl-institute-name">
                {{ 'hao.closure.instituteName' | translate: lang() }}
              </label>
              <select
                id="hao-cl-institute-name"
                formControlName="instituteName"
                multiple
                class="h-24 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                @for (name of instituteNames(); track name.institutionName) {
                  <option [ngValue]="name.institutionName">{{ name.institutionName }}</option>
                }
              </select>
            </div>
          }
        </div>
      }

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium" for="hao-cl-remarks">
          {{ 'hao.closure.remarks' | translate: lang() }}
        </label>
        <input z-input id="hao-cl-remarks" type="text" maxlength="100" formControlName="remarks" />
      </div>

      @if (showAppointment()) {
        <app-schedule-appointment (saved)="onAppointmentSaved()" (cancelled)="onAppointmentCancelled()" />
      }

      <div class="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        <button z-button type="button" zType="outline" [zDisabled]="actionBusy()" (click)="openAppointmentManually()">
          {{ 'hao.closure.scheduleAppointment' | translate: lang() }}
        </button>
        @if (canTransfer()) {
          <button
            z-button
            type="button"
            zType="outline"
            class="border-success bg-success text-success-foreground hover:bg-success/90"
            [zLoading]="transferring()"
            [zDisabled]="actionBusy() || !selectedCampaign() || disconnectedByCaller()"
            (click)="transfer()"
          >
            {{ 'hao.closure.transfer' | translate: lang() }}
          </button>
        }
        <button
          z-button
          type="button"
          zType="outline"
          class="border-success bg-success text-success-foreground hover:bg-success/90"
          [zLoading]="submitting()"
          [zDisabled]="actionBusy() || doTransfer() || nuisanceBlock()"
          (click)="submit(true)"
        >
          {{ 'hao.closure.submitContinue' | translate: lang() }}
        </button>
        <button
          z-button
          type="button"
          zType="outline"
          class="border-success bg-success text-success-foreground hover:bg-success/90"
          [zLoading]="submitting()"
          [zDisabled]="actionBusy() || doTransfer()"
          (click)="submit(false)"
        >
          {{ 'hao.closure.submitClose' | translate: lang() }}
        </button>
      </div>
    </form>
  `,
})
export class ClosureStepComponent {
  private readonly fb = inject(FormBuilder);
  private readonly haoService = inject(HaoService);
  private readonly beneficiaryService = inject(BeneficiaryService);
  private readonly authStore = inject(AuthStore);
  private readonly czentrix = inject(CzentrixService);
  private readonly callStore = inject(CallStore);
  private readonly callWrapup = inject(CallWrapupService);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly outboundStore = inject(OutboundStore);

  readonly lang = this.i18n.language;
  readonly roleRO = ROLE_RO;
  readonly roleCO = ROLE_CO;

  /** True once the caller has hung up — Transfer is disabled, there is no live call left to hand off. */
  readonly disconnectedByCaller = this.callWrapup.disconnectedByCaller;

  /** Whether any service was saved during the call (marks the call valid). */
  readonly serviceAvailed = input(false);

  /** Disposition recorded and the call should end (Submit & Close). */
  readonly closed = output<void>();
  /** Disposition recorded and a new service round should start (Submit & Continue). */
  readonly continued = output<void>();
  /** Live call handed to another campaign (Transfer Call). */
  readonly transferred = output<void>();

  /** Lowest selectable follow-up date — today, in ISO `yyyy-MM-dd`. */
  readonly today = new Date().toISOString().slice(0, 10);

  readonly currentRole = computed(() => this.authStore.currentRole()?.featureCode ?? null);
  readonly hasBeneficiary = computed(() => this.callStore.beneficiaryId() !== null);

  readonly callTypes = signal<CallType[]>([]);
  readonly campaigns = signal<TransferCampaign[]>([]);
  readonly services = signal<AvailableService[]>([]);
  readonly skills = signal<CampaignSkill[]>([]);
  readonly communities = signal<Community[]>([]);
  readonly educations = signal<Education[]>([]);
  readonly instituteTypes = signal<InstituteType[]>([]);
  readonly instituteNames = signal<InstituteName[]>([]);
  readonly submitting = signal(false);
  readonly transferring = signal(false);

  /** Agent IP, resolved once on init (legacy caches it the same way on `saved_data.ipAddress`); null until resolved/on failure. */
  readonly agentIPAddress = signal<string | null>(null);

  /** Whether the schedule-appointment form is shown (legacy referral flow). */
  readonly showAppointment = signal(false);
  private readonly referralAppointment = signal(false);
  readonly disableCallType = signal(false);
  /** A confirmation dialog is open for a terminal action (close/continue/transfer). */
  readonly confirming = signal(false);

  /**
   * True while any terminal action is mid-flight — a confirmation is open or a
   * close/continue/transfer request is in progress. All terminal buttons gate
   * on this so the agent cannot issue duplicate dispositions, or close and
   * transfer the same live call concurrently.
   */
  readonly actionBusy = computed(() => this.submitting() || this.transferring() || this.confirming());

  // Form values mirrored to signals so conditional UI updates under zoneless CD.
  private readonly selectedCallGroup = signal<string | null>(null);
  readonly followUpRequired = signal(false);
  readonly selectedCampaign = signal<string | null>(null);
  private readonly selectedTransferService = signal<string | null>(null);
  readonly enableInstitute = signal(false);

  readonly form = this.fb.nonNullable.group({
    isEmergency: [false],
    isSuicidal: [false],
    // Top-level call type = the group name (callGroupType); sub-type = the
    // chosen nested sub-type's numeric callTypeID.
    callGroupType: this.fb.control<string | null>(null, Validators.required),
    callSubTypeID: this.fb.control<number | null>(null),
    isFeedback: [false],
    isFollowupRequired: [false],
    followUpDate: this.fb.control<string | null>(null),
    caste: this.fb.control<number | null>(null),
    education: this.fb.control<number | null>(null),
    externalRefferal: this.fb.control<'Yes' | 'No' | null>(null),
    institutionID: this.fb.control<number | null>(null),
    instituteName: this.fb.nonNullable.control<string[]>([]),
    transferService: this.fb.control<string | null>(null),
    skill: this.fb.control<string | null>(null),
    remarks: this.fb.control<string | null>(null),
  });

  readonly visibleCallTypes = computed<CallType[]>(() => {
    const role = this.currentRole();
    const groups = this.callTypes();
    if (role === ROLE_HAO || role === ROLE_MO) {
      return groups;
    }
    return groups.filter((g) => g.callGroupType.toLowerCase() !== 'referral');
  });

  /**
   * Sub-types of the currently selected call-type group — the group's nested
   * `callTypes` from the `getCallTypesV1` response (derived client-side; there
   * is no separate sub-type endpoint).
   */
  readonly subTypes = computed<CallSubType[]>(() => {
    const group = this.selectedCallGroup();
    return this.visibleCallTypes().find((t) => t.callGroupType === group)?.callTypes ?? [];
  });

  /**
   * Whether a transfer target is currently chosen — legacy's Transfer Call
   * select and action button are always visible (see {@link canTransfer}),
   * not behind a checkbox; "transferring" is simply "a service is selected".
   */
  readonly doTransfer = computed(() => this.selectedTransferService() !== null);

  /** Whether there is anything to transfer to at all (legacy `validTrans`). */
  readonly canTransfer = computed(() => this.transferServices().length > 0);

  readonly transferServices = computed<AvailableService[]>(() => {
    const list = this.services();
    if (this.currentRole() === ROLE_RO && !this.hasBeneficiary()) {
      return list.filter((s) => s.subServiceName === HEALTH_ADVISORY_SERVICE_NAME);
    }
    return list;
  });

  readonly nuisanceBlock = computed(() => {
    const group = this.selectedCallGroup()?.toLowerCase() ?? null;
    return group !== null && group !== 'valid' && group !== 'transfer' && group !== 'referral';
  });

  /** IVR feedback is only offered for the "Valid" call-type group (legacy `showFeedbackRequiredFlag`). */
  readonly showFeedbackRequired = computed(() => this.selectedCallGroup() === 'Valid');

  constructor() {
    this.loadCallTypes();
    this.loadMasterData();
    this.resolveAgentIPAddress();
    // Legacy's Transfer Call select is populated and visible immediately,
    // not revealed behind a checkbox — load its data eagerly.
    this.loadCampaigns();
    this.loadServices();

    // The caller hung up — there is no live call left to transfer.
    // getRawValue() still includes a disabled control's value.
    effect(() => {
      if (this.disconnectedByCaller()) {
        this.form.controls.transferService.setValue(null);
        this.form.controls.transferService.disable();
      }
    });

    const c = this.form.controls;

    c.callGroupType.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.selectedCallGroup.set(value);
      // A new call-type group invalidates any previously chosen sub-type, and
      // the sub-type is mandatory only when the new group actually has any.
      c.callSubTypeID.reset(null);
      const hasSubTypes = this.subTypes().length > 0;
      c.callSubTypeID.setValidators(hasSubTypes ? [Validators.required] : []);
      c.callSubTypeID.updateValueAndValidity();
      // IVR feedback is only meaningful for "Valid" (legacy resets the flag the
      // moment the group changes away from it).
      if (value !== 'Valid') {
        c.isFeedback.setValue(false);
      }
      if (value?.toLowerCase() === 'referral') {
        if (this.hasBeneficiary()) {
          this.showAppointment.set(true);
          this.referralAppointment.set(true);
        } else {
          this.showError('hao.closure.referralNeedsBeneficiary');
          c.callGroupType.setValue('Valid');
        }
      }
    });

    // An emergency call (flagged during registration, broadcast via CallStore)
    // is always disposed as "Valid" — mirrors legacy closure's handleEmergency,
    // which forces callType = "Valid" on the same signal. Locked rather than
    // just pre-filled so the mandatory disposition can't be changed away from
    // Valid for a call already marked emergency.
    effect(() => this.applyEmergencyCallType(this.callStore.isEmergencyCall()));

    c.isFollowupRequired.valueChanges.pipe(takeUntilDestroyed()).subscribe((required) => {
      this.followUpRequired.set(required);
      c.followUpDate.setValidators(required ? [Validators.required] : []);
      if (!required) {
        c.followUpDate.reset(null);
      }
      c.followUpDate.updateValueAndValidity();
    });

    c.externalRefferal.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const enabled = value === 'Yes';
      this.enableInstitute.set(enabled);
      if (!enabled) {
        c.institutionID.reset(null);
        c.instituteName.reset([]);
        this.instituteNames.set([]);
      }
    });

    c.institutionID.valueChanges.pipe(takeUntilDestroyed()).subscribe((institutionTypeID) => {
      c.instituteName.reset([]);
      this.instituteNames.set([]);
      if (institutionTypeID !== null) {
        this.loadInstituteNames(institutionTypeID);
      }
    });

    c.transferService.valueChanges.pipe(takeUntilDestroyed()).subscribe((serviceName) => {
      this.selectedTransferService.set(serviceName);
      c.skill.reset(null);
      this.skills.set([]);
      this.selectedCampaign.set(null);
      if (!serviceName) {
        return;
      }
      const role = roleForService(serviceName);
      const campaignName = role ? getCampaignName(this.campaigns(), role) : undefined;
      if (!campaignName) {
        this.showError(role ? CONFIGURE_CAMPAIGN_ERROR_KEYS[role] : 'hao.closure.configureCampaignGeneric');
        c.transferService.setValue(null);
        return;
      }
      this.selectedCampaign.set(campaignName);
      this.loadSkills(campaignName);
    });
  }

  /** True when a control is invalid and has been touched/dirtied. */
  isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || control.dirty);
  }

  /**
   * Validate and record the disposition. `andContinue` chooses between the
   * Submit & Continue (reset to the service step) and Submit & Close (end the
   * call) outcomes — both first confirm with the agent.
   */
  submit(andContinue: boolean): void {
    // Block while any terminal action is open/in-flight so a second click can't
    // open another confirmation or fire a duplicate disposition.
    if (this.actionBusy()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const benCallID = this.callStore.callId() ?? this.callStore.sessionId();
    if (!benCallID) {
      this.showError('hao.closure.noCallError');
      return;
    }

    const value = this.form.getRawValue();
    // The mandatory call disposition (callType group + numeric callTypeID +
    // fitToBlock) is derived entirely from the chosen sub-type object. If none
    // resolves — a group with no sub-types, or none picked — there is no valid
    // callTypeID to send, so force the sub-type requirement and stop rather than
    // shipping a null id. (Groups carry sub-types in practice; this guards the
    // contract's `callTypes: []` possibility.)
    const subType = this.subTypes().find((s) => s.callTypeID === value.callSubTypeID);
    if (!subType) {
      this.form.controls.callSubTypeID.setValidators([Validators.required]);
      this.form.controls.callSubTypeID.updateValueAndValidity();
      this.form.markAllAsTouched();
      return;
    }

    // followUpDate is already a validated YYYY-MM-DD string (native date
    // input); append a literal midnight-Z suffix rather than round-tripping
    // through a Date object, matching the dOB field's format.
    const prefferedDateTime: string | null =
      value.isFollowupRequired && value.followUpDate ? `${value.followUpDate}T00:00:00.000Z` : null;

    const request: CloseCallRequest = {
      benCallID,
      // Legacy mapping: callID carries the CTI session id; benCallID the AMRIT
      // call id (which falls back to the session id until it is resolved).
      callID: this.callStore.sessionId(),
      beneficiaryRegID: this.callStore.beneficiaryId(),
      callType: subType.callGroupType,
      callTypeID: subType.callTypeID,
      fitToBlock: subType.fitToBlock,
      isFollowupRequired: value.isFollowupRequired,
      prefferedDateTime,
      requestedFor: value.remarks?.trim() || null,
      isEmergency: value.isEmergency,
      isSuicidal: value.isSuicidal,
      isFeedback: value.isFeedback,
      providerServiceMapID: this.authStore.currentRole()?.serviceID ?? null,
      agentID: this.authStore.user()?.agentID ?? null,
      endCall: !andContinue,
      IsOutbound: this.outboundStore.hasSelection(),
      createdBy: this.authStore.user()?.userName ?? '',
      externalRefferal: value.externalRefferal,
      instTypeId: value.institutionID,
      instNames: value.instituteName.length > 0 ? value.instituteName : null,
      callEndUserID: this.authStore.user()?.userID ?? null,
      agentIPAddress: this.agentIPAddress(),
    };

    const confirmKey = andContinue ? 'hao.closure.confirmContinue' : 'hao.closure.confirmClose';

    this.confirming.set(true);
    this.confirmDialog
      .confirm({
        title: this.i18n.instant('hao.closure.confirmTitle'),
        message: this.i18n.instant(confirmKey),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
        status: 'info',
      })
      .subscribe((confirmed) => {
        this.confirming.set(false);
        if (confirmed) {
          this.recordDisposition(request, andContinue, value.caste, value.education);
        }
      });
  }

  private recordDisposition(
    request: CloseCallRequest,
    andContinue: boolean,
    caste: number | null,
    education: number | null,
  ): void {
    this.submitting.set(true);
    this.updateCasteAndEducation(request.beneficiaryRegID ?? null, caste, education);
    this.haoService.closeCall(request).subscribe({
      next: () => {
        this.submitting.set(false);
        if (andContinue) {
          this.form.reset({ isEmergency: false, isSuicidal: false });
          // form.reset() clears callGroupType (and re-enables it) regardless of
          // the disabled-lock applied below — reapply for the same still-live,
          // still-emergency call.
          this.applyEmergencyCallType(this.callStore.isEmergencyCall());
          this.continued.emit();
        } else {
          this.confirmDialog
            .alert({
              title: this.i18n.instant('dashboard.dialog.success'),
              message: this.i18n.instant('hao.closure.closedSuccess'),
              okText: this.i18n.instant('dashboard.dialog.ok'),
              status: 'success',
            })
            .subscribe();
          this.closed.emit();
        }
      },
      error: () => {
        this.submitting.set(false);
        this.showError('hao.closure.closeError');
      },
    });
  }

  private updateCasteAndEducation(beneficiaryRegID: number | null, caste: number | null, education: number | null): void {
    if (this.currentRole() === ROLE_RO || beneficiaryRegID === null) {
      return;
    }
    this.beneficiaryService
      .updateCommunityOrEducation(beneficiaryRegID, caste, this.currentRole() === ROLE_CO ? education : null)
      .subscribe({ error: () => this.showError('hao.closure.updateCasteError') });
  }

  openAppointmentManually(): void {
    this.referralAppointment.set(false);
    this.showAppointment.set(true);
  }

  onAppointmentSaved(): void {
    this.showAppointment.set(false);
    if (this.referralAppointment()) {
      this.disableCallType.set(true);
    }
    this.referralAppointment.set(false);
  }

  onAppointmentCancelled(): void {
    this.showAppointment.set(false);
    if (this.referralAppointment()) {
      this.form.controls.callGroupType.setValue('Valid');
    }
    this.referralAppointment.set(false);
  }

  transfer(): void {
    const campaign = this.selectedCampaign();
    const agentID = this.authStore.user()?.agentID ?? null;
    const benCallID = this.callStore.callId() ?? this.callStore.sessionId();
    // Block while any terminal action is open/in-flight so a transfer cannot run
    // concurrently with (or duplicate) a close/continue on the same live call.
    if (!campaign || agentID === null || !benCallID || this.actionBusy()) {
      return;
    }

    // Transfer sends callType/callTypeID from the same mandatory Call Type /
    // Call Sub-Type selection submit() uses (legacy transferCallToCampaign
    // reads them off the same closure form values as closeCall).
    const subType = this.subTypes().find((s) => s.callTypeID === this.form.getRawValue().callSubTypeID);
    if (!subType) {
      this.form.controls.callSubTypeID.setValidators([Validators.required]);
      this.form.controls.callSubTypeID.updateValueAndValidity();
      this.form.markAllAsTouched();
      return;
    }

    const skill = this.form.controls.skill.value;
    // Transferring hands off the live call — confirm first, like close/continue.
    this.confirming.set(true);
    this.confirmDialog
      .confirm({
        title: this.i18n.instant('hao.closure.confirmTitle'),
        message: this.i18n.instant('hao.closure.confirmTransfer'),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
        status: 'info',
      })
      .subscribe((confirmed) => {
        this.confirming.set(false);
        if (!confirmed) {
          return;
        }
        this.transferring.set(true);
        this.haoService
          .transferCall({
            transferFrom: agentID,
            transferCampaignInfo: campaign,
            skillTransferFlag: !!skill,
            skill,
            agentIPAddress: this.agentIPAddress(),
            benCallID,
            callType: subType.callGroupType,
            callTypeID: subType.callTypeID,
          })
          .subscribe({
            next: () => {
              this.transferring.set(false);
              this.confirmDialog
                .alert({
                  title: this.i18n.instant('dashboard.dialog.success'),
                  message: `${this.i18n.instant('hao.closure.transferredToPrefix')} ${campaign}`,
                  okText: this.i18n.instant('dashboard.dialog.ok'),
                  status: 'success',
                })
                .subscribe();
              this.transferred.emit();
            },
            error: () => {
              this.transferring.set(false);
              this.showError('hao.closure.transferError');
            },
          });
      });
  }

  /**
   * Force-select and lock `callGroupType` to "Valid" while the call is
   * flagged emergency; release the lock otherwise. Re-callable (not just
   * effect-driven) because `form.reset()` on Submit & Continue clears and
   * re-enables the control outside the signal change that would otherwise
   * trigger this.
   */
  private applyEmergencyCallType(isEmergency: boolean): void {
    const control = this.form.controls.callGroupType;
    if (isEmergency) {
      if (control.value !== 'Valid') {
        control.setValue('Valid');
      }
      control.disable();
    } else {
      control.enable();
    }
  }

  /**
   * Resolve the agent's CTI IP once, up front (legacy resolves and caches
   * `saved_data.ipAddress` on load rather than per-action). Best-effort: close
   * and transfer both send whatever is available — `null` if this hasn't
   * resolved yet or the lookup failed — rather than blocking submission on it.
   */
  private resolveAgentIPAddress(): void {
    const agentID = this.authStore.user()?.agentID ?? null;
    if (agentID === null) {
      return;
    }
    this.czentrix.getAgentIPAddress(agentID).subscribe({
      next: (ip) => this.agentIPAddress.set(ip),
      error: () => this.agentIPAddress.set(null),
    });
  }

  private loadCallTypes(): void {
    // The backend keys call types off the role's providerServiceMapID (every
    // other catalogue lookup in this module sources it the same way) plus the
    // campaign flag. The HAO workspace is the inbound service flow, so
    // request inbound call types.
    //
    // This used to send `currentRole()?.serviceID` instead — verified live
    // that this returns only a single sparse "Wrapup Exceeds" group, while
    // `providerServiceMapID` returns the full legacy set (Valid/Transfer/
    // Incomplete/Wrapup Exceeds, each with their real sub-types) — `serviceID`
    // and `providerServiceMapID` are genuinely different ids on the role
    // object, and only one of them actually keys this catalogue.
    const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;
    // Without a provider-service-map id the backend cannot key the catalogue
    // (it would return an empty list). Stop here and tell the agent rather
    // than firing a request that silently strands them with no call types
    // and no reason.
    if (providerServiceMapID === null) {
      this.callTypes.set([]);
      this.showError('hao.closure.noServiceError');
      return;
    }
    this.haoService.getCallTypes(providerServiceMapID, true).subscribe({
      next: (types) => this.callTypes.set(types),
      // A call type is mandatory to close, so a silent empty list would strand
      // the agent. Surface the failure so they can retry rather than guess.
      error: () => {
        this.callTypes.set([]);
        this.showError('hao.closure.callTypesLoadError');
      },
    });
  }

  private loadMasterData(): void {
    const serviceID = this.authStore.currentRole()?.serviceID ?? null;
    if (this.currentRole() !== ROLE_RO) {
      this.beneficiaryService.getRegistrationData(serviceID).subscribe({
        next: (data) => {
          this.communities.set(data?.m_communities ?? []);
          this.educations.set(data?.i_BeneficiaryEducation ?? []);
        },
        error: () => {
          this.communities.set([]);
          this.educations.set([]);
        },
      });
    }
    if (this.currentRole() === ROLE_CO) {
      this.haoService.getInstituteTypes(serviceID).subscribe({
        next: (types) => this.instituteTypes.set(types),
        error: () => this.instituteTypes.set([]),
      });
    }
  }

  private loadInstituteNames(institutionTypeID: number): void {
    this.haoService.getInstituteNames(institutionTypeID).subscribe({
      next: (names) => this.instituteNames.set(names),
      error: () => this.instituteNames.set([]),
    });
  }

  private loadCampaigns(): void {
    const agentID = this.authStore.user()?.agentID ?? null;
    if (agentID === null) {
      return;
    }
    this.haoService.getTransferCampaigns(agentID).subscribe({
      // Belt-and-braces: the template's @for iterates this signal, so a
      // non-array value (misbehaving backend, stale mock) must never land.
      next: (campaigns) => this.campaigns.set(Array.isArray(campaigns) ? campaigns : []),
      error: () => this.campaigns.set([]),
    });
  }

  private loadServices(): void {
    // Same providerServiceMapID-not-serviceID fix as loadCallTypes() above —
    // verified live: serviceID returns an empty transfer-target list.
    const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;
    this.haoService.getAvailableServices(providerServiceMapID, true).subscribe({
      next: (services) => this.services.set(services),
      error: () => this.services.set([]),
    });
  }

  private loadSkills(campaignName: string): void {
    this.haoService.getCampaignSkills(campaignName).subscribe({
      // Apply only if this is still the selected campaign — a slower response
      // for a previously-selected campaign must not overwrite the current one's
      // skills (and let a stale skill be submitted).
      next: (skills) => {
        if (this.selectedCampaign() === campaignName) {
          this.skills.set(skills);
        }
      },
      error: () => {
        if (this.selectedCampaign() === campaignName) {
          this.skills.set([]);
        }
      },
    });
  }

  private showError(messageKey: Parameters<I18nService['instant']>[0]): void {
    this.confirmDialog
      .alert({
        title: this.i18n.instant('dashboard.dialog.error'),
        message: this.i18n.instant(messageKey),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        status: 'error',
      })
      .subscribe();
  }
}
