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
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { TranslationKey } from '../../core/i18n/locales';
import { DirectoryServicesComponent } from '../directory/directory-services.component';
import { BloodOnCallComponent } from '../sio/blood-on-call/blood-on-call.component';
import { EpidemicOutbreakComponent } from '../sio/epidemic-outbreak/epidemic-outbreak.component';
import { FoodSafetyComponent } from '../sio/food-safety/food-safety.component';
import { GrievanceServiceComponent } from '../sio/grievance/grievance.component';
import { OrganDonationComponent } from '../sio/organ-donation/organ-donation.component';
import { SchemeServiceComponent } from '../sio/scheme/scheme.component';
import { CallStore } from '../call.store';
import { LEGACY_BLUE_BUTTON } from '../legacy-theme';
import { CallWrapupService } from '../call-wrapup.service';
import { HihlCaseSheetComponent } from '../counsellor/hihl-case-sheet.component';
import { HaoStepperComponent } from '../hao/hao-stepper.component';
import { CaseSheetComponent } from '../hao/steps/case-sheet.component';
import { ClosureStepComponent } from '../hao/steps/closure-step.component';
import { HasUnsavedChanges } from '../unsaved-changes.guard';
import { SERVICE_104, collectServiceScreens } from './role-screens.util';

/** Which service-step tab is active — the case sheet, the HIHL tab ({@link RoleWorkspaceComponent.showHihlTab}), or one of CO's SIO service tabs ({@link RoleWorkspaceComponent.showSioTabs}). */
type ServiceTab =
  | 'caseSheet'
  | 'hihl'
  | 'bloodOnCall'
  | 'directory'
  | 'epidemic'
  | 'foodSafety'
  | 'grievance'
  | 'organDonation'
  | 'schemes';

/** One tab in the {@link RoleWorkspaceComponent.visibleTabs} strip. */
interface WorkspaceTab {
  readonly id: ServiceTab;
  readonly labelKey: TranslationKey;
}

/**
 * CO's extra service tabs (legacy `104-co.component.html` tabs 3-9), gated by
 * the same screen names the HAO service catalogue uses — a CO agent only sees
 * the services their privileges actually grant.
 */
const CO_SERVICE_TABS: ReadonlyArray<WorkspaceTab & { readonly requiresScreen: string }> = [
  { id: 'bloodOnCall', labelKey: 'hao.service.bloodOnCall', requiresScreen: 'Blood Request' },
  { id: 'directory', labelKey: 'hao.service.directory', requiresScreen: 'Directory Information Service' },
  { id: 'epidemic', labelKey: 'hao.service.epidemic', requiresScreen: 'Epidemic Outbreak Service' },
  { id: 'foodSafety', labelKey: 'hao.service.foodSafety', requiresScreen: 'Food safety' },
  { id: 'grievance', labelKey: 'hao.service.grievance', requiresScreen: 'Grievance' },
  { id: 'organDonation', labelKey: 'hao.service.organDonation', requiresScreen: 'Organ Donation' },
  { id: 'schemes', labelKey: 'hao.service.schemes', requiresScreen: 'Health schemes' },
];

