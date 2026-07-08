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

import { Privilege } from '../../core/auth/auth.models';

/** The 104 service whose role screens gate the service tabs. */
export const SERVICE_104 = '104';

/**
 * Gather the distinct screen names the agent holds on a given service, across
 * all of that service's roles. Mirrors the legacy `dataService.screens` list the
 * `<md-tab-group>` gated its service tabs against (see also
 * `HaoWorkspaceComponent.collectScreens`).
 */
export function collectServiceScreens(
  privileges: readonly Privilege[],
  serviceName: string,
): string[] {
  const screens = new Set<string>();
  for (const privilege of privileges) {
    if (privilege.serviceName !== serviceName) {
      continue;
    }
    for (const role of privilege.roles ?? []) {
      for (const mapping of role.serviceRoleScreenMappings ?? []) {
        const name = mapping.screen?.screenName;
        if (name) {
          screens.add(name);
        }
      }
    }
  }
  return [...screens];
}
