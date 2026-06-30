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
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CallStore } from '../../call.store';
import {
  CallSubType,
  CallType,
  CampaignSkill,
  CloseCallRequest,
  TransferCampaign,
} from '../hao.models';
import { HaoService } from '../hao.service';

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
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ZardButtonComponent,
    ZardInputDirective,
  ],
  template: `
    <form class="flex flex-col gap-5" [formGroup]="form" novalidate>
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

      <div class="grid gap-5 sm:grid-cols-2">
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium" for="hao-cl-type">
            {{ 'hao.closure.callType' | translate: lang() }}
            <span class="text-destructive" aria-hidden="true">*</span>
          </label>
          <select
            id="hao-cl-type"
            formControlName="callTypeID"
            class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            [attr.aria-invalid]="isInvalid('callTypeID') || null"
          >
            <option [ngValue]="null">
              {{ 'hao.closure.selectCallType' | translate: lang() }}
            </option>
            @for (type of callTypes(); track type.callTypeID) {
              <option [ngValue]="type.callTypeID">{{ type.callType }}</option>
            }
          </select>
          @if (isInvalid('callTypeID')) {
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
            @for (sub of subTypes(); track sub.callSubTypeID) {
              <option [ngValue]="sub.callSubTypeID">{{ sub.callSubType }}</option>
            }
          </select>
          @if (isInvalid('callSubTypeID')) {
            <p class="text-xs font-medium text-destructive" role="alert">
              {{ 'hao.closure.callSubTypeRequired' | translate: lang() }}
            </p>
          }
        </div>
      </div>

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

      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium" for="hao-cl-remarks">
          {{ 'hao.closure.remarks' | translate: lang() }}
        </label>
        <textarea
          z-input
          id="hao-cl-remarks"
          rows="2"
          formControlName="remarks"
        ></textarea>
      </div>

      <div class="flex flex-col gap-3 rounded-lg border border-border p-4">
        <label class="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" class="h-4 w-4 accent-primary" formControlName="doTransfer" />
          {{ 'hao.closure.transferCall' | translate: lang() }}
        </label>
        @if (doTransfer()) {
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium" for="hao-cl-campaign">
                {{ 'hao.closure.transferCampaign' | translate: lang() }}
                <span class="text-destructive" aria-hidden="true">*</span>
              </label>
              <select
                id="hao-cl-campaign"
                formControlName="campaign"
                class="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option [ngValue]="null">
                  {{ 'hao.closure.selectCampaign' | translate: lang() }}
                </option>
                @for (campaign of campaigns(); track campaign.campaignName) {
                  <option [ngValue]="campaign.campaignName">{{ campaign.campaignName }}</option>
                }
              </select>
            </div>
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
          </div>
          <div class="flex justify-end">
            <button
              z-button
              type="button"
              zType="outline"
              [zLoading]="transferring()"
              [zDisabled]="transferring() || !selectedCampaign()"
              (click)="transfer()"
            >
              {{ 'hao.closure.transfer' | translate: lang() }}
            </button>
          </div>
        }
      </div>

      <div class="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        <button
          z-button
          type="button"
          zType="outline"
          [zLoading]="submitting()"
          [zDisabled]="submitting()"
          (click)="submit(true)"
        >
          {{ 'hao.closure.submitContinue' | translate: lang() }}
        </button>
        <button
          z-button
          type="button"
          [zLoading]="submitting()"
          [zDisabled]="submitting()"
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
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly lang = this.i18n.language;

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

  readonly callTypes = signal<CallType[]>([]);
  readonly campaigns = signal<TransferCampaign[]>([]);
  readonly skills = signal<CampaignSkill[]>([]);
  readonly submitting = signal(false);
  readonly transferring = signal(false);

  // Form values mirrored to signals so conditional UI updates under zoneless CD.
  private readonly selectedCallTypeId = signal<number | null>(null);
  readonly followUpRequired = signal(false);
  readonly doTransfer = signal(false);
  readonly selectedCampaign = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    isEmergency: [false],
    isSuicidal: [false],
    callTypeID: this.fb.control<number | null>(null, Validators.required),
    callSubTypeID: this.fb.control<number | null>(null),
    isFollowupRequired: [false],
    followUpDate: this.fb.control<string | null>(null),
    doTransfer: [false],
    campaign: this.fb.control<string | null>(null),
    skill: this.fb.control<string | null>(null),
    remarks: this.fb.control<string | null>(null),
  });

  /** Sub-types of the currently selected call type. */
  readonly subTypes = computed<CallSubType[]>(() => {
    const typeId = this.selectedCallTypeId();
    return this.callTypes().find((t) => t.callTypeID === typeId)?.subType ?? [];
  });

  constructor() {
    this.loadCallTypes();

    const c = this.form.controls;

    c.callTypeID.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.selectedCallTypeId.set(value);
      // A new call type invalidates any previously chosen sub-type, and the
      // sub-type is mandatory only when the new type actually has sub-types.
      c.callSubTypeID.reset(null);
      const hasSubTypes = this.subTypes().length > 0;
      c.callSubTypeID.setValidators(hasSubTypes ? [Validators.required] : []);
      c.callSubTypeID.updateValueAndValidity();
    });

    c.isFollowupRequired.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((required) => {
        this.followUpRequired.set(required);
        c.followUpDate.setValidators(required ? [Validators.required] : []);
        if (!required) {
          c.followUpDate.reset(null);
        }
        c.followUpDate.updateValueAndValidity();
      });

    c.doTransfer.valueChanges.pipe(takeUntilDestroyed()).subscribe((on) => {
      this.doTransfer.set(on);
      if (on && this.campaigns().length === 0) {
        this.loadCampaigns();
      }
      if (!on) {
        c.campaign.reset(null);
        c.skill.reset(null);
        this.skills.set([]);
        this.selectedCampaign.set(null);
      }
    });

    c.campaign.valueChanges.pipe(takeUntilDestroyed()).subscribe((campaign) => {
      this.selectedCampaign.set(campaign);
      c.skill.reset(null);
      this.skills.set([]);
      if (campaign) {
        this.loadSkills(campaign);
      }
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
    if (this.submitting()) {
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
    const request: CloseCallRequest = {
      benCallID,
      callID: this.callStore.callId(),
      beneficiaryRegID: this.callStore.beneficiaryId(),
      callTypeID: value.callTypeID as number,
      callSubTypeID: value.callSubTypeID,
      isFollowupRequired: value.isFollowupRequired,
      followUpDate: value.isFollowupRequired ? value.followUpDate : null,
      isEmergency: value.isEmergency,
      isSuicidal: value.isSuicidal,
      remarks: value.remarks?.trim() || null,
      isServiceAvailed: this.serviceAvailed(),
      createdBy: this.authStore.user()?.userName ?? '',
    };

    const confirmKey = andContinue
      ? 'hao.closure.confirmContinue'
      : 'hao.closure.confirmClose';

    this.confirmDialog
      .confirm({
        title: this.i18n.instant('hao.closure.confirmTitle'),
        message: this.i18n.instant(confirmKey),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.recordDisposition(request, andContinue);
        }
      });
  }

  private recordDisposition(request: CloseCallRequest, andContinue: boolean): void {
    this.submitting.set(true);
    this.haoService.closeCall(request).subscribe({
      next: () => {
        this.submitting.set(false);
        if (andContinue) {
          this.form.reset({ isEmergency: false, isSuicidal: false });
          this.continued.emit();
        } else {
          this.closed.emit();
        }
      },
      error: () => {
        this.submitting.set(false);
        this.showError('hao.closure.closeError');
      },
    });
  }

  transfer(): void {
    const campaign = this.selectedCampaign();
    const agentID = this.authStore.user()?.agentID ?? null;
    const benCallID = this.callStore.callId() ?? this.callStore.sessionId();
    if (!campaign || agentID === null || !benCallID || this.transferring()) {
      return;
    }

    const skill = this.form.controls.skill.value;
    this.transferring.set(true);
    this.haoService
      .transferCall({
        transferFrom: agentID,
        transferCampaignInfo: campaign,
        skillTransferFlag: !!skill,
        skill,
        agentIPAddress: null,
        benCallID,
      })
      .subscribe({
        next: () => {
          this.transferring.set(false);
          this.transferred.emit();
        },
        error: () => {
          this.transferring.set(false);
          this.showError('hao.closure.transferError');
        },
      });
  }

  private loadCallTypes(): void {
    const providerServiceMapID =
      this.authStore.currentRole()?.providerServiceMapID ?? null;
    this.haoService.getCallTypes(providerServiceMapID).subscribe({
      next: (types) => this.callTypes.set(types),
      error: () => this.callTypes.set([]),
    });
  }

  private loadCampaigns(): void {
    const agentID = this.authStore.user()?.agentID ?? null;
    if (agentID === null) {
      return;
    }
    this.haoService.getTransferCampaigns(agentID).subscribe({
      next: (campaigns) => this.campaigns.set(campaigns),
      error: () => this.campaigns.set([]),
    });
  }

  private loadSkills(campaignID: string): void {
    this.haoService.getCampaignSkills(campaignID).subscribe({
      next: (skills) => this.skills.set(skills),
      error: () => this.skills.set([]),
    });
  }

  private showError(messageKey: Parameters<I18nService['instant']>[0]): void {
    this.confirmDialog
      .alert({
        title: this.i18n.instant('dashboard.dialog.error'),
        message: this.i18n.instant(messageKey),
        okText: this.i18n.instant('dashboard.dialog.ok'),
      })
      .subscribe();
  }
}
