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

import { ZardButtonComponent } from '@common-ui/ui/button';

import { AuthStore } from '../core/auth/auth.store';
import { Privilege, Role } from '../core/auth/auth.models';

const DASHBOARD_ROUTE = '/dashboard';

/** Legacy display alias: the "HYBRID HAO" role is shown simply as "HAO". */
const ROLE_DISPLAY_ALIASES: Record<string, string> = {
  'HYBRID HAO': 'HAO',
};

/**
 * Screen name → short role/feature code, ported from the legacy
 * service-role-selection `getSelectedFeature()`. Drives dashboard routing.
 */
const SCREEN_FEATURE_CODES: Record<string, string> = {
  Registration: 'RO',
  Health_Advice: 'HAO',
  Counselling: 'CO',
  Medical_Advice: 'MO',
  Service_Improvements: 'SIO',
  Supervising: 'Supervisor',
  Surveyor: 'Surveyor',
  Psychiatrist: 'PD',
};

const SCREEN_REGISTRATION = 'Registration';
const SCREEN_HEALTH_ADVICE = 'Health_Advice';

/**
 * Service/role selection screen shown after login (replaces the legacy
 * MultiRoleScreenComponent + ServiceRoleSelectionComponent pair, minus the
 * deferred CZentrix/multilingual/version shell concerns).
 *
 * Lists the 104 service privileges from {@link AuthStore} and, on selection,
 * records the chosen role via {@link AuthStore.setCurrentRole} (deriving the
 * legacy feature code from the role's screen mappings) and routes to the
 * dashboard.
 */
@Component({
  selector: 'app-role-selection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ZardButtonComponent],
  templateUrl: './role-selection.component.html',
  styleUrl: './role-selection.component.css',
})
export class RoleSelectionComponent {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  readonly user = this.authStore.user;
  readonly privileges = this.authStore.privileges;

  /**
   * Whether the agent holds Registration (RO) and Health_Advice (HAO)
   * privileges across all roles. When both are present the HAO feature is
   * treated as Registration, matching the legacy `checkROHAOPrivilege()`.
   */
  private readonly hasRO = computed(() => this.hasScreen(SCREEN_REGISTRATION));
  private readonly hasHAO = computed(() => this.hasScreen(SCREEN_HEALTH_ADVICE));

  /** Role label as shown to the user (applies the legacy "HYBRID HAO" alias). */
  displayName(role: Role): string {
    const name = role.RoleName ?? '';
    return ROLE_DISPLAY_ALIASES[name] ?? name;
  }

  /** Record the selected service/role and navigate to the dashboard. */
  selectRole(role: Role, service: Privilege): void {
    const mapping = role.serviceRoleScreenMappings?.[0];
    const providerServiceMapping = mapping?.providerServiceMapping;

    this.authStore.setCurrentRole({
      roleName: role.RoleName ?? '',
      serviceName: service.serviceName ?? null,
      serviceID: providerServiceMapping?.m_ServiceMaster?.serviceID ?? null,
      serviceProviderID: providerServiceMapping?.serviceProviderID ?? null,
      providerServiceMapID: service.providerServiceMapID ?? null,
      workingLocationID: role.workingLocationID ?? null,
      apimanClientKey: service.apimanClientKey ?? null,
      featureCode: this.deriveFeatureCode(role),
    });

    void this.router.navigate([DASHBOARD_ROUTE]);
  }

  /**
   * First known feature code among the role's screen mappings. When the agent
   * holds both RO and HAO, a Health_Advice screen is treated as Registration.
   */
  private deriveFeatureCode(role: Role): string | null {
    const remapHaoToRo = this.hasRO() && this.hasHAO();

    for (const mapping of role.serviceRoleScreenMappings ?? []) {
      let screenName = mapping.screen?.screenName;
      if (remapHaoToRo && screenName === SCREEN_HEALTH_ADVICE) {
        screenName = SCREEN_REGISTRATION;
      }
      if (screenName && screenName in SCREEN_FEATURE_CODES) {
        return SCREEN_FEATURE_CODES[screenName];
      }
    }
    return null;
  }

  /** True if any role across all privileges maps the given screen. */
  private hasScreen(screenName: string): boolean {
    return this.privileges().some((privilege) =>
      privilege.roles?.some((role) =>
        role.serviceRoleScreenMappings?.some(
          (mapping) => mapping.screen?.screenName === screenName,
        ),
      ),
    );
  }
}
