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

/** Screen that means the agent also holds the RO (registration) role. */
export const SCREEN_HEALTH_ADVICE = 'Health_Advice';

/**
 * The 104 service screens the SIO workspace exists to serve — every
 * screen-gated tab in `service-delivery-step` except Health Advisory (HAO's
 * own case sheet). The single source of truth for both that tab list and
 * {@link sioGuard}, so the two can't silently drift apart.
 */
export const SIO_SCREENS: readonly string[] = [
  'Blood Request',
  'Directory Information Service',
  'Epidemic Outbreak Service',
  'Food safety',
  'Grievance',
  'Organ Donation',
  'Health schemes',
  'Covid19 for 104 services',
  'IMR MMR Information',
  'Bal Vivah',
];

/**
 * Maps a role's {@link CurrentRole.featureCode} to its on-call workspace child
 * route under `/innerpage`. `RO` (registration-only) has no service workspace —
 * it stays on the dispatcher/registration screen — so it (and any unknown code)
 * returns `null`.
 */
const WORKSPACE_PATH_BY_FEATURE: Readonly<Record<string, string>> = {
  HAO: 'hao',
  MO: 'mo',
  CO: 'co',
  SIO: 'sio',
  PD: 'pd',
  Surveyor: 'surveyor',
};

/**
 * The `/innerpage` child path for a role's feature code, or `null` when the role
 * has no dedicated service workspace (e.g. RO, or an unrecognised code).
 */
export function roleWorkspacePath(featureCode: string | null | undefined): string | null {
  if (!featureCode) {
    return null;
  }
  return WORKSPACE_PATH_BY_FEATURE[featureCode] ?? null;
}

/**
 * The `/innerpage` child path to send an identified caller to, given the
 * agent's current-role feature code and full privilege set. Mirrors
 * {@link roleWorkspacePath}, plus the hybrid RO+HAO fallback: an agent whose
 * selected role is `RO` but who also holds a `Health_Advice` screen mapping
 * (legacy `checkROHAOPrivilege`) is sent to `hao`. Returns `null` when the
 * role has no dedicated workspace (plain RO, or an unrecognised code).
 */
export function resolveDispatchPath(
  featureCode: string | null | undefined,
  privileges: readonly Privilege[],
): string | null {
  const path = roleWorkspacePath(featureCode);
  if (path !== null) {
    return path;
  }
  if (featureCode === 'RO' && collectServiceScreens(privileges, SERVICE_104).includes(SCREEN_HEALTH_ADVICE)) {
    return 'hao';
  }
  return null;
}

/**
 * Gather the distinct screen names the agent holds on a given service, across
 * all of that service's roles. Mirrors the legacy `dataService.screens` list the
 * `<md-tab-group>` gated its service tabs against (see also
 * `HaoWorkspaceComponent.collectScreens`).
 */
export function collectServiceScreens(privileges: readonly Privilege[], serviceName: string): string[] {
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
