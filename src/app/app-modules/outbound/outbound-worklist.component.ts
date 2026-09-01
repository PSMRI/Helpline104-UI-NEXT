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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePhone, lucidePhoneOutgoing } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { AuthStore } from '../core/auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { OutboundCallRecord, OutboundError } from './outbound.models';
import { OutboundService } from './outbound.service';
import { OutboundStore } from './outbound.store';

/**
 * Agent outbound worklist: the outbound calls allocated to the signed-in agent
 * (`call/outboundCallList` filtered by `assignedUserID`). Each row can be opened
 * into the {@link OutboundCallWorkspaceComponent}; a manual-dial field is present
 * for parity but the CTI dial itself is deferred (see note below the field).
 *
 * Ported from the legacy `OutbondWorklistComponent`. The legacy per-role table
 * split (HAO/MO/CO/SIO/PD) is collapsed into a single table with a Service
 * column, since `outboundCallList` already scopes rows to this agent.
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-outbound-worklist',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, NgIcon, TranslatePipe, ZardButtonComponent],
  viewProviders: [provideIcons({ lucidePhone, lucidePhoneOutgoing })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-base font-semibold text-foreground">
          {{ 'outbound.worklist.title' | translate: lang() }}
        </h1>
        <button z-button type="button" zType="outline" zSize="sm" (click)="goToDashboard()">
          {{ 'outbound.backToDashboard' | translate: lang() }}
        </button>
      </header>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      @if (loading()) {
        <p class="py-8 text-center text-sm text-muted-foreground">
          {{ 'outbound.loading' | translate: lang() }}
        </p>
      } @else {
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
                  {{ 'outbound.col.benId' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'outbound.col.benName' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'outbound.col.remarks' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'outbound.col.preferredDate' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'outbound.col.attempts' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'outbound.col.service' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'outbound.col.action' | translate: lang() }}
                </th>
              </tr>
            </thead>
            <tbody>
              @for (row of records(); track row.outboundCallReqID; let i = $index) {
                <tr class="border-t border-border align-top">
                  <td class="px-3 py-2">{{ i + 1 }}</td>
                  <td class="px-3 py-2">{{ phoneOf(row) || '—' }}</td>
                  <td class="px-3 py-2">{{ row.beneficiary?.beneficiaryID || '—' }}</td>
                  <td class="px-3 py-2">{{ nameOf(row) || '—' }}</td>
                  <td class="px-3 py-2">{{ row.requestedFor || '—' }}</td>
                  <td class="px-3 py-2">
                    {{ (row.prefferedDateTime | date: 'dd/MM/yyyy':'UTC') || '—' }}
                  </td>
                  <td class="px-3 py-2">{{ row.noOfTrials ?? 0 }}</td>
                  <td class="px-3 py-2">{{ row.requestedFeature || '—' }}</td>
                  <td class="px-3 py-2">
                    <button z-button zType="default" zSize="sm" [zDisabled]="!phoneOf(row)" (click)="open(row)">
                      <ng-icon name="lucidePhoneOutgoing" size="14" aria-hidden="true" />
                      {{ 'outbound.worklist.open' | translate: lang() }}
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="px-3 py-8 text-center text-muted-foreground">
                    {{ 'outbound.worklist.empty' | translate: lang() }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Manual dial (CTI deferred) -->
        <div class="mt-6 max-w-sm">
          <h2 class="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <ng-icon name="lucidePhone" size="16" class="text-primary" aria-hidden="true" />
            {{ 'outbound.worklist.manualDial' | translate: lang() }}
          </h2>
          <p class="rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
            {{ 'outbound.worklist.dialDeferred' | translate: lang() }}
          </p>
        </div>
      }
    </section>
  `,
})
export class OutboundWorklistComponent implements OnInit {
  private readonly outbound = inject(OutboundService);
  private readonly outboundStore = inject(OutboundStore);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;

  readonly records = signal<OutboundCallRecord[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.load();
  }

  phoneOf(row: OutboundCallRecord): string {
    return row.beneficiary?.benPhoneMaps?.[0]?.phoneNo ?? '';
  }

  nameOf(row: OutboundCallRecord): string {
    return [row.beneficiary?.firstName, row.beneficiary?.lastName].filter((p) => !!p && p.trim().length > 0).join(' ');
  }

  /** Open a record into the outbound workspace (CTI dial deferred). */
  open(row: OutboundCallRecord): void {
    if (!this.phoneOf(row)) {
      return;
    }
    this.outboundStore.select(row);
    void this.router.navigate(['/outbound/workspace']);
  }

  goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  private load(): void {
    const role = this.authStore.currentRole();
    const userID = this.authStore.user()?.userID ?? null;
    this.loading.set(true);
    this.errorMessage.set('');
    this.outbound
      .getCallWorklist(role?.providerServiceMapID ?? null, userID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.loading.set(false);
          this.records.set(rows);
        },
        error: (err: OutboundError) => {
          this.loading.set(false);
          this.records.set([]);
          this.errorMessage.set(err.errorMessage || this.i18n.instant('outbound.loadError'));
        },
      });
  }
}
