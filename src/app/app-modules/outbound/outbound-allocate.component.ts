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
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../core/auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { AgentUser, OutboundCallRecord, OutboundError } from './outbound.models';
import { OutboundService } from './outbound.service';

/**
 * Allocate the selected outbound records across one or more agents of a role.
 *
 * Ported from the legacy `OutboundAllocateRecordsComponent`. Embedded by the
 * search and reallocate screens: they pass the records to allocate and the
 * target role; this component loads that role's agents, lets the supervisor pick
 * agents and a per-agent count (defaulted to an even split), and calls
 * `call/outboundAllocation`. `excludeAgentName` drops the source agent from the
 * list during reallocation. Emits {@link allocated} on success.
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-outbound-allocate',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, ZardButtonComponent, ZardInputDirective],
  template: `
    <div class="rounded-md border border-border bg-muted/20 p-4">
      <h3 class="mb-3 text-sm font-semibold text-foreground">
        {{ 'outbound.allocate.title' | translate: lang() }}
        <span class="ml-1 font-normal text-muted-foreground">
          ({{ records().length }} {{ 'outbound.allocate.records' | translate: lang() }})
        </span>
      </h3>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      @if (agents().length === 0) {
        <p class="text-sm text-muted-foreground">
          {{ 'outbound.allocate.noAgents' | translate: lang() }}
        </p>
      } @else {
        <fieldset class="mb-3">
          <legend class="mb-1 text-xs font-medium text-muted-foreground">
            {{ 'outbound.allocate.selectAgents' | translate: lang() }}
          </legend>
          <div class="flex flex-col gap-1.5">
            @for (agent of agents(); track agent.userID) {
              <label class="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  [checked]="isSelected(agent.userID)"
                  (change)="toggleAgent(agent.userID)"
                />
                {{ agentName(agent) }}
              </label>
            }
          </div>
        </fieldset>

        <div class="mb-3 max-w-[12rem]">
          <label for="alloc-count" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'outbound.allocate.perAgent' | translate: lang() }}
          </label>
          <input
            id="alloc-count"
            z-input
            class="w-full"
            type="number"
            min="1"
            [max]="records().length"
            inputmode="numeric"
            [value]="allocateNo()"
            (input)="onCountInput($event)"
          />
        </div>

        <button
          z-button
          type="button"
          zType="default"
          [zLoading]="allocating()"
          [zDisabled]="!canAllocate()"
          (click)="allocate()"
        >
          {{ 'outbound.allocate.allocate' | translate: lang() }}
        </button>
      }
    </div>
  `,
})
export class OutboundAllocateComponent {
  private readonly outbound = inject(OutboundService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** Records to allocate (from the search/reallocate selection). */
  readonly records = input<OutboundCallRecord[]>([]);
  /** Target role whose agents receive the records. */
  readonly roleID = input<number | null>(null);
  /** Agent name to exclude from the list (the source agent on reallocation). */
  readonly excludeAgentName = input<string | null>(null);

  /** Emitted after a successful allocation so the parent can refresh. */
  readonly allocated = output<void>();

  readonly lang = this.i18n.language;

  readonly agents = signal<AgentUser[]>([]);
  readonly selectedIds = signal<number[]>([]);
  readonly allocateNo = signal(0);
  readonly allocating = signal(false);
  readonly errorMessage = signal('');

  readonly canAllocate = computed(
    () => this.selectedIds().length > 0 && this.allocateNo() > 0 && this.records().length > 0 && !this.allocating(),
  );

  constructor() {
    // Reload agents whenever the target role changes.
    effect(() => {
      const roleID = this.roleID();
      this.selectedIds.set([]);
      this.allocateNo.set(0);
      if (roleID == null) {
        this.agents.set([]);
        return;
      }
      this.loadAgents(roleID);
    });

    // Keep the per-agent count within bounds when the record set shrinks.
    effect(() => {
      const max = this.records().length;
      this.allocateNo.update((n) => (n > max ? max : n));
    });
  }

  isSelected(userID: number | undefined): boolean {
    return userID != null && this.selectedIds().includes(userID);
  }

  agentName(agent: AgentUser): string {
    return [agent.firstName, agent.lastName].filter((p) => !!p && p.trim().length > 0).join(' ');
  }

  toggleAgent(userID: number | undefined): void {
    if (userID == null) {
      return;
    }
    this.selectedIds.update((ids) => (ids.includes(userID) ? ids.filter((id) => id !== userID) : [...ids, userID]));
    this.recomputeCount();
  }

  onCountInput(event: Event): void {
    const raw = Number((event.target as HTMLInputElement).value);
    const max = this.records().length;
    if (!Number.isFinite(raw) || raw < 1) {
      this.allocateNo.set(0);
      return;
    }
    this.allocateNo.set(Math.min(Math.floor(raw), max));
  }

  allocate(): void {
    if (!this.canAllocate()) {
      return;
    }
    this.allocating.set(true);
    this.errorMessage.set('');
    this.outbound
      .allocateCalls({
        userID: this.selectedIds(),
        allocateNo: this.allocateNo(),
        outboundCallRequests: this.records()
          .map((r) => r.outboundCallReqID)
          .filter((id): id is number => id != null)
          .map((outboundCallReqID) => ({ outboundCallReqID })),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.allocating.set(false);
          this.selectedIds.set([]);
          this.allocated.emit();
        },
        error: (err: OutboundError) => {
          this.allocating.set(false);
          this.errorMessage.set(err.errorMessage || this.i18n.instant('outbound.allocate.error'));
        },
      });
  }

  /** Even split of the records across the currently selected agents. */
  private recomputeCount(): void {
    const agents = this.selectedIds().length;
    this.allocateNo.set(agents > 0 ? Math.floor(this.records().length / agents) : 0);
  }

  private loadAgents(roleID: number): void {
    const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;
    this.errorMessage.set('');
    this.outbound
      .getAgents(providerServiceMapID, roleID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (agents) => {
          const exclude = this.excludeAgentName();
          this.agents.set(exclude ? agents.filter((a) => this.agentName(a) !== exclude) : agents);
        },
        error: (err: OutboundError) => {
          this.agents.set([]);
          this.errorMessage.set(err.errorMessage || this.i18n.instant('outbound.allocate.error'));
        },
      });
  }
}
