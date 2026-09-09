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
import { ChangeDetectionStrategy, Component, OnInit, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { TranslationKey } from '../../core/i18n/locales';
import { CallStore } from '../call.store';
import { CallWrapupService } from '../call-wrapup.service';
import { HihlCaseSheetComponent } from '../counsellor/hihl-case-sheet.component';
import { HaoStepperComponent } from '../hao/hao-stepper.component';
import { CaseSheetComponent } from '../hao/steps/case-sheet.component';
import { ClosureStepComponent } from '../hao/steps/closure-step.component';

/** Which service-step tab is active, when {@link RoleWorkspaceComponent.showHihlTab} is set (CO / Counsellor only). */
type ServiceTab = 'caseSheet' | 'hihl';

/**
 * Shared shell for the single-case-sheet role workspaces (MO / CO / Counsellor).
 *
 * These roles differ from HAO only in that they provide a single advisory case
 * sheet rather than the full `<md-tab-group>` service catalogue. Structurally
 * they are the same two-step wizard the legacy `104-mo` / `104-co` /
 * `104-counsellor` carousels drove with jQuery: step 1 records the case sheet,
 * step 2 closes the call. Navigation is declarative via {@link HaoStepperComponent}.
 *
 * Title/subtitle are inputs so each role component supplies its own labels; an
 * optional role-switch action (e.g. MO → CO, the legacy `roleChanged`) is
 * surfaced via {@link switchRole}. Reads `beneficiaryId`/`callId` from the
 * {@link CallStore}; on close (or transfer) it ends the call and returns to the
 * dashboard.
 *
 * Counselling roles set {@link requireConsent}: the beneficiary-consent script
 * (legacy `104-consent` dialog, auto-opened by `104-co` with `disableClose`) is
 * read to the caller before counselling starts. Declining jumps straight to the
 * closure step, and returning to the case sheet without consent re-opens the
 * dialog — the legacy `consentGranted` gate.
 */
@Component({
  selector: 'app-role-workspace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkStep,
    HaoStepperComponent,
    CaseSheetComponent,
    ClosureStepComponent,
    HihlCaseSheetComponent,
    ZardButtonComponent,
    TranslatePipe,
  ],
  template: `
    <section class="rounded-xl border border-border bg-card p-4 sm:p-6">
      <header class="mb-2 flex flex-col gap-1">
        <h1 class="text-lg font-semibold text-foreground">{{ titleKey() | translate: lang() }}</h1>
        <p class="text-sm text-muted-foreground">{{ subtitleKey() | translate: lang() }}</p>
      </header>

      <app-hao-stepper [linear]="true" (selectionChange)="stepIndex.set($event.selectedIndex)">
        <cdk-step [label]="'roleWorkspace.stepService' | translate: lang()" [completed]="true">
          @if (showHihlTab()) {
            <div class="mb-4 flex gap-2 border-b border-border" role="tablist">
              <button
                type="button"
                role="tab"
                class="border-b-2 px-3 py-2 text-sm font-medium"
                [class.border-primary]="serviceTab() === 'caseSheet'"
                [class.text-foreground]="serviceTab() === 'caseSheet'"
                [class.border-transparent]="serviceTab() !== 'caseSheet'"
                [class.text-muted-foreground]="serviceTab() !== 'caseSheet'"
                [attr.aria-selected]="serviceTab() === 'caseSheet'"
                (click)="serviceTab.set('caseSheet')"
              >
                {{ 'roleWorkspace.counsellingSheetTab' | translate: lang() }}
              </button>
              <button
                type="button"
                role="tab"
                class="border-b-2 px-3 py-2 text-sm font-medium"
                [class.border-primary]="serviceTab() === 'hihl'"
                [class.text-foreground]="serviceTab() === 'hihl'"
                [class.border-transparent]="serviceTab() !== 'hihl'"
                [class.text-muted-foreground]="serviceTab() !== 'hihl'"
                [attr.aria-selected]="serviceTab() === 'hihl'"
                (click)="serviceTab.set('hihl')"
              >
                {{ 'roleWorkspace.hihlCaseSheetTab' | translate: lang() }}
              </button>
            </div>
          }

          @if (!showHihlTab() || serviceTab() === 'caseSheet') {
            <app-hao-case-sheet
              [beneficiaryId]="beneficiaryId()"
              [callId]="callId()"
              (serviceAvailed)="onServiceAvailed()"
            />
          }
          @if (showHihlTab() && serviceTab() === 'hihl') {
            <app-hihl-case-sheet [beneficiaryId]="beneficiaryId()" [callId]="callId()" />
          }
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
        @if (showSwitchRole() && switchRoleLabelKey(); as labelKey) {
          <button z-button type="button" zType="outline" (click)="switchRole.emit()">
            {{ labelKey | translate: lang() }}
          </button>
        }
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
export class RoleWorkspaceComponent implements OnInit {
  private readonly callStore = inject(CallStore);
  private readonly callWrapup = inject(CallWrapupService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly lang = this.i18n.language;

  /** Workspace heading / subheading translation keys (supplied per role). */
  readonly titleKey = input.required<TranslationKey>();
  readonly subtitleKey = input.required<TranslationKey>();
  /** Show the optional role-switch action (e.g. MO → CO). */
  readonly showSwitchRole = input(false);
  /** Label for the role-switch action; required when {@link showSwitchRole}. */
  readonly switchRoleLabelKey = input<TranslationKey | null>(null);
  /** Read the beneficiary-consent script before counselling (CO / Counsellor). */
  readonly requireConsent = input(false);
  /** Show the Counselling Sheet / Detailed HIHL case sheet tab strip (legacy `104-co` tab 2, Counsellor only). */
  readonly showHihlTab = input(false);

  /** Emitted when the agent triggers the role switch. */
  readonly switchRole = output<void>();

  private readonly stepper = viewChild.required(HaoStepperComponent);

  /** Active wizard step (0 = case sheet, 1 = closure). */
  readonly stepIndex = signal(0);

  /** Active service-step tab, when {@link showHihlTab} is set. */
  readonly serviceTab = signal<ServiceTab>('caseSheet');

  private readonly _serviceAvailed = signal(false);
  readonly serviceAvailed = this._serviceAvailed.asReadonly();

  /** True once the caller agreed to the consent terms (legacy `consentGranted`). */
  private readonly consentGranted = signal(false);

  readonly beneficiaryId = this.callStore.beneficiaryId;
  readonly callId = this.callStore.callId;

  constructor() {
    // Idempotent: once stepIndex reaches 1 the guard stops re-issuing next().
    effect(() => {
      if (this.callWrapup.disconnectedByCaller() && this.stepIndex() !== 1) {
        this.stepper().next();
      }
    });
  }

  ngOnInit(): void {
    if (this.requireConsent()) {
      this.openConsent();
    }
  }

  /**
   * Read the consent script and record the caller's answer (legacy
   * `openConsent`). Declining moves the wizard to the closure step so the
   * agent can only close the call, mirroring `closeCallIfConsentNotProvided`.
   */
  private openConsent(): void {
    this.confirmDialog
      .confirm({
        title: this.i18n.instant('consent.title'),
        message: this.i18n.instant('consent.message'),
        okText: this.i18n.instant('consent.yes'),
        cancelText: this.i18n.instant('consent.no'),
        width: '36rem',
        status: 'info',
      })
      .subscribe((granted) => {
        this.consentGranted.set(granted);
        if (!granted && this.stepIndex() === 0) {
          this.stepper().next();
        }
      });
  }

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
        status: 'info',
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
        status: 'info',
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.stepper().previous();
          // Back on the case sheet without consent → ask again (legacy
          // `openDialog` re-opened the consent while `consentGranted` was false).
          if (this.requireConsent() && !this.consentGranted()) {
            this.openConsent();
          }
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
