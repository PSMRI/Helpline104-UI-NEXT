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

import { ZardTableImports } from '@common-ui/ui/table';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

/**
 * Body of the Emergency Contacts modal (opened from the header Contacts icon).
 * Renders the contacts table; there are no contacts configured for the 104
 * service, so it shows the empty state.
 */
@Component({
  selector: 'app-emergency-contacts-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ZardTableImports, TranslatePipe],
  template: `
    <table z-table class="w-full text-sm">
      <thead z-table-header>
        <tr z-table-row>
          <th z-table-head>{{ 'dashboard.contacts.name' | translate: lang() }}</th>
          <th z-table-head>{{ 'dashboard.contacts.number' | translate: lang() }}</th>
        </tr>
      </thead>
      <tbody z-table-body>
        <tr z-table-row>
          <td z-table-cell colspan="2" class="py-6 text-center text-muted-foreground">
            {{ 'dashboard.contacts.empty' | translate: lang() }}
          </td>
        </tr>
      </tbody>
    </table>
  `,
})
export class EmergencyContactsDialogComponent {
  private readonly i18n = inject(I18nService);
  readonly lang = this.i18n.language;
}
