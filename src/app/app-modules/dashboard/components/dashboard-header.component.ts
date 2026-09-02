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

import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleHelp, lucidePhone, lucidePower, lucideUser } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardDialogService } from '@common-ui/ui/dialog';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';
import { AppHeaderComponent } from '@/shared/components/layout/app-header.component';

import { APP_VERSION } from '../../core/app-version';
import { AuthStore } from '../../core/auth/auth.store';
import { ConfigService } from '../../core/services/config.service';
import { CzentrixService } from '../../core/services/czentrix.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { SessionStorageService } from '../../core/services/session-storage.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { EmergencyContactsViewComponent } from '../../call/emergency-contacts/emergency-contacts-view.component';

const FEEDBACK_ROUTE = '/feedback';
const SERVICE_104 = '104';
/** Relative to {@link ConfigService.getCommonBaseURLLicense}. */
const LICENSE_PATH = 'license.html';

/** Title aliases — empty: each role displays its own code (HAO shows as HAO Dashboard). */
const TITLE_ROLE_ALIASES: Record<string, string> = {};

/**
 * Top navigation bar: AMRIT branding, the centered "{role} Dashboard" title, a
 * language selector, the signed-in agent and the contacts / profile / help /
 * logout controls.
 */
@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, ZardButtonComponent, TranslatePipe, AppHeaderComponent],
  viewProviders: [
    provideIcons({
      lucidePhone,
      lucideUser,
      lucideCircleHelp,
      lucidePower,
    }),
  ],
  host: { '(document:click)': 'closeMenus()', '(document:keydown.escape)': 'onEscape()' },
  template: `
    <app-shell-header [title]="roleTitle()" [userName]="user()?.userName ?? null">
      <div class="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
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
          <ng-icon name="lucidePhone" size="18" aria-hidden="true" />
        </button>

        <div class="relative">
          <button
            #profileTrigger
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
            #helpTrigger
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
              role="menu"
              [attr.aria-label]="'dashboard.header.help' | translate: lang()"
              class="absolute right-0 z-50 mt-1 w-48 rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md"
            >
              <button
                type="button"
                role="menuitem"
                class="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                (click)="showVersion()"
              >
                {{ 'dashboard.header.version' | translate: lang() }}
              </button>
              <a
                role="menuitem"
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
    </app-shell-header>
  `,
})
export class DashboardHeaderComponent {
  private readonly authStore = inject(AuthStore);
  private readonly config = inject(ConfigService);
  private readonly czentrix = inject(CzentrixService);
  private readonly i18n = inject(I18nService);
  private readonly storage = inject(SessionStorageService);
  private readonly router = inject(Router);
  private readonly dialog = inject(ZardDialogService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  readonly user = this.authStore.user;
  readonly lang = this.i18n.language;
  /** Built from the per-environment host so a prod build never links to UAT. */
  readonly licenseUrl = this.config.getCommonBaseURLLicense() + LICENSE_PATH;

  private readonly profileOpen_ = signal(false);
  private readonly helpOpen_ = signal(false);
  readonly profileOpen = this.profileOpen_.asReadonly();
  readonly helpOpen = this.helpOpen_.asReadonly();

  private readonly profileTrigger = viewChild('profileTrigger', { read: ElementRef<HTMLButtonElement> });
  private readonly helpTrigger = viewChild('helpTrigger', { read: ElementRef<HTMLButtonElement> });

  /** Role code for the title, e.g. "RO" for the HAO/RO hybrid role. */
  private readonly roleCode = computed(() => {
    const code = this.authStore.currentRole()?.featureCode ?? '';
    return TITLE_ROLE_ALIASES[code] ?? code;
  });

  /** Centered header title, e.g. "RO Dashboard". */
  readonly roleTitle = computed(() => {
    const suffix = this.i18n.instantFor('dashboard.header.titleSuffix', this.lang());
    const code = this.roleCode();
    return code ? `${code} ${suffix}` : suffix;
  });

  /** Profile id line, e.g. "2145-HAO-104". */
  readonly profileId = computed(() => {
    const agentId = this.authStore.user()?.agentID;
    const feature = this.authStore.currentRole()?.featureCode;
    return [agentId, feature, SERVICE_104].filter(Boolean).join('-');
  });

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

  /**
   * Escape closes whichever dropdown is open and returns focus to the button
   * that opened it — without this, focus would fall back to the document
   * body once the dropdown's DOM is removed.
   */
  onEscape(): void {
    if (this.profileOpen_()) {
      this.closeMenus();
      this.profileTrigger()?.nativeElement.focus();
    } else if (this.helpOpen_()) {
      this.closeMenus();
      this.helpTrigger()?.nativeElement.focus();
    }
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
    const ref = this.dialog.create({
      zContent: EmergencyContactsViewComponent,
      zHideFooter: true,
      zClosable: false,
      zWidth: '32rem',
    });
    // The view renders its own header + close button; close the dialog when it fires.
    ref.componentInstance?.closed.subscribe(() => ref.close());
  }

  logout(): void {
    // Release the agent from the CZentrix dialer (best-effort, non-blocking).
    this.czentrix.endCtiSession();
    this.authStore.clear();
    // Full wipe, matching the forced-logout path (session.service.ts) — a
    // manual logout otherwise left call/beneficiary storage keys behind
    // whenever call state was populated, exposing patient data to the next
    // person who logged in on the same browser.
    this.storage.clear();
    void this.router.navigate([FEEDBACK_ROUTE], { queryParams: { sl: '104' } });
  }
}
