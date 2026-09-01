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
import { HaoStepperComponent } from '../hao/hao-stepper.component';
import { ClosureStepComponent } from '../hao/steps/closure-step.component';
import { ServiceDeliveryStepComponent } from '../hao/steps/service-delivery-step.component';
import { SERVICE_104, collectServiceScreens } from './role-screens.util';

/**
 * SIO (Service Information Officer) on-call workspace (route `/innerpage/sio`).
 *
 * Ported from the legacy `104-sio`: a two-step wizard whose "provide service"
 * step is the screen-gated service catalogue (blood-on-call, epidemic, food
 * safety, grievance, organ donation, schemes, …) — the same
 * {@link ServiceDeliveryStepComponent} the HAO workspace uses, so the SIO role's
 * screens surface exactly its service tabs — followed by closure. The legacy
 * outbound worklist is a separate outbound-calling concern and is not included.
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only; the legacy
 * carousel-as-wizard is replaced by the declarative {@link HaoStepperComponent}.
 */
@Component({
  selector: 'app-sio-workspace',
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
          {{ 'roleWorkspace.sio.title' | translate: lang() }}
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ 'roleWorkspace.sio.subtitle' | translate: lang() }}
        </p>
      </header>

      <app-hao-stepper [linear]="true" (selectionChange)="stepIndex.set($event.selectedIndex)">
        <cdk-step [label]="'roleWorkspace.stepService' | translate: lang()" [completed]="true">
          <app-hao-service-delivery-step
            [beneficiaryId]="beneficiaryId()"
            [callId]="callId()"
            [screens]="screens()"
            [showAlwaysOnScreenings]="false"
            (serviceAvailed)="onServiceAvailed()"
          />
        </cdk-step>

        <cdk-step [label]="'roleWorkspace.stepClosure' | translate: lang()">
          <app-hao-closure-step
            [serviceAvailed]="serviceAvailed()"
            (closed)="onCallClosed()"
            (continued)="onContinue()"
            (transferred)="onCallClosed()"
          />
        </cdk-step>
      </app-hao-stepper>

      <footer class="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <div class="ml-auto flex gap-3">
          @if (stepIndex() === 1) {
            <button z-button type="button" zType="outline" (click)="cancelToService()">
              {{ 'roleWorkspace.cancel' | translate: lang() }}
            </button>
          } @else {
            <button z-button type="button" (click)="proceedToClosure()">
              {{ 'roleWorkspace.proceedToClosure' | translate: lang() }}
            </button>
          }
        </div>
      </footer>
    </section>
  `,
})
export class SioWorkspaceComponent {
  private readonly callStore = inject(CallStore);
  private readonly authStore = inject(AuthStore);
  private readonly callWrapup = inject(CallWrapupService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly lang = this.i18n.language;

  private readonly stepper = viewChild.required(HaoStepperComponent);

  readonly stepIndex = signal(0);

  constructor() {
    // Idempotent: once stepIndex reaches 1 the guard stops re-issuing next().
    effect(() => {
      if (this.callWrapup.disconnectedByCaller() && this.stepIndex() !== 1) {
        this.stepper().next();
      }
    });
  }

  private readonly _serviceAvailed = signal(false);
  readonly serviceAvailed = this._serviceAvailed.asReadonly();

  readonly beneficiaryId = this.callStore.beneficiaryId;
  readonly callId = this.callStore.callId;

  /** Screen names the SIO role holds on the 104 service; gates the tabs. */
  readonly screens = computed(() => collectServiceScreens(this.authStore.privileges(), SERVICE_104));

  onServiceAvailed(): void {
    this._serviceAvailed.set(true);
  }

  proceedToClosure(): void {
    this.confirmDialog
      .confirm({
        title: this.i18n.instant('roleWorkspace.proceedTitle'),
        message: this.i18n.instant('roleWorkspace.proceedConfirm'),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.stepper().next();
        }
      });
  }

  cancelToService(): void {
    this.confirmDialog
      .confirm({
        title: this.i18n.instant('roleWorkspace.cancelTitle'),
        message: this.i18n.instant('roleWorkspace.cancelConfirm'),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.stepper().previous();
        }
      });
  }

  onCallClosed(): void {
    this.callStore.endCall();
    void this.router.navigate(['/dashboard']);
  }

  onContinue(): void {
    this.stepper().previous();
  }
}
