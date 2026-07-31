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

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Subject, catchError, map, merge, of, switchMap, timer } from 'rxjs';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRefreshCw } from '@ng-icons/lucide';

import { ZardBadgeComponent } from '@common-ui/ui/badge';
import { ZardButtonComponent } from '@common-ui/ui/button';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SupervisorError } from '../shared/supervisor-api';
import { AgentStatusKind, OnlineAgent } from './agent-status.models';
import { SupervisorAgentStatusService } from './agent-status.service';

/** Refresh cadence for the online-agents table. */
const AGENT_STATUS_REFRESH_MS = 30_000;

/** Badge variant per status bucket (available=green, busy=red, break=yellow, offline=gray). */
const BADGE_TYPE: Record<AgentStatusKind, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  available: 'success',
  busy: 'destructive',
  break: 'warning',
  offline: 'secondary',
};

/** One emission of the polling stream: rows on success, an error otherwise. */
interface PollResult {
  agents: OnlineAgent[] | null;
  error: SupervisorError | null;
}

/**
 * Live agent status (supervisor screen). Replaces the legacy
 * `AgentStatusComponent`, which embedded the CZentrix `remote_login.php`
 * console in an iframe: this version calls the Common-API proxy the legacy
 * service already defined (`cti/getOnlineAgents`) and renders the online
 * agents as a table with colour-coded status badges, auto-refreshing every
 * 30 seconds (same `timer` + `takeUntilDestroyed` pattern as the dashboard's
 * agent-state poll).
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-agent-status',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, NgIcon, TranslatePipe, ZardBadgeComponent, ZardButtonComponent],
  viewProviders: [provideIcons({ lucideRefreshCw })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-base font-semibold text-foreground">
            {{ 'supervisor.agentStatus.title' | translate: lang() }}
          </h1>
          <p class="text-xs text-muted-foreground">
            {{ 'supervisor.agentStatus.autoRefresh' | translate: lang() }}
            @if (lastUpdated(); as updated) {
              · {{ 'supervisor.agentStatus.lastUpdated' | translate: lang() }}
              {{ updated | date: 'HH:mm:ss' }}
            }
          </p>
        </div>
        <button z-button type="button" zType="outline" zSize="sm" (click)="refresh()">
          <ng-icon name="lucideRefreshCw" size="16" aria-hidden="true" />
          {{ 'supervisor.agentStatus.refresh' | translate: lang() }}
        </button>
      </div>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      @if (loading()) {
        <p class="py-8 text-center text-sm text-muted-foreground">
          {{ 'supervisor.agentStatus.loading' | translate: lang() }}
        </p>
      } @else if (loaded()) {
        <div class="overflow-x-auto rounded-md border border-border">
          <table class="w-full text-left text-sm">
            <thead class="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'supervisor.agentStatus.agentId' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'supervisor.agentStatus.name' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'supervisor.agentStatus.extension' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'supervisor.agentStatus.status' | translate: lang() }}
                </th>
              </tr>
            </thead>
            <tbody>
              @for (agent of agents(); track agent.agentId + '-' + agent.extension) {
                <tr class="border-t border-border align-top">
                  <td class="px-3 py-2">{{ agent.agentId || '—' }}</td>
                  <td class="px-3 py-2">{{ agent.name || '—' }}</td>
                  <td class="px-3 py-2">{{ agent.extension || '—' }}</td>
                  <td class="px-3 py-2">
                    <z-badge [zType]="badgeType(agent.kind)">
                      {{
                        agent.status || ('supervisor.agentStatus.unknown' | translate: lang())
                      }}
                    </z-badge>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-3 py-8 text-center text-muted-foreground">
                    {{ 'supervisor.agentStatus.noAgents' | translate: lang() }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class AgentStatusComponent {
  private readonly service = inject(SupervisorAgentStatusService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);

  readonly lang = this.i18n.language;

  readonly agents = signal<OnlineAgent[]>([]);
  /** True only until the first poll settles; later polls refresh in place. */
  readonly loading = signal(true);
  /**
   * True once a poll has succeeded. Until then the table (and its "no agents"
   * empty state) stays hidden — after a failed first poll only the error
   * banner shows, since no response has established that the list is empty.
   */
  readonly loaded = signal(false);
  readonly errorMessage = signal('');
  readonly lastUpdated = signal<Date | null>(null);

  private readonly manualRefresh = new Subject<void>();

  constructor() {
    // Poll the online-agents list immediately and every 30 s (same pattern as
    // the dashboard's agent-state poll: timer + takeUntilDestroyed). A manual
    // refresh click merges into the same stream, and switchMap drops any
    // in-flight poll so a stale response can never overwrite a newer one.
    // Errors are folded into the emission so one failed poll (CTI outage)
    // never kills the stream — the next tick retries.
    merge(timer(0, AGENT_STATUS_REFRESH_MS), this.manualRefresh)
      .pipe(
        takeUntilDestroyed(),
        switchMap(() =>
          this.service.getOnlineAgents(this.authStore.user()?.agentID ?? null).pipe(
            map((agents): PollResult => ({ agents, error: null })),
            catchError((err: SupervisorError) => of<PollResult>({ agents: null, error: err })),
          ),
        ),
      )
      .subscribe((result) => this.applyPoll(result));
  }

  refresh(): void {
    this.manualRefresh.next();
  }

  badgeType(kind: AgentStatusKind): 'success' | 'destructive' | 'warning' | 'secondary' {
    return BADGE_TYPE[kind];
  }

  private applyPoll(result: PollResult): void {
    this.loading.set(false);
    if (result.agents !== null) {
      this.agents.set(result.agents);
      this.loaded.set(true);
      this.errorMessage.set('');
      this.lastUpdated.set(new Date());
      return;
    }
    // Keep the last successful rows visible during a transient failure; the
    // banner flags that the data may be stale until the next tick succeeds.
    this.errorMessage.set(
      result.error?.errorMessage || this.i18n.instant('supervisor.agentStatus.loadError'),
    );
  }
}
