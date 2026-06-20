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

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Campaign, DashboardStore } from '../dashboard.store';

/** Inbound/outbound campaign switch backed by {@link DashboardStore}. */
@Component({
  selector: 'app-campaign-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ZardButtonComponent, TranslatePipe],
  template: `
    <div
      class="inline-flex items-center gap-2"
      role="group"
      [attr.aria-label]="'dashboard.campaign.label' | translate: lang()"
    >
      <button
        z-button
        type="button"
        [zType]="campaign() === 'inbound' ? 'default' : 'outline'"
        zSize="sm"
        [attr.aria-pressed]="campaign() === 'inbound'"
        (click)="select('inbound')"
      >
        {{ 'dashboard.campaign.inbound' | translate: lang() }}
      </button>
      <button
        z-button
        type="button"
        [zType]="campaign() === 'outbound' ? 'default' : 'outline'"
        zSize="sm"
        [attr.aria-pressed]="campaign() === 'outbound'"
        (click)="select('outbound')"
      >
        {{ 'dashboard.campaign.outbound' | translate: lang() }}
      </button>
    </div>
  `,
})
export class CampaignToggleComponent {
  private readonly store = inject(DashboardStore);
  private readonly i18n = inject(I18nService);

  readonly campaign = this.store.campaign;
  readonly lang = this.i18n.language;

  select(campaign: Campaign): void {
    this.store.setCampaign(campaign);
  }
}