/**
 * Shared shell for the single-case-sheet role workspaces (MO / CO).
 *
 * Structurally these are the same two-step wizard the legacy `104-mo` /
 * `104-co` carousels drove with jQuery: step 1 records the case sheet, step 2
 * closes the call. Navigation is declarative via {@link HaoStepperComponent}.
 * CO additionally gets a full tab strip on step 1 ({@link showHihlTab},
 * {@link showSioTabs}) — legacy's `104-co` embeds the "Detailed HIHL" case
 * sheet and the SIO service catalogue (Blood on Call, Directory, Epidemic,
 * Food Safety, Grievance, Organ Donation, Health Schemes) as tabs directly on
 * the CO screen; there is no separate "Counsellor" role in legacy.
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
    DirectoryServicesComponent,
    BloodOnCallComponent,
    EpidemicOutbreakComponent,
    FoodSafetyComponent,
    GrievanceServiceComponent,
    OrganDonationComponent,
    SchemeServiceComponent,
    ZardButtonComponent,
    TranslatePipe,
  ],
  template: `
    <section class="rounded-xl border border-border bg-card p-4 sm:p-6">
      <!-- Legacy shows no workspace title or subtitle above the stepper: the
           role is already in the page chrome, and the card starts at the
           stepper (104-mo.component.html). Title kept for the a11y label. -->
      <h1 class="sr-only">{{ titleKey() | translate: lang() }}</h1>

      <app-hao-stepper [linear]="true" (selectionChange)="stepIndex.set($event.selectedIndex)">
        <cdk-step [label]="'roleWorkspace.stepService' | translate: lang()" [completed]="true">
          @if (visibleTabs().length > 1) {
            <div class="mb-4 flex flex-wrap gap-2 border-b border-border" role="tablist">
              @for (tab of visibleTabs(); track tab.id) {
                <button
                  type="button"
                  role="tab"
                  class="border-b-2 px-3 py-2 text-sm font-medium"
                  [class.border-primary]="activeTab() === tab.id"
                  [class.text-foreground]="activeTab() === tab.id"
                  [class.border-transparent]="activeTab() !== tab.id"
                  [class.text-muted-foreground]="activeTab() !== tab.id"
                  [attr.aria-selected]="activeTab() === tab.id"
                  (click)="serviceTab.set(tab.id)"
                >
                  {{ tab.labelKey | translate: lang() }}
                </button>
              }
            </div>
          }

          @switch (activeTab()) {
            @case ('hihl') {
              <app-hihl-case-sheet [beneficiaryId]="beneficiaryId()" [callId]="callId()" />
            }
            @case ('bloodOnCall') {
              <app-sio-blood-on-call (serviceProvided)="onServiceAvailed()" />
            }
            @case ('directory') {
              <app-directory-services (serviceProvided)="onServiceAvailed()" />
            }
            @case ('epidemic') {
              <app-sio-epidemic-outbreak (serviceProvided)="onServiceAvailed()" />
            }
            @case ('foodSafety') {
              <app-sio-food-safety (serviceProvided)="onServiceAvailed()" />
            }
            @case ('grievance') {
              <app-sio-grievance (serviceProvided)="onServiceAvailed()" />
            }
            @case ('organDonation') {
              <app-sio-organ-donation (serviceProvided)="onServiceAvailed()" />
            }
            @case ('schemes') {
              <app-sio-scheme (serviceProvided)="onServiceAvailed()" />
            }
            @case ('caseSheet') {
              <app-hao-case-sheet
                [beneficiaryId]="beneficiaryId()"
                [callId]="callId()"
                (serviceAvailed)="onServiceAvailed()"
              />
            }
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

      <!-- Legacy centres this Cancel/Closure pair under the card rather than
           pushing them to opposite edges (104 MO screenshots). -->
      <footer class="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-border pt-4">
        <!-- Legacy's footer is a single Cancel/Closure navigation pair: Cancel
             steps back to the case sheet and is disabled there, Closure steps
             forward and is disabled on the closure step
             (104-co.component.html:74-75, toggled in 104-co.component.ts:
             184-185/201-202). Rendering a second "cancel the whole call"
             action beside it put two identically-labelled buttons side by
             side, one of which discarded the beneficiary. -->
        <button
          z-button
          type="button"
          zType="outline"
          [zDisabled]="stepIndex() === 0"
          (click)="cancelToService()"
        >
          {{ 'roleWorkspace.cancel' | translate: lang() }}
        </button>
        @if (showSwitchRole() && switchRoleLabelKey(); as labelKey) {
          <button z-button type="button" zType="outline" (click)="switchRole.emit()">
            {{ labelKey | translate: lang() }}
          </button>
        }
        <button
          z-button
          type="button"
          [class]="legacyBlue"
          [zDisabled]="stepIndex() === 1"
          (click)="proceedToClosure()"
        >
          {{ 'roleWorkspace.proceedToClosure' | translate: lang() }}
        </button>
      </footer>
    </section>
  `,
})
export class RoleWorkspaceComponent implements OnInit, HasUnsavedChanges {
  private readonly callStore = inject(CallStore);

  /** Legacy's blue primary action (see legacy-theme.ts). */
  readonly legacyBlue = LEGACY_BLUE_BUTTON;
  private readonly authStore = inject(AuthStore);
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
  /** Show the Counselling Sheet / Detailed HIHL case sheet tab (legacy `104-co` tab 2). */
  readonly showHihlTab = input(false);
  /** Show CO's screen-gated SIO service tabs (legacy `104-co` tabs 3-9). */
  readonly showSioTabs = input(false);

  /** Emitted when the agent triggers the role switch. */
  readonly switchRole = output<void>();

  private readonly stepper = viewChild.required(HaoStepperComponent);

  /** Active wizard step (0 = case sheet, 1 = closure). */
  readonly stepIndex = signal(0);

  /** Screen names the current role holds on the 104 service; gates the SIO tabs. */
  private readonly screens = computed(() => collectServiceScreens(this.authStore.privileges(), SERVICE_104));

  /** The tabs to render above the service step: case sheet, plus HIHL/SIO tabs when enabled. */
  readonly visibleTabs = computed<readonly WorkspaceTab[]>(() => {
    const tabs: WorkspaceTab[] = [{ id: 'caseSheet', labelKey: 'roleWorkspace.counsellingSheetTab' }];
    if (this.showHihlTab()) {
      tabs.push({ id: 'hihl', labelKey: 'roleWorkspace.hihlCaseSheetTab' });
    }
    if (this.showSioTabs()) {
      const granted = new Set(this.screens());
      tabs.push(...CO_SERVICE_TABS.filter((tab) => granted.has(tab.requiresScreen)));
    }
    return tabs;
  });

  /** The agent's raw tab choice; may not be visible for the current role. */
  readonly serviceTab = signal<ServiceTab>('caseSheet');

  /** The effective active tab, clamped to {@link visibleTabs} (never a hidden tab). */
  readonly activeTab = computed<ServiceTab>(() => {
    const visible = this.visibleTabs();
    const selected = this.serviceTab();
    if (visible.some((tab) => tab.id === selected)) {
      return selected;
    }
    return visible[0]?.id ?? selected;
  });

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

  hasUnsavedChanges(): boolean {
    return this.stepIndex() === 0 && !this.serviceAvailed();
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
