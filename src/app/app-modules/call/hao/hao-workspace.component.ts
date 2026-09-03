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
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CallStore } from '../call.store';
import { CallWrapupService } from '../call-wrapup.service';
import { SERVICE_104, collectServiceScreens } from '../role-workspace/role-screens.util';
import { HaoStepperComponent } from './hao-stepper.component';
import { ClosureStepComponent } from './steps/closure-step.component';
import { ServiceDeliveryStepComponent } from './steps/service-delivery-step.component';

/** Screen that means the agent also holds the RO (registration) role. */
const SCREEN_REGISTRATION = 'Registration';

/**
 * HAO (Health Assistant Officer) workspace — the main working area once the
 * inbound caller is identified (route `/innerpage/hao`).
 *
 * Replaces the legacy `104-hao` Bootstrap carousel-as-wizard with an Angular CDK
 * stepper: step 1 provides the service (the case sheet and the screen-gated
 * service tabs), step 2 closes the call. Wizard navigation that the legacy app
 * drove with imperative jQuery (`#myCarousel.carousel(n)`, `active-tab` toggles,
 * `#cancelLink/#closureLink` disabling) is now declarative — the footer buttons
 * drive {@link HaoStepperComponent} and the steps signal their outcomes back via
 * outputs.
 *
 * Reads the resolved `beneficiaryId` from the {@link CallStore} and passes it to
 * the service/closure steps; on close (or transfer) it ends the call and returns
 * to the dashboard.
 */
@Component({
  selector: 'app-hao-workspace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkStep,
    HaoStepperComponent,
    ServiceDeliveryStepComponent,
    ClosureStepComponent,
    ZardButtonComponent,
    TranslatePipe,
  ],
  template: `
    <section class="rounded-xl border border-border bg-card p-4 sm:p-6">
      <header class="mb-2 flex flex-col gap-1">
        <h1 class="text-lg font-semibold text-foreground">
          {{ 'hao.workspace.title' | translate: lang() }}
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ 'hao.workspace.subtitle' | translate: lang() }}
        </p>
      </header>

      <app-hao-stepper [linear]="true" (selectionChange)="stepIndex.set($event.selectedIndex)">
        <cdk-step [label]="'hao.workspace.stepService' | translate: lang()" [completed]="true">
          <app-hao-service-delivery-step
            [beneficiaryId]="beneficiaryId()"
            [callId]="callId()"
            [screens]="screens()"
            (serviceAvailed)="onServiceAvailed()"
          />
        </cdk-step>

        <cdk-step [label]="'hao.workspace.stepClosure' | translate: lang()">
          <app-hao-closure-step
            [serviceAvailed]="serviceAvailed()"
            (closed)="onCallClosed()"
            (continued)="onContinue()"
            (transferred)="onCallClosed()"
          />
        </cdk-step>
      </app-hao-stepper>

      <footer class="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        @if (showBackToRo()) {
          <button z-button type="button" zType="outline" (click)="backToRo()">
            {{ 'hao.workspace.backToRo' | translate: lang() }}
          </button>
        }
        <div class="ml-auto flex gap-3">
          @if (stepIndex() === 1) {
            <button z-button type="button" zType="outline" (click)="cancelToService()">
              {{ 'hao.workspace.cancel' | translate: lang() }}
            </button>
          } @else {
            <button z-button type="button" (click)="proceedToClosure()">
              {{ 'hao.workspace.proceedToClosure' | translate: lang() }}
            </button>
          }
        </div>
      </footer>
    </section>
  `,
})
export class HaoWorkspaceComponent {
  private readonly callStore = inject(CallStore);
  private readonly authStore = inject(AuthStore);
  private readonly callWrapup = inject(CallWrapupService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly lang = this.i18n.language;

  private readonly stepper = viewChild.required(HaoStepperComponent);

  /** Index of the active wizard step (0 = service, 1 = closure). */
  readonly stepIndex = signal(0);

  constructor() {
    // Idempotent: once stepIndex reaches 1 the guard stops re-issuing next().
    effect(() => {
      if (this.callWrapup.disconnectedByCaller() && this.stepIndex() !== 1) {
        this.stepper().next();
      }
    });
  }

  /** True once any service was saved during the call. */
  private readonly _serviceAvailed = signal(false);
  readonly serviceAvailed = this._serviceAvailed.asReadonly();

  readonly beneficiaryId = this.callStore.beneficiaryId;
  readonly callId = this.callStore.callId;

  /** Screen names granted to the agent on the 104 service. */
  readonly screens = computed(() => collectServiceScreens(this.authStore.privileges(), SERVICE_104));

  /** Show "Back to RO" when the agent also holds the registration role. */
  readonly showBackToRo = computed(() => this.screens().includes(SCREEN_REGISTRATION));

  /** Mark the call valid when a service is saved (legacy `serviceAvailed`). */
  onServiceAvailed(): void {
    this._serviceAvailed.set(true);
  }

  /** Move to the closure step after confirming (legacy "Close Call" button). */
  proceedToClosure(): void {
    this.confirmDialog
      .confirm({
        title: this.i18n.instant('hao.workspace.proceedTitle'),
        message: this.i18n.instant('hao.workspace.proceedConfirm'),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.stepper().next();
        }
      });
  }

  /** Return to the service step after confirming (legacy "Cancel" button). */
  cancelToService(): void {
    this.confirmDialog
      .confirm({
        title: this.i18n.instant('hao.workspace.cancelTitle'),
        message: this.i18n.instant('hao.workspace.cancelConfirm'),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.stepper().previous();
        }
      });
  }

  /** Closure recorded → end the call and return to the dashboard. */
  onCallClosed(): void {
    this.callStore.endCall();
    void this.router.navigate(['/dashboard']);
  }

  /** Submit & Continue → keep the call, reset to the service step. */
  onContinue(): void {
    this.stepper().previous();
  }

  /** Hand the call back to the RO (registration) workspace. */
  backToRo(): void {
    this.callStore.setBeneficiaryId(null);
    void this.router.navigate(['/innerpage']);
  }
}
