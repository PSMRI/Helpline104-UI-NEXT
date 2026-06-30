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
import { HaoScreenName, HaoServiceId } from '../hao.models';
import { CaseSheetComponent } from './case-sheet.component';

/** Describes one selectable service tab and how it is gated. */
interface ServiceTab {
  readonly id: HaoServiceId;
  readonly labelKey: TranslationKey;
  /**
   * Screen that must be present for the tab to show; `null` means always shown
   * (the three screenings the legacy `<md-tab-group>` rendered unconditionally).
   */
  readonly requiresScreen: HaoScreenName | null;
}

/**
 * The full service catalogue, in the legacy `<md-tab-group>` order. Health
 * Advisory (the case sheet) is the primary tab; the diabetic and BP screenings
 * are always shown; the rest are gated by the role's screens.
 */
const SERVICE_TABS: readonly ServiceTab[] = [
  { id: 'healthAdvice', labelKey: 'hao.service.healthAdvisory', requiresScreen: 'Health_Advice' },
  { id: 'diabeticScreening', labelKey: 'hao.service.diabeticScreening', requiresScreen: null },
  { id: 'bpScreening', labelKey: 'hao.service.bpScreening', requiresScreen: null },
  { id: 'bloodOnCall', labelKey: 'hao.service.bloodOnCall', requiresScreen: 'Blood Request' },
  { id: 'directory', labelKey: 'hao.service.directory', requiresScreen: 'Directory Information Service' },
  { id: 'epidemic', labelKey: 'hao.service.epidemic', requiresScreen: 'Epidemic Outbreak Service' },
  { id: 'foodSafety', labelKey: 'hao.service.foodSafety', requiresScreen: 'Food safety' },
  { id: 'grievance', labelKey: 'hao.service.grievance', requiresScreen: 'Grievance' },
  { id: 'organDonation', labelKey: 'hao.service.organDonation', requiresScreen: 'Organ Donation' },
  { id: 'schemes', labelKey: 'hao.service.schemes', requiresScreen: 'Health schemes' },
  { id: 'covid19', labelKey: 'hao.service.covid19', requiresScreen: 'Covid19 for 104 services' },
  { id: 'imrMmr', labelKey: 'hao.service.imrMmr', requiresScreen: 'IMR MMR Information' },
  { id: 'balVivah', labelKey: 'hao.service.balVivah', requiresScreen: 'Bal Vivah' },
];

/**
 * "Provide Service" step of the HAO workspace (legacy carousel slide 0 — the
 * `<md-tab-group>` of services). Renders a signal-driven tab strip; the Health
 * Advisory tab hosts the case sheet, the remaining service tabs are migrated
 * separately and currently show a placeholder.
 *
 * The legacy jQuery `active-tab` class toggling is gone — the active tab is a
 * signal, and tab availability is derived from the role's {@link screens}.
 */
@Component({
  selector: 'app-hao-service-delivery-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, CaseSheetComponent],
  template: `
    <div class="flex flex-col gap-4">
      <div
        class="flex flex-wrap gap-2 border-b border-border pb-2"
        role="tablist"
        [attr.aria-label]="'hao.service.tablistLabel' | translate: lang()"
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

      <div role="tabpanel" class="min-h-[18rem]">
        @if (activeTabId() === 'healthAdvice') {
          <app-hao-case-sheet
            [beneficiaryId]="beneficiaryId()"
            [callId]="callId()"
            (serviceAvailed)="serviceAvailed.emit()"
          />
        } @else {
          <div
            class="flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-10 text-center"
          >
            <p class="text-base font-medium text-foreground">
              {{ activeTabLabelKey() | translate: lang() }}
            </p>
            <p class="max-w-md text-sm text-muted-foreground">
              {{ 'hao.service.comingSoon' | translate: lang() }}
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export class ServiceDeliveryStepComponent {
  private readonly i18n = inject(I18nService);
  readonly lang = this.i18n.language;

  /** Beneficiary the services are recorded against (from the CallStore). */
  readonly beneficiaryId = input<number | null>(null);
  /** AMRIT call id for the active call. */
  readonly callId = input<string | null>(null);
  /** Screen names the current role holds; gates the optional service tabs. */
  readonly screens = input<readonly string[]>([]);

  /** Emitted whenever a service is successfully saved (marks the call valid). */
  readonly serviceAvailed = output<void>();

  /** The agent's raw tab choice; may not be visible for the current role. */
  private readonly _activeTabId = signal<HaoServiceId>('healthAdvice');

  /** Tabs visible for the current role (always-on screenings + granted screens). */
  readonly visibleTabs = computed(() => {
    const granted = new Set(this.screens());
    return SERVICE_TABS.filter(
      (tab) => tab.requiresScreen === null || granted.has(tab.requiresScreen),
    );
  });

  /**
   * The effective active tab, clamped to {@link visibleTabs}. The default
   * ('healthAdvice') is filtered out for roles without the Health_Advice screen,
   * so fall back to the first visible tab — never leave a hidden tab "selected"
   * (which would show its panel with no matching tab in the strip).
   */
  readonly activeTabId = computed<HaoServiceId>(() => {
    const visible = this.visibleTabs();
    const selected = this._activeTabId();
    if (visible.some((tab) => tab.id === selected)) {
      return selected;
    }
    return visible[0]?.id ?? selected;
  });

  /** Label key of the active tab, for the placeholder heading. */
  readonly activeTabLabelKey = computed<TranslationKey>(() => {
    const active = this.activeTabId();
    return (
      SERVICE_TABS.find((tab) => tab.id === active)?.labelKey ??
      'hao.service.healthAdvisory'
    );
  });

  selectTab(id: HaoServiceId): void {
    this._activeTabId.set(id);
  }
}
