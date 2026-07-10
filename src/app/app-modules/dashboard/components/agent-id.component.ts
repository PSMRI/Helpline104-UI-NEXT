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

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHeadset } from '@ng-icons/lucide';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * Shows the signed-in agent's telephony ID and live state, e.g.
 * "My ID : Agent - 2145 READY (IDLE)". The state is polled by the dashboard
 * (legacy `dashboardUserId.html` rendered the same `{{myIdAgent}} {{agentID}}
 * {{status}}` line) and passed in via {@link status}.
 */
@Component({
  selector: 'app-agent-id',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideHeadset })],
  template: `
    @if (user(); as u) {
      <h4 class="flex items-center gap-2 text-lg font-semibold">
        <ng-icon
          name="lucideHeadset"
          size="20"
          class="text-primary"
          aria-hidden="true"
        />
        <span>{{ 'dashboard.agentId.label' | translate: lang() }} {{ u.agentID }}</span>
        @if (status()) {
          <span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {{ status() }}
          </span>
        }
      </h4>
    }
  `,
})
export class AgentIdComponent {
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);

  /** Live telephony state line, e.g. "READY (IDLE)"; empty until polled. */
  readonly status = input('');

  readonly user = this.authStore.user;
  readonly lang = this.i18n.language;
}
