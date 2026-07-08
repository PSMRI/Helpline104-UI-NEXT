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
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import type { TranslationKey } from '../../../core/i18n/locales';
import { BloodOnCallComponent } from '../blood-on-call/blood-on-call.component';
import { EpidemicOutbreakComponent } from '../epidemic-outbreak/epidemic-outbreak.component';
import { FoodSafetyComponent } from '../food-safety/food-safety.component';
import { GrievanceServiceComponent } from '../grievance/grievance.component';
import { OrganDonationComponent } from '../organ-donation/organ-donation.component';
import { SchemeServiceComponent } from '../scheme/scheme.component';
import { ImrMmrComponent } from '../imr-mmr/imr-mmr.component';
import { BalVivahComponent } from '../bal-vivah/bal-vivah.component';
import { SioServicesHistoryComponent } from './sio-services-history.component';

/** Stable identifiers for the SIO service catalogue tabs. */
type SioTabId =
  | 'grievance'
  | 'bloodOnCall'
  | 'epidemic'
  | 'foodSafety'
  | 'organDonation'
  | 'schemes'
  | 'imrMmr'
  | 'balVivah'
  | 'history';

/** One catalogue tab; `requiresScreen` gates it (null = always shown). */
interface SioTab {
  readonly id: SioTabId;
  readonly labelKey: TranslationKey;
  readonly requiresScreen: string | null;
}

/**
 * The SIO service catalogue, in the legacy `sio-services` order. Screen-gated
 * tabs mirror the legacy `screens.includes(...)` guards on the `<md-tab-group>`;
 * the History tab is always available.
 */
const SIO_TABS: readonly SioTab[] = [
  { id: 'grievance', labelKey: 'sio.grievance.title', requiresScreen: 'Grievance' },
  { id: 'bloodOnCall', labelKey: 'sio.blood.title', requiresScreen: 'Blood Request' },
  { id: 'epidemic', labelKey: 'sio.epidemic.title', requiresScreen: 'Epidemic Outbreak Service' },
  { id: 'foodSafety', labelKey: 'sio.food.title', requiresScreen: 'Food safety' },
  { id: 'organDonation', labelKey: 'sio.organ.title', requiresScreen: 'Organ Donation' },
  { id: 'schemes', labelKey: 'sio.scheme.title', requiresScreen: 'Health schemes' },
  { id: 'imrMmr', labelKey: 'sio.imrMmr.title', requiresScreen: 'IMR MMR Information' },
  { id: 'balVivah', labelKey: 'sio.balVivah.title', requiresScreen: 'Bal Vivah' },
  { id: 'history', labelKey: 'sio.services.tabHistory', requiresScreen: null },
];

/**
 * SIO services catalogue — a signal-driven tab strip hosting the individual SIO
 * service tabs (grievance, blood-on-call, epidemic, food safety, organ
 * donation, schemes, IMR/MMR, bal vivah) plus a consolidated history tab.
 * Tab availability is derived from the role's {@link screens}.
 *
 * Ported from the legacy `SioServicesComponent` (`<md-tab-group>` +
 * `screens.includes(...)`); the jQuery tab switching is replaced by a signal.
 * Standalone, OnPush + signals, ZardUI + Tailwind only. Each child reads the
 * live call from the CallStore, so only the screen list is passed in.
 */
@Component({
  selector: 'app-sio-services',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    BloodOnCallComponent,
    EpidemicOutbreakComponent,
    FoodSafetyComponent,
    GrievanceServiceComponent,
    OrganDonationComponent,
    SchemeServiceComponent,
    ImrMmrComponent,
    BalVivahComponent,
    SioServicesHistoryComponent,
  ],
  template: `
    <div class="flex flex-col gap-4">
      <div
        class="flex flex-wrap gap-2 border-b border-border pb-2"
        role="tablist"
        [attr.aria-label]="'sio.services.title' | translate: lang()"
      >
        @for (tab of visibleTabs(); track tab.id) {
          <button
            type="button"
            role="tab"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            [class.bg-primary]="tab.id === activeTabId()"
            [class.text-primary-foreground]="tab.id === activeTabId()"
            [class.text-muted-foreground]="tab.id !== activeTabId()"
            [class.hover:bg-muted]="tab.id !== activeTabId()"
            [attr.aria-selected]="tab.id === activeTabId()"
            (click)="selectTab(tab.id)"
          >
            {{ tab.labelKey | translate: lang() }}
          </button>
        }
      </div>

      <div role="tabpanel">
        @switch (activeTabId()) {
          @case ('grievance') {
            <app-sio-grievance (serviceProvided)="serviceProvided.emit()" />
          }
          @case ('bloodOnCall') {
            <app-sio-blood-on-call (serviceProvided)="serviceProvided.emit()" />
          }
          @case ('epidemic') {
            <app-sio-epidemic-outbreak (serviceProvided)="serviceProvided.emit()" />
          }
          @case ('foodSafety') {
            <app-sio-food-safety (serviceProvided)="serviceProvided.emit()" />
          }
          @case ('organDonation') {
            <app-sio-organ-donation (serviceProvided)="serviceProvided.emit()" />
          }
          @case ('schemes') {
            <app-sio-scheme (serviceProvided)="serviceProvided.emit()" />
          }
          @case ('imrMmr') {
            <app-sio-imr-mmr (serviceProvided)="serviceProvided.emit()" />
          }
          @case ('balVivah') {
            <app-sio-bal-vivah (serviceProvided)="serviceProvided.emit()" />
          }
          @case ('history') {
            <app-sio-services-history />
          }
        }
      </div>
    </div>
  `,
})
export class SioServicesComponent {
  private readonly i18n = inject(I18nService);
  readonly lang = this.i18n.language;

  /** Screen names the current role holds; gates the optional service tabs. */
  readonly screens = input<readonly string[]>([]);

  /** Emitted whenever a hosted service is successfully saved (marks call valid). */
  readonly serviceProvided = output<void>();

  private readonly _activeTabId = signal<SioTabId>('grievance');

  /** Tabs visible for the current role (screen-gated + the always-on history). */
  readonly visibleTabs = computed(() => {
    const granted = new Set(this.screens());
    return SIO_TABS.filter((tab) => tab.requiresScreen === null || granted.has(tab.requiresScreen));
  });

  /** Effective active tab, clamped to {@link visibleTabs}. */
  readonly activeTabId = computed<SioTabId>(() => {
    const visible = this.visibleTabs();
    const selected = this._activeTabId();
    if (visible.some((tab) => tab.id === selected)) {
      return selected;
    }
    return visible[0]?.id ?? 'history';
  });

  selectTab(id: SioTabId): void {
    this._activeTabId.set(id);
  }
}
