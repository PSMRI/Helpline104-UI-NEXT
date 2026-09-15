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

import { ZardButtonComponent } from '@common-ui/ui/button';

import { AppFooterComponent } from '@/shared/components/layout/app-footer.component';
import { CtiPanelStore } from '@/shared/components/layout/cti-panel.store';

/**
 * Footer for the on-call workspace shell (`/innerpage/*`) — legacy renders its
 * footer chrome (copyright, version, CZentrix) on *every* screen, call
 * workspaces included, not just the dashboard. Docking the CZentrix toggle
 * here (rather than floating it, as `CtiPanelComponent` otherwise would on
 * routes with no footer) is also what keeps it from sitting on top of each
 * workspace's own bottom-right primary action button (registration's
 * "Next"/"Register beneficiary", the case sheet's "Save", …).
 *
 * No feedback link here (unlike `DashboardFooterComponent`): that link clears
 * the auth session, which would drop an active call.
 */
@Component({
  selector: 'app-innerpage-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppFooterComponent, ZardButtonComponent],
  template: `
    <app-shell-footer>
      @if (cti.showCzentrix()) {
        <button footerCorner z-button type="button" zSize="xs" class="shadow-sm" (click)="cti.toggleCti()">
          {{ cti.czentrixLabel }}
        </button>
      }
    </app-shell-footer>
  `,
})
export class InnerpageFooterComponent {
  readonly cti = inject(CtiPanelStore);
}
