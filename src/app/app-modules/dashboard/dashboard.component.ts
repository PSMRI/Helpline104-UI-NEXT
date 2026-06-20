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

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AuthStore } from '../core/auth/auth.store';
import { AgentIdComponent } from './components/agent-id.component';
import { CallStatisticsComponent } from './components/call-statistics.component';
import { CampaignToggleComponent } from './components/campaign-toggle.component';
import { DashboardHeaderComponent } from './components/dashboard-header.component';
import { DashboardStore } from './dashboard.store';

/** Feature code of the supervising role, which has no personal agent line. */
const SUPERVISOR_FEATURE_CODE = 'Supervisor';

/** Roles that may switch between inbound and outbound campaigns. */
const CAMPAIGN_FEATURE_CODES: readonly string[] = ['MO', 'CO', 'SIO', 'HAO', 'PD'];

/** Service name and screen that grant the Health Advice (HAO) privilege. */
const SERVICE_104 = '104';
const SCREEN_HEALTH_ADVICE = 'Health_Advice';

/**
 * Dashboard shell for the 104 agent desktop: navigation header, agent ID,
 * inbound/outbound campaign toggle and the call-statistics panel.
 *
 * Visibility mirrors the legacy dashboard — the agent line is hidden for
 * supervisors, and the campaign toggle is shown only to roles that handle calls
 * (MO/CO/SIO/HAO/PD) or to any agent holding the Health Advice privilege.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DashboardStore],
  imports: [
    DashboardHeaderComponent,
    AgentIdComponent,
    CampaignToggleComponent,
    CallStatisticsComponent,
  ],
  template: `
    <div class="flex min-h-screen flex-col bg-background text-foreground">
      <app-dashboard-header />

      <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          @if (showAgentId()) {
            <app-agent-id />
          }
          @if (showCampaignToggle()) {
            <app-campaign-toggle />
          }
        </div>

        <app-call-statistics />
      </main>
    </div>
  `,
})
export class DashboardComponent {
  private readonly authStore = inject(AuthStore);

  private readonly featureCode = computed(
    () => this.authStore.currentRole()?.featureCode ?? null,
  );

  private readonly hasHealthAdvicePrivilege = computed(() =>
    this.authStore
      .privileges()
      .some(
        (privilege) =>
          privilege.serviceName === SERVICE_104 &&
          (privilege.roles ?? []).some((role) =>
            (role.serviceRoleScreenMappings ?? []).some(
              (mapping) => mapping.screen?.screenName === SCREEN_HEALTH_ADVICE,
            ),
          ),
      ),
  );

  readonly showAgentId = computed(
    () => this.featureCode() !== SUPERVISOR_FEATURE_CODE,
  );

  readonly showCampaignToggle = computed(() => {
    const code = this.featureCode();
    // Supervisors never get the campaign toggle, even when they hold the
    // Health Advice privilege that otherwise enables it.
    if (code === SUPERVISOR_FEATURE_CODE) {
      return false;
    }
    return (
      (code !== null && CAMPAIGN_FEATURE_CODES.includes(code)) ||
      this.hasHealthAdvicePrivilege()
    );
  });
}
