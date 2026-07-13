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

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLayoutDashboard, lucideUserSearch } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CallStore } from '../call.store';
import { roleWorkspacePath } from '../role-workspace/role-screens.util';

/**
 * Placeholder for the on-call role dispatcher.
 *
 * In the legacy app this is `<app-104>`, which resolves the beneficiary by call
 * id and `*ngIf`-switches to the role workspace (RO → registration, HAO →
 * service tabs, …). Those workspaces are migrated separately; for now the
 * Innerpage shell hosts this placeholder so the layout and routing can be
 * verified end-to-end.
 */
@Component({
  selector: 'app-role-dispatcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgIcon, TranslatePipe, ZardButtonComponent],
  viewProviders: [
    provideIcons({ lucideLayoutDashboard, lucideUserSearch }),
  ],
  template: `
    <section
      class="flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-10 text-center"
    >
      <ng-icon
        name="lucideLayoutDashboard"
        size="40"
        class="text-muted-foreground"
        aria-hidden="true"
      />
      <p class="text-base font-medium text-foreground">
        {{ 'innerpage.dispatcherTitle' | translate: lang() }}
      </p>
      <p class="max-w-md text-sm text-muted-foreground">
        {{ 'innerpage.dispatcherHint' | translate: lang() }}
      </p>
      <button z-button type="button" zType="default" routerLink="registration">
        <ng-icon name="lucideUserSearch" size="16" aria-hidden="true" />
        {{ 'innerpage.identifyCaller' | translate: lang() }}
      </button>
    </section>
  `,
})
export class RoleDispatcherComponent implements OnInit {
  private readonly i18n = inject(I18nService);
  private readonly callStore = inject(CallStore);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  readonly lang = this.i18n.language;

  /**
   * Once the caller is identified (a beneficiary is resolved on the CallStore),
   * hand off to the agent's role workspace — e.g. `/innerpage/hao` for HAO. When
   * no beneficiary is resolved yet, or the role has no dedicated workspace (RO),
   * the "identify caller" placeholder is shown instead.
   */
  ngOnInit(): void {
    if (this.callStore.beneficiaryId() === null) {
      return;
    }
    const path = roleWorkspacePath(this.authStore.currentRole()?.featureCode);
    if (path) {
      void this.router.navigate(['/innerpage', path]);
    }
  }
}
