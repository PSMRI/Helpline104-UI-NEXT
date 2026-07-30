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
import { RoleWorkspaceComponent } from './role-workspace.component';

/** 104 service whose roles are inspected for the CO hand-off. */
const SERVICE_104 = '104';
const ROLE_CO = 'CO';

/**
 * Medical Officer (MO) on-call workspace (route `/innerpage/mo`).
 *
 * Ported from the legacy `104-mo`: a case-sheet → closure wizard. When the agent
 * also holds the CO (Counselling Officer) role on the 104 service, a "Switch to
 * CO" action hands the call to the CO workspace (legacy `roleChanged.emit('CO')`).
 */
@Component({
  selector: 'app-mo-workspace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RoleWorkspaceComponent],
  template: `
    <app-role-workspace
      titleKey="roleWorkspace.mo.title"
      subtitleKey="roleWorkspace.mo.subtitle"
      [showSwitchRole]="hasCoPrivilege()"
      switchRoleLabelKey="roleWorkspace.mo.switchToCo"
      (switchRole)="goToCo()"
    />
  `,
})
export class MoWorkspaceComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  /** Whether the agent also holds the CO role on the 104 service. */
  readonly hasCoPrivilege = computed(() =>
    this.authStore
      .privileges()
      .some(
        (p) => p.serviceName === SERVICE_104 && (p.roles ?? []).some((r) => r.RoleName === ROLE_CO),
      ),
  );

  goToCo(): void {
    void this.router.navigate(['/innerpage/co']);
  }
}
