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
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '@env/environment';

import { catchError, filter, of, switchMap, timer } from 'rxjs';

import { AuthStore } from '../core/auth/auth.store';
import { AgentState, AgentStatusService } from './agent-status.service';
import { AgentIdComponent } from './components/agent-id.component';
import { AlertsPanelComponent } from './components/alerts-panel.component';
import { ActivityPanelComponent } from './components/activity-panel.component';
import { CallStatisticsComponent } from './components/call-statistics.component';
import { CampaignToggleComponent } from './components/campaign-toggle.component';
import { DashboardFooterComponent } from './components/dashboard-footer.component';
import { DashboardHeaderComponent } from './components/dashboard-header.component';
import { DashboardSidebarComponent } from './components/dashboard-sidebar.component';
import { ReportsPanelComponent } from './components/reports-panel.component';
import { RatingPanelComponent } from './components/rating-panel.component';
import { DashboardStore } from './dashboard.store';

/** Feature code of the supervising role, which has no personal agent line. */
const SUPERVISOR_FEATURE_CODE = 'Supervisor';

/** Roles that may switch between inbound and outbound campaigns. */
const CAMPAIGN_FEATURE_CODES: readonly string[] = ['MO', 'CO', 'SIO', 'HAO', 'PD'];

/** Service name and screen that grant the Health Advice (HAO) privilege. */
const SERVICE_104 = '104';
const SCREEN_HEALTH_ADVICE = 'Health_Advice';

/** Training-resource badge count by role, mirroring the legacy dashboard. */
const ACTIVITY_BADGE_BY_FEATURE: Record<string, number> = {
  MO: 6,
  CO: 4,
  Supervisor: 1,
};

/** How often the agent's telephony state is refreshed (legacy: 15 s). */
const AGENT_STATUS_POLL_MS = 15_000;

/** States whose type suffix the legacy dashboard suppressed. */
const ON_CALL_STATES: readonly string[] = ['INCALL', 'CLOSURE'];

/**
 * Dashboard shell for the 104 agent desktop: navigation header, left rail, the
 * agent line / campaign selector, call statistics, the alerts, reports,
 * activity and rating panels, and the footer.
 *
 * Visibility mirrors the legacy dashboard — supervisors get no agent line, no
 * campaign selector and blank call statistics, but gain the Activity Area rail
 * entry; the campaign selector is shown to call-handling roles (MO/CO/SIO/HAO/PD)
 * or any agent holding the Health Advice privilege.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DashboardStore],
  imports: [
    DashboardHeaderComponent,
    DashboardSidebarComponent,
    DashboardFooterComponent,
    AgentIdComponent,
    CampaignToggleComponent,
    CallStatisticsComponent,
    AlertsPanelComponent,
    ReportsPanelComponent,
    ActivityPanelComponent,
    RatingPanelComponent,
  ],
  template: `
    <div class="flex min-h-screen flex-col bg-background text-foreground">
      <app-dashboard-header />

      <div class="relative flex-1 bg-muted/40">
        <app-dashboard-sidebar
          class="absolute inset-y-0 left-0 z-20"
          [showActivityArea]="isSupervisor()"
        />

        <main class="py-6 pl-16 pr-4 sm:pl-20 sm:pr-6">
          <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
            @if (showAgentId() || showCampaignToggle()) {
              <div class="flex flex-wrap items-center justify-between gap-4">
                @if (showAgentId()) {
                  <app-agent-id [status]="agentStatus()" />
                }
                @if (showCampaignToggle()) {
                  <app-campaign-toggle />
                }
              </div>
            }

            <app-call-statistics [blank]="isSupervisor()" />

            <div class="grid gap-6 lg:grid-cols-2">
              <app-alerts-panel />
              <app-reports-panel />
            </div>

            <div class="grid gap-6 lg:grid-cols-2">
              <app-activity-panel [count]="activityCount()" />
              <app-rating-panel />
            </div>
          </div>
        </main>
      </div>

      <app-dashboard-footer />

      @if (!isProduction) {
        <button
          type="button"
          class="fixed bottom-12 left-4 z-40 rounded-md border border-muted-foreground/40 bg-background/80 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          (click)="simulateInboundCall()"
        >
          ▶ Simulate inbound call (dev)
        </button>
      }
    </div>
  `,
})
export class DashboardComponent {
  private readonly authStore = inject(AuthStore);
  private readonly agentStatusApi = inject(AgentStatusService);
  private readonly dashboardStore = inject(DashboardStore);

  /** Hides the dev-only inbound-call simulator from production builds. */
  readonly isProduction = environment.production;

  /** The agent's live telephony state ("READY (IDLE)"), polled every 15 s. */
  private readonly _agentStatus = signal('');
  readonly agentStatus = this._agentStatus.asReadonly();

  constructor() {
    // Poll the agent's telephony state (legacy DashboardUserIdComponent:
    // immediate call + every 15 s) to refresh the "My ID" status line and keep
    // the campaign selector in sync with the dialer mode. Supervisors have no
    // personal agent line, so they are never polled. A failed poll falls back
    // to the inbound campaign, as in the legacy error handler; the next tick
    // retries. Inbound-call routing itself lives in the app-scoped
    // InboundCtiService — the poller never navigates.
    timer(0, AGENT_STATUS_POLL_MS)
      .pipe(
        takeUntilDestroyed(),
        filter(
          () => !this.isSupervisor() && this.authStore.user()?.agentID != null,
        ),
        switchMap(() =>
          this.agentStatusApi
            .getAgentStatus(this.authStore.user()?.agentID ?? 0)
            .pipe(catchError(() => of(null))),
        ),
      )
      .subscribe((state) => this.applyAgentState(state));
  }

  /** Fold one polled CTI state into the status line and campaign selector. */
  private applyAgentState(state: AgentState | null): void {
    if (!state) {
      // A failed/empty poll clears the status line so it never shows a stale
      // state once the agent's telephony state can no longer be read.
      this._agentStatus.set('');
      this.dashboardStore.setCampaign('inbound');
      return;
    }
    const stateName = state.stateObj?.stateName ?? '';
    if (stateName) {
      const stateType = state.stateObj?.stateType ?? '';
      const suppressType = ON_CALL_STATES.includes(stateName.toUpperCase());
      this._agentStatus.set(
        stateType && !suppressType ? `${stateName} (${stateType})` : stateName,
      );
    } else {
      // A polled state with no stateName clears the line rather than leaving
      // the previous state showing.
      this._agentStatus.set('');
    }
    const dialer = state.dialer_type?.toUpperCase();
    if (dialer === 'PROGRESSIVE') {
      this.dashboardStore.setCampaign('inbound');
    } else if (dialer === 'PREVIEW') {
      this.dashboardStore.setCampaign('outbound');
    }
  }

  /**
   * Dev-only: post a fake inbound CTI event to this window so the inbound flow
   * (handled by the app-scoped InboundCtiService) can be exercised locally
   * without a live CZentrix soft-phone. Excluded from production builds via
   * the {@link isProduction} template guard.
   */
  simulateInboundCall(): void {
    const cli = '9876543210';
    const sessionId = `${Date.now()}.dev`;
    window.postMessage(`Accept|${cli}|${sessionId}|INBOUND`, window.location.origin);
  }

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

  readonly isSupervisor = computed(
    () => this.featureCode() === SUPERVISOR_FEATURE_CODE,
  );

  readonly showAgentId = computed(() => !this.isSupervisor());

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

  readonly activityCount = computed(() => {
    const code = this.featureCode();
    return code ? (ACTIVITY_BADGE_BY_FEATURE[code] ?? 0) : 0;
  });
}
