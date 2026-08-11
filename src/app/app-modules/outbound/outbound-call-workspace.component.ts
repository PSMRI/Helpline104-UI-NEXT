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

import { CdkStep } from '@angular/cdk/stepper';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock, lucidePhoneOutgoing, lucideUser } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { HaoStepperComponent } from '../call/hao/hao-stepper.component';
import { CaseSheetComponent } from '../call/hao/steps/case-sheet.component';
import { ClosureStepComponent } from '../call/hao/steps/closure-step.component';
import { OutboundStore } from './outbound.store';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const TICK_MS = 1000;

/** Zero-pad a time part to two digits. */
function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * Outbound call workspace (route `/outbound/workspace`).
 *
 * Ported from the legacy `AgentOutbondcallComponent`: a beneficiary case-sheet →
 * closure wizard for an outbound call the agent picked from the worklist. The
 * legacy jQuery/Bootstrap carousel is replaced by the declarative
 * {@link HaoStepperComponent}; the case-sheet and closure steps are the same
 * shared components the inbound HAO/role workspaces use.
 *
 * CTI dial/login is deferred: the record context comes from {@link OutboundStore}
 * (seeded by the worklist), and the header timer counts up from workspace entry
 * rather than from a live CTI connect event.
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-outbound-call-workspace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkStep,
    NgIcon,
    HaoStepperComponent,
    CaseSheetComponent,
    ClosureStepComponent,
    ZardButtonComponent,
    TranslatePipe,
  ],
  viewProviders: [provideIcons({ lucideClock, lucidePhoneOutgoing, lucideUser })],
  template: `
    <section class="rounded-xl border border-border bg-card p-4 sm:p-6">
      @if (selection(); as sel) {
        <header class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div class="flex items-center gap-3">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ng-icon name="lucidePhoneOutgoing" size="18" aria-hidden="true" />
            </span>
            <div>
              <p class="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ng-icon name="lucideUser" size="14" aria-hidden="true" />
                {{ sel.beneficiaryName || ('outbound.workspace.unknownCaller' | translate: lang()) }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ sel.phoneNo || '—' }}
                @if (sel.requestedFeature) {
                  <span class="ml-2 rounded bg-muted px-1.5 py-0.5">{{ sel.requestedFeature }}</span>
                }
              </p>
            </div>
          </div>
          <span
            class="inline-flex items-center gap-2 font-mono text-lg tabular-nums text-foreground"
            role="timer"
            aria-live="off"
            [attr.aria-label]="('outbound.workspace.callTime' | translate: lang()) + ' ' + elapsed()"
          >
            <ng-icon name="lucideClock" size="18" aria-hidden="true" />
            {{ elapsed() }}
          </span>
        </header>

        <app-hao-stepper [linear]="true" (selectionChange)="stepIndex.set($event.selectedIndex)">
          <cdk-step [label]="'outbound.workspace.stepCaseSheet' | translate: lang()" [completed]="true">
            <app-hao-case-sheet
              [beneficiaryId]="sel.beneficiaryRegID"
              [callId]="null"
              (serviceAvailed)="onServiceAvailed()"
            />
          </cdk-step>

          <cdk-step [label]="'outbound.workspace.stepClosure' | translate: lang()">
            <app-hao-closure-step
              [serviceAvailed]="serviceAvailed()"
              (closed)="onCallClosed()"
              (continued)="onContinue()"
              (transferred)="onCallClosed()"
            />
          </cdk-step>
        </app-hao-stepper>

        <footer class="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <button z-button type="button" zType="ghost" (click)="endCall()">
            {{ 'outbound.workspace.endCall' | translate: lang() }}
          </button>
          <div class="ml-auto flex gap-3">
            @if (stepIndex() === 1) {
              <button z-button type="button" zType="outline" (click)="cancelToCaseSheet()">
                {{ 'outbound.workspace.cancel' | translate: lang() }}
              </button>
            } @else {
              <button z-button type="button" (click)="proceedToClosure()">
                {{ 'outbound.workspace.proceedToClosure' | translate: lang() }}
              </button>
            }
          </div>
        </footer>
      } @else {
        <div class="flex flex-col items-center gap-3 py-12 text-center">
          <p class="text-sm text-muted-foreground">
            {{ 'outbound.workspace.noSelection' | translate: lang() }}
          </p>
          <button z-button type="button" zType="outline" (click)="backToWorklist()">
            {{ 'outbound.workspace.backToWorklist' | translate: lang() }}
          </button>
        </div>
      }
    </section>
  `,
})
export class OutboundCallWorkspaceComponent {
  private readonly outboundStore = inject(OutboundStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;

  readonly selection = this.outboundStore.selection;

  private readonly stepper = viewChild(HaoStepperComponent);

  /** Active wizard step (0 = case sheet, 1 = closure). */
  readonly stepIndex = signal(0);

  private readonly _serviceAvailed = signal(false);
  readonly serviceAvailed = this._serviceAvailed.asReadonly();

  private readonly startedAt = Date.now();
  private readonly _elapsedSeconds = signal(0);

  /** Elapsed workspace time formatted as `HH:MM:SS`. */
  readonly elapsed = computed(() => {
    const total = this._elapsedSeconds();
    const hours = Math.floor(total / SECONDS_PER_HOUR);
    const minutes = Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    const seconds = total % SECONDS_PER_MINUTE;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  });

  constructor() {
    const intervalId = setInterval(() => {
      this._elapsedSeconds.set(Math.max(0, Math.floor((Date.now() - this.startedAt) / TICK_MS)));
    }, TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalId));
  }

  onServiceAvailed(): void {
    this._serviceAvailed.set(true);
  }

  proceedToClosure(): void {
    this.confirmDialog
      .confirm({
        title: this.i18n.instant('outbound.workspace.proceedTitle'),
        message: this.i18n.instant('outbound.workspace.proceedConfirm'),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.stepper()?.next();
        }
      });
  }

  cancelToCaseSheet(): void {
    this.stepper()?.previous();
  }

  onContinue(): void {
    this.stepper()?.previous();
  }

  /** Confirm before ending the call from the footer control. */
  endCall(): void {
    this.confirmDialog
      .confirm({
        title: this.i18n.instant('outbound.workspace.endCallTitle'),
        message: this.i18n.instant('outbound.workspace.endCallConfirm'),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
        destructive: true,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.onCallClosed();
        }
      });
  }

  onCallClosed(): void {
    this.outboundStore.clear();
    void this.router.navigate(['/outbound/worklist']);
  }

  backToWorklist(): void {
    void this.router.navigate(['/outbound/worklist']);
  }
}
