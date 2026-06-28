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
} from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '@env/environment';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { CallStore } from '../call/call.store';
import { parseInboundCtiMessage } from '../call/cti-message';
import { AuthStore } from '../core/auth/auth.store';
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

/**
 * Extract the origin from a configured base URL. Returns a token that can never
 * equal a real `MessageEvent.origin` when the URL is empty/malformed, so an
 * unconfigured telephony server trusts nothing rather than everything.
 */
function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return 'invalid:no-telephony-origin';
  }
}

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
    ZardButtonComponent,
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
                  <app-agent-id />
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

      <app-dashboard-footer [showCzentrix]="!isSupervisor()" [agentId]="agentId()" />

      @if (!isProduction) {
        <button
          z-button
          type="button"
          zSize="sm"
          zType="outline"
          class="fixed bottom-24 right-4 z-50 shadow-lg"
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
  private readonly callStore = inject(CallStore);
  private readonly router = inject(Router);

  /** Hides the dev-only inbound-call simulator from production builds. */
  readonly isProduction = environment.production;

  /** Origin of the CZentrix telephony server, the only trusted CTI sender. */
  private readonly telephonyOrigin = safeOrigin(environment.telephoneServer);

  constructor() {
    // The CZentrix CTI soft-phone iframe announces inbound calls to the host
    // window via postMessage ("Accept|<CLI>|<sessionId>|INBOUND"). The dashboard
    // is the agent's call-ready landing page, so it listens here, seeds the
    // CallStore and routes into the guarded on-call workspace.
    const onMessage = (event: MessageEvent): void => {
      if (!this.isTrustedCtiOrigin(event.origin)) {
        return;
      }
      this.handleCtiMessage(event.data);
    };
    window.addEventListener('message', onMessage);
    inject(DestroyRef).onDestroy(() =>
      window.removeEventListener('message', onMessage),
    );
  }

  /**
   * Only accept CTI events from the CZentrix telephony origin — never from an
   * arbitrary page/iframe that could forge an "inbound call". The dev simulator
   * posts from this app's own origin, which is trusted in non-production builds.
   */
  private isTrustedCtiOrigin(origin: string): boolean {
    if (origin === this.telephonyOrigin) {
      return true;
    }
    return !environment.production && origin === window.location.origin;
  }

  /** Parse a CTI payload; on a fresh inbound call, seed state and navigate. */
  private handleCtiMessage(data: unknown): void {
    const inbound = parseInboundCtiMessage(data);
    if (!inbound) {
      return;
    }
    // De-dupe: the iframe may re-post the same event for one connected call.
    if (
      this.callStore.onCall() &&
      this.callStore.sessionId() === inbound.sessionId
    ) {
      return;
    }

    this.callStore.startCall({
      cli: inbound.cli,
      sessionId: inbound.sessionId,
    });
    void this.router.navigate(['/innerpage']);
  }

  /**
   * Dev-only: post a fake inbound CTI event to this window so the inbound flow
   * can be exercised locally without a live CZentrix soft-phone. Excluded from
   * production builds via the {@link isProduction} template guard.
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

  readonly agentId = computed(() => this.authStore.user()?.agentID ?? null);
}
