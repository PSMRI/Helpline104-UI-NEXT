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

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleHelp,
  lucideGlobe,
  lucidePower,
  lucideUser,
  lucideUsers,
} from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardDialogService } from '@common-ui/ui/dialog';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { EmergencyContactsDialogComponent } from './dialogs/emergency-contacts-dialog.component';

const FEEDBACK_ROUTE = '/feedback';
const SERVICE_104 = '104';
const APP_VERSION = '1.01';
const LICENSE_URL =
  'https://uatamrit.piramalswasthya.org/common-api/license.html';

/** Title alias: the HAO/RO hybrid role displays as "RO Dashboard". */
const TITLE_ROLE_ALIASES: Record<string, string> = { HAO: 'RO' };

/**
 * Top navigation bar: AMRIT branding, the centered "{role} Dashboard" title, a
 * language selector, the signed-in agent and the contacts / profile / help /
 * logout controls.
 */
@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, ZardButtonComponent, TranslatePipe],
  viewProviders: [
    provideIcons({
      lucideGlobe,
      lucideUser,
      lucideUsers,
      lucideCircleHelp,
      lucidePower,
    }),
  ],
  host: { '(document:click)': 'closeMenus()' },
  template: `
    <header
      class="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-primary px-4 py-2 text-primary-foreground sm:px-6"
    >
      <div class="flex items-center gap-2">
        <img
          class="h-9 w-auto rounded-sm bg-white p-1"
          src="images/piramal-swasthya.png"
          [alt]="'dashboard.header.logoAlt' | translate: lang()"
          width="120"
          height="55"
        />
      </div>

      <h1 class="text-center text-base font-semibold sm:text-lg">
        {{ roleTitle() }}
      </h1>

      <div class="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
        <label class="flex items-center gap-1.5 text-sm">
          <ng-icon name="lucideGlobe" size="18" aria-hidden="true" />
          <span class="sr-only">
            {{ 'dashboard.header.languageLabel' | translate: lang() }}
          </span>
          <select
            class="rounded-md border border-white/30 bg-primary px-2 py-1 text-sm text-primary-foreground focus:outline-none focus:ring-2 focus:ring-white/60"
            [value]="lang()"
            (change)="onLanguageChange($event)"
          >
            @for (option of languages; track option.code) {
              <option
                class="text-foreground"
                [value]="option.code"
                [selected]="option.code === lang()"
              >
                {{ option.label }}
              </option>
            }
          </select>
        </label>

        @if (user(); as u) {
          <span class="text-sm">
            {{ 'dashboard.header.welcome' | translate: lang() }} {{ u.userName }}
          </span>
        }

        <button
          z-button
          type="button"
          zType="ghost"
          zSize="sm"
          class="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
          [title]="'dashboard.header.contacts' | translate: lang()"
          [attr.aria-label]="'dashboard.header.contacts' | translate: lang()"
          (click)="openContacts()"
        >
          <ng-icon name="lucideUsers" size="18" aria-hidden="true" />
        </button>

        <div class="relative">
          <button
            z-button
            type="button"
            zType="ghost"
            zSize="sm"
            class="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
            [title]="'dashboard.header.profile' | translate: lang()"
            [attr.aria-label]="'dashboard.header.profile' | translate: lang()"
            [attr.aria-expanded]="profileOpen()"
            (click)="toggleProfile($event)"
          >
            <ng-icon name="lucideUser" size="18" aria-hidden="true" />
          </button>
          @if (profileOpen()) {
            <div
              class="absolute right-0 z-50 mt-1 w-56 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md"
            >
              <p class="flex items-center gap-2 text-sm font-medium">
                <ng-icon name="lucideUser" size="18" aria-hidden="true" />
                {{ user()?.userName }}
              </p>
              <p class="mt-1 text-xs text-muted-foreground">{{ profileId() }}</p>
            </div>
          }
        </div>

        <div class="relative">
          <button
            z-button
            type="button"
            zType="ghost"
            zSize="sm"
            class="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
            [title]="'dashboard.header.help' | translate: lang()"
            [attr.aria-label]="'dashboard.header.help' | translate: lang()"
            [attr.aria-expanded]="helpOpen()"
            (click)="toggleHelp($event)"
          >
            <ng-icon name="lucideCircleHelp" size="18" aria-hidden="true" />
          </button>
          @if (helpOpen()) {
            <div
              class="absolute right-0 z-50 mt-1 w-48 rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md"
            >
              <button
                type="button"
                class="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                (click)="showVersion()"
              >
                {{ 'dashboard.header.version' | translate: lang() }}
              </button>
              <a
                [href]="licenseUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              >
                {{ 'dashboard.header.licenseInfo' | translate: lang() }}
              </a>
            </div>
          }
        </div>

        <button
          z-button
          type="button"
          zType="ghost"
          zSize="sm"
          class="text-destructive hover:bg-white/15 hover:text-destructive"
          [title]="'dashboard.header.logout' | translate: lang()"
          [attr.aria-label]="'dashboard.header.logout' | translate: lang()"
          (click)="logout()"
        >
          <ng-icon name="lucidePower" size="18" aria-hidden="true" />
        </button>
      </div>
    </header>
  `,
})
export class DashboardHeaderComponent {
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly dialog = inject(ZardDialogService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly user = this.authStore.user;
  readonly lang = this.i18n.language;
  readonly languages = this.i18n.availableLanguages;
  readonly licenseUrl = LICENSE_URL;

  private readonly profileOpen_ = signal(false);
  private readonly helpOpen_ = signal(false);
  readonly profileOpen = this.profileOpen_.asReadonly();
  readonly helpOpen = this.helpOpen_.asReadonly();

  /** Role code for the title, e.g. "RO" for the HAO/RO hybrid role. */
  private readonly roleCode = computed(() => {
    const code = this.authStore.currentRole()?.featureCode ?? '';
    return TITLE_ROLE_ALIASES[code] ?? code;
  });

  /** Centered header title, e.g. "RO Dashboard". */
  readonly roleTitle = computed(() => {
    const suffix = this.i18n.instantFor(
      'dashboard.header.titleSuffix',
      this.lang(),
    );
    const code = this.roleCode();
    return code ? `${code} ${suffix}` : suffix;
  });

  /** Profile id line, e.g. "2145-HAO-104". */
  readonly profileId = computed(() => {
    const agentId = this.authStore.user()?.agentID;
    const feature = this.authStore.currentRole()?.featureCode;
    return [agentId, feature, SERVICE_104].filter(Boolean).join('-');
  });

  onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const code = select.value;
    if (this.i18n.isImplemented(code)) {
      this.i18n.setLanguage(code);
      return;
    }
    // Not yet translated: notify and revert the selection to the active language.
    const label =
      this.languages.find((option) => option.code === code)?.label ?? code;
    window.alert(
      `${this.i18n.instant('dashboard.header.languageComingSoon')} ${label}`,
    );
    select.value = this.lang();
  }

  toggleProfile(event: Event): void {
    event.stopPropagation();
    this.helpOpen_.set(false);
    this.profileOpen_.update((open) => !open);
  }

  toggleHelp(event: Event): void {
    event.stopPropagation();
    this.profileOpen_.set(false);
    this.helpOpen_.update((open) => !open);
  }

  closeMenus(): void {
    this.profileOpen_.set(false);
    this.helpOpen_.set(false);
  }

  showVersion(): void {
    this.confirmDialog
      .alert({
        title: this.i18n.instant('dashboard.header.version'),
        message: APP_VERSION,
        okText: this.i18n.instant('dashboard.dialog.ok'),
      })
      .subscribe();
  }

  openContacts(): void {
    this.dialog.create({
      zTitle: this.i18n.instant('dashboard.header.contacts'),
      zContent: EmergencyContactsDialogComponent,
      zHideFooter: true,
      zWidth: '32rem',
    });
  }

  logout(): void {
    this.authStore.clear();
    void this.router.navigate([FEEDBACK_ROUTE], { queryParams: { sl: '104' } });
  }
}
