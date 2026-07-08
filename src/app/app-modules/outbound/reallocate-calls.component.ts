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
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch, lucideTrash2 } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../core/auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { OutboundAllocateComponent } from './outbound-allocate.component';
import { AgentUser, OutboundCallRecord, OutboundError, RoleOption } from './outbound.models';
import { OutboundService } from './outbound.service';
import { dayRangeIso } from './outbound.util';

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring';

/** Role screens that cannot receive reallocated outbound calls (legacy). */
const EXCLUDED_SCREENS = new Set(['supervising', 'registration', 'surveyor']);

/**
 * Reallocate an agent's outbound calls to other agents, or return them to the
 * unallocated bin (supervisor screen).
 *
 * Ported from the legacy `ReallocateCallsComponent`: the supervisor picks a role
 * and one of its agents (plus an optional date range), the agent's outbound
 * calls are fetched (`call/outboundCallList`), and the whole set can either be
 * moved to the bin (`call/resetOutboundCall`) or reallocated to the role's other
 * agents via the embedded {@link OutboundAllocateComponent} (the source agent is
 * excluded).
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-reallocate-calls',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    NgIcon,
    TranslatePipe,
    ZardButtonComponent,
    OutboundAllocateComponent,
  ],
  viewProviders: [provideIcons({ lucideSearch, lucideTrash2 })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        {{ 'outbound.reallocate.title' | translate: lang() }}
      </h1>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      <form
        [formGroup]="form"
        class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        (ngSubmit)="search()"
      >
        <div>
          <label for="re-role" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'outbound.reallocate.role' | translate: lang() }}
          </label>
          <select
            id="re-role"
            [class]="selectClass"
            formControlName="roleID"
            (change)="onRoleChange()"
          >
            <option [ngValue]="null" disabled>{{ 'outbound.select' | translate: lang() }}</option>
            @for (role of roles(); track role.roleID) {
              <option [ngValue]="role.roleID">{{ role.roleName }}</option>
            }
          </select>
        </div>
        <div>
          <label for="re-agent" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'outbound.reallocate.agent' | translate: lang() }}
          </label>
          <select id="re-agent" [class]="selectClass" formControlName="userID">
            <option [ngValue]="null" disabled>{{ 'outbound.select' | translate: lang() }}</option>
            @for (agent of agents(); track agent.userID) {
              <option [ngValue]="agent.userID">{{ agentName(agent) }}</option>
            }
          </select>
        </div>
        <div>
          <label for="re-start" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'outbound.search.startDate' | translate: lang() }}
          </label>
          <input id="re-start" type="date" [class]="selectClass" formControlName="startDate" />
        </div>
        <div>
          <label for="re-end" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'outbound.search.endDate' | translate: lang() }}
          </label>
          <input id="re-end" type="date" [class]="selectClass" formControlName="endDate" />
        </div>
        <div class="sm:col-span-2 lg:col-span-4">
          <button
            z-button
            type="submit"
            zType="default"
            [zLoading]="loading()"
            [zDisabled]="form.controls.userID.value === null"
          >
            <ng-icon name="lucideSearch" size="16" aria-hidden="true" />
            {{ 'outbound.reallocate.fetch' | translate: lang() }}
          </button>
        </div>
      </form>

      @if (searched()) {
        <div class="mt-5">
          <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-foreground">
              {{ 'outbound.reallocate.records' | translate: lang() }}
              <span class="font-normal text-muted-foreground">({{ records().length }})</span>
            </h2>
            @if (records().length > 0) {
              <div class="flex gap-2">
                <button
                  z-button
                  type="button"
                  zType="destructive"
                  zSize="sm"
                  [zLoading]="binning()"
                  (click)="moveToBin()"
                >
                  <ng-icon name="lucideTrash2" size="14" aria-hidden="true" />
                  {{ 'outbound.reallocate.moveToBin' | translate: lang() }}
                </button>
                <button
                  z-button
                  type="button"
                  zType="outline"
                  zSize="sm"
                  (click)="toggleReallocate()"
                >
                  {{ 'outbound.reallocate.reallocate' | translate: lang() }}
                </button>
              </div>
            }
          </div>

          <div class="overflow-x-auto rounded-md border border-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'outbound.col.sno' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'outbound.col.phone' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'outbound.col.benName' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'outbound.col.preferredDate' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'outbound.col.service' | translate: lang() }}
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (row of records(); track row.outboundCallReqID; let i = $index) {
                  <tr class="border-t border-border align-top">
                    <td class="px-3 py-2">{{ i + 1 }}</td>
                    <td class="px-3 py-2">{{ phoneOf(row) || '—' }}</td>
                    <td class="px-3 py-2">{{ nameOf(row) || '—' }}</td>
                    <td class="px-3 py-2">
                      {{ (row.prefferedDateTime | date: 'dd/MM/yyyy') || '—' }}
                    </td>
                    <td class="px-3 py-2">{{ row.requestedFeature || '—' }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="px-3 py-6 text-center text-muted-foreground">
                      {{ 'outbound.reallocate.noRecords' | translate: lang() }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (showReallocate() && records().length > 0) {
            <div class="mt-3">
              <app-outbound-allocate
                [records]="records()"
                [roleID]="form.controls.roleID.value"
                [excludeAgentName]="selectedAgentName()"
                (allocated)="onReallocated()"
              />
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class ReallocateCallsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly outbound = inject(OutboundService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly selectClass = SELECT_CLASS;

  readonly form = this.fb.group({
    roleID: this.fb.control<number | null>(null),
    userID: this.fb.control<number | null>(null),
    startDate: this.fb.control<string>('', { nonNullable: true }),
    endDate: this.fb.control<string>('', { nonNullable: true }),
  });

  readonly roles = signal<RoleOption[]>([]);
  readonly agents = signal<AgentUser[]>([]);
  readonly records = signal<OutboundCallRecord[]>([]);
  readonly loading = signal(false);
  readonly binning = signal(false);
  readonly searched = signal(false);
  readonly showReallocate = signal(false);
  readonly errorMessage = signal('');
  readonly selectedAgentName = signal<string | null>(null);

  ngOnInit(): void {
    const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;
    this.outbound
      .getRoles(providerServiceMapID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => this.roles.set(this.filterRoles(roles)),
        error: (err: OutboundError) => this.setError(err),
      });
  }

  phoneOf(row: OutboundCallRecord): string {
    return row.beneficiary?.benPhoneMaps?.[0]?.phoneNo ?? '';
  }

  nameOf(row: OutboundCallRecord): string {
    return [row.beneficiary?.firstName, row.beneficiary?.lastName]
      .filter((p) => !!p && p.trim().length > 0)
      .join(' ');
  }

  agentName(agent: AgentUser): string {
    return [agent.firstName, agent.lastName].filter((p) => !!p && p.trim().length > 0).join(' ');
  }

  onRoleChange(): void {
    this.form.patchValue({ userID: null });
    this.agents.set([]);
    this.searched.set(false);
    this.showReallocate.set(false);
    const roleID = this.form.controls.roleID.value;
    if (roleID == null) {
      return;
    }
    const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;
    this.outbound
      .getAgents(providerServiceMapID, roleID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (agents) => this.agents.set(agents),
        error: (err: OutboundError) => this.setError(err),
      });
  }

  toggleReallocate(): void {
    this.showReallocate.update((open) => !open);
  }

  search(): void {
    const userID = this.form.controls.userID.value;
    if (userID == null) {
      return;
    }
    const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;
    const { startDate, endDate } = this.form.getRawValue();
    const agent = this.agents().find((a) => a.userID === userID);
    this.selectedAgentName.set(agent ? this.agentName(agent) : null);
    this.loading.set(true);
    this.errorMessage.set('');
    this.showReallocate.set(false);
    this.outbound
      .getOutboundCallList({
        providerServiceMapID,
        assignedUserID: userID,
        ...dayRangeIso(startDate || null, endDate || null),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (records) => {
          this.loading.set(false);
          this.searched.set(true);
          this.records.set(records);
        },
        error: (err: OutboundError) => {
          this.loading.set(false);
          this.searched.set(true);
          this.records.set([]);
          this.setError(err);
        },
      });
  }

  moveToBin(): void {
    const ids = this.records()
      .map((r) => r.outboundCallReqID)
      .filter((id): id is number => id != null);
    if (ids.length === 0) {
      return;
    }
    this.confirmDialog
      .confirm({
        title: this.i18n.instant('outbound.reallocate.moveToBin'),
        message: this.i18n.instant('outbound.reallocate.moveToBinConfirm'),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
        destructive: true,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.binning.set(true);
        this.errorMessage.set('');
        this.outbound
          .moveToBin(ids)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.binning.set(false);
              this.search();
            },
            error: (err: OutboundError) => {
              this.binning.set(false);
              this.setError(err);
            },
          });
      });
  }

  onReallocated(): void {
    this.showReallocate.set(false);
    this.search();
  }

  private filterRoles(roles: RoleOption[]): RoleOption[] {
    return roles.filter((role) => {
      const features = role.featureName ?? [];
      if (features.length === 0) {
        return false;
      }
      return !features.some((f) =>
        EXCLUDED_SCREENS.has((f.screen?.screenName ?? '').trim().toLowerCase()),
      );
    });
  }

  private setError(err: OutboundError): void {
    this.errorMessage.set(err.errorMessage || this.i18n.instant('outbound.loadError'));
  }
}
