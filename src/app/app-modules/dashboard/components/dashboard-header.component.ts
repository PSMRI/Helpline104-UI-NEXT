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

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideGlobe, lucideLogOut, lucideUser } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { AuthStore } from '../../core/auth/auth.store';
import { LOGIN_ROUTE } from '../../core/core.constants';
import { I18nService } from '../../core/i18n/i18n.service';
import { Language } from '../../core/i18n/i18n.types';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ConfirmationService } from '../../core/services/confirmation.service';

/**
 * Top navigation bar: AMRIT branding, the active service/role, a language
 * selector, the signed-in agent (profile), and logout.
 */
@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, ZardButtonComponent, TranslatePipe],
  viewProviders: [provideIcons({ lucideGlobe, lucideLogOut, lucideUser })],
  template: `
    <header
      class="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-primary px-4 py-3 text-primary-foreground sm:px-6"
    >
      <div class="flex items-center gap-3">
        <img
          class="h-9 w-auto rounded-sm bg-white p-1"
          src="images/piramal-swasthya.png"
          [alt]="'dashboard.header.logoAlt' | translate: lang()"
          width="120"
          height="55"
        />
        <span class="text-base font-semibold sm:text-lg">
          {{ 'dashboard.header.appName' | translate: lang() }}
        </span>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
        @if (currentRole(); as role) {
          <dl class="flex items-center gap-x-5 text-sm">
            @if (role.serviceName) {
              <div class="flex items-center gap-1.5">
                <dt class="opacity-80">
                  {{ 'dashboard.header.service' | translate: lang() }}:
                </dt>
                <dd class="font-medium">{{ role.serviceName }}</dd>
              </div>
            }
            @if (role.roleName) {
              <div class="flex items-center gap-1.5">
                <dt class="opacity-80">
                  {{ 'dashboard.header.role' | translate: lang() }}:
                </dt>
                <dd class="font-medium">{{ role.roleName }}</dd>
              </div>
            }
          </dl>
        }

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
              <option class="text-foreground" [value]="option.code">
                {{ option.label }}
              </option>
            }
          </select>
        </label>

        @if (user(); as u) {
          <span class="flex items-center gap-1.5 text-sm">
            <ng-icon name="lucideUser" size="18" aria-hidden="true" />
            <span class="opacity-80">
              {{ 'dashboard.header.welcome' | translate: lang() }}
            </span>
            <span class="font-medium">{{ u.userName }}</span>
          </span>
        }

        <button
          z-button
          type="button"
          zType="ghost"
          zSize="sm"
          class="text-primary-foreground hover:bg-white/15"
          (click)="logout()"
        >
          <ng-icon name="lucideLogOut" size="18" aria-hidden="true" />
          {{ 'dashboard.header.logout' | translate: lang() }}
        </button>
      </div>
    </header>
  `,
})
export class DashboardHeaderComponent {
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);

  readonly user = this.authStore.user;
  readonly currentRole = this.authStore.currentRole;
  readonly lang = this.i18n.language;
  readonly languages = this.i18n.availableLanguages;

  onLanguageChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as Language;
    this.i18n.setLanguage(value);
  }

  logout(): void {
    const confirmed = this.confirmation.confirm(
      this.i18n.instant('dashboard.header.logoutConfirm'),
    );
    if (!confirmed) {
      return;
    }
    this.authStore.clear();
    void this.router.navigate([LOGIN_ROUTE]);
  }
}
