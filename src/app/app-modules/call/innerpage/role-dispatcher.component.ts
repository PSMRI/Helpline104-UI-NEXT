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

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLayoutDashboard } from '@ng-icons/lucide';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

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
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideLayoutDashboard })],
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
    </section>
  `,
})
export class RoleDispatcherComponent {
  private readonly i18n = inject(I18nService);
  readonly lang = this.i18n.language;
}
