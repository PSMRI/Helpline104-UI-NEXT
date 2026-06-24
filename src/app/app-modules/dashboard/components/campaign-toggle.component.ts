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

import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Observable } from 'rxjs';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CampaignService } from '../campaign.service';
import { Campaign, DashboardStore } from '../dashboard.store';

/** Extracts a server-supplied error message, falling back to a generic one. */
function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { errorMessage?: string } | null;
    return body?.errorMessage ?? error.message ?? fallback;
  }
  return fallback;
}

/**
 * Inbound/outbound campaign selector (radio buttons). Switching prompts for
 * confirmation, then asks the telephony backend to move the agent; a rejection
 * (e.g. "not allowed to switch to MANUAL mode") surfaces as an error notice and
 * the selection stays put.
 */
@Component({
  selector: 'app-campaign-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <fieldset
      class="flex items-center gap-5"
      [attr.aria-label]="'dashboard.campaign.label' | translate: lang()"
    >
      <label class="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="radio"
          name="campaign"
          class="h-4 w-4 accent-primary"
          [checked]="campaign() === 'inbound'"
          (click)="select('inbound', $event)"
        />
        {{ 'dashboard.campaign.inbound' | translate: lang() }}
      </label>
      <label class="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="radio"
          name="campaign"
          class="h-4 w-4 accent-primary"
          [checked]="campaign() === 'outbound'"
          (click)="select('outbound', $event)"
        />
        {{ 'dashboard.campaign.outbound' | translate: lang() }}
      </label>
    </fieldset>
  `,
})
export class CampaignToggleComponent {
  private readonly store = inject(DashboardStore);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly campaignService = inject(CampaignService);

  readonly campaign = this.store.campaign;
  readonly lang = this.i18n.language;

  /**
   * Handle a radio click. `preventDefault` stops the native toggle so the
   * selection only commits after the backend confirms — the radios are driven
   * purely by the {@link DashboardStore} campaign signal.
   */
  select(target: Campaign, event: Event): void {
    event.preventDefault();
    if (target === this.campaign()) {
      return;
    }

    const confirmKey =
      target === 'outbound'
        ? 'dashboard.campaign.switchToOutboundConfirm'
        : 'dashboard.campaign.switchToInboundConfirm';

    this.confirmDialog
      .confirm({
        title: this.i18n.instant('dashboard.dialog.info'),
        message: this.i18n.instant(confirmKey),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.requestSwitch(target);
        }
      });
  }

  private requestSwitch(target: Campaign): void {
    const agentId = this.authStore.user()?.agentID ?? null;
    // No agentID means the user is in a demo/offline session (no live CTI backend).
    // Updating the store directly is safe — there is no backend state to sync.
    if (agentId === null) {
      this.store.setCampaign(target);
      return;
    }

    const request: Observable<unknown> =
      target === 'outbound'
        ? this.campaignService.switchToOutbound(agentId)
        : this.campaignService.switchToInbound(agentId);

    request.subscribe({
      next: () => this.store.setCampaign(target),
      error: (error: unknown) => this.showSwitchError(error),
    });
  }

  private showSwitchError(error: unknown): void {
    this.confirmDialog
      .alert({
        title: this.i18n.instant('dashboard.dialog.error'),
        message: readErrorMessage(
          error,
          this.i18n.instant('dashboard.campaign.switchError'),
        ),
        okText: this.i18n.instant('dashboard.dialog.ok'),
      })
      .subscribe();
  }
}
