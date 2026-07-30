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

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthStore } from '../../core/auth/auth.store';
import { SERVICE_104 } from './role-screens.util';
import { RoleWorkspaceComponent } from './role-workspace.component';

const ROLE_MO = 'MO';

/**
 * PD (Psychiatrist / Programme Division) on-call workspace (route
 * `/innerpage/pd`).
 *
 * Ported from the legacy `104-pd` inbound flow: a case-sheet → closure wizard.
 * When the agent also holds the MO role on the 104 service, a "Medical service"
 * action hands the call to the MO workspace (legacy `navigateToMO`).
 */
@Component({
  selector: 'app-pd-workspace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RoleWorkspaceComponent],
  template: `
    <app-role-workspace
      titleKey="roleWorkspace.pd.title"
      subtitleKey="roleWorkspace.pd.subtitle"
      [showSwitchRole]="hasMoPrivilege()"
      switchRoleLabelKey="roleWorkspace.pd.switchToMo"
      (switchRole)="goToMo()"
    />
  `,
})
export class PdWorkspaceComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  /**
   * Whether the agent also holds the MO role on the 104 service.
   *
   * Note: the legacy `checkMOPrivilege` actually tested for the *CO* role
   * (`RoleName == 'CO'`) even though the button navigates to, and is labelled,
   * MO — a copy-paste bug. This gates on MO to match where the hand-off goes.
   */
  readonly hasMoPrivilege = computed(() =>
    this.authStore
      .privileges()
      .some(
        (p) => p.serviceName === SERVICE_104 && (p.roles ?? []).some((r) => r.RoleName === ROLE_MO),
      ),
  );

  goToMo(): void {
    void this.router.navigate(['/innerpage/mo']);
  }
}
