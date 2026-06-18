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

/**
 * Shapes for the 104 authentication flow, derived from the legacy app's
 * `POST user/userAuthenticate` response and service/role-selection screens.
 * The privilege tree is large; only the fields the foundation consumes are
 * typed strictly — the rest is preserved as-is via index signatures.
 */

/** Storage keys shared between AuthStore and the interceptors. */
export const AUTH_STORAGE_KEYS = {
  token: 'authToken',
  apimanKey: 'apiman_key',
} as const;

/** The authenticated user, distilled from the login response. */
export interface AuthUser {
  userID: number | null;
  agentID: number | null;
  userName: string | null;
  /** Login response `Status`, e.g. "Active" | "New". */
  status: string | null;
}

/** The service + role the agent selected after login. */
export interface CurrentRole {
  roleName: string;
  serviceID: number | null;
  serviceName: string | null;
  serviceProviderID: number | null;
  providerServiceMapID: number | null;
  workingLocationID: number | null;
  /** APIMAN gateway key for the selected service (`service.apimanClientKey`). */
  apimanClientKey: string | null;
  /**
   * Short role/feature code derived from the role's screen mappings
   * (Registration→RO, Health_Advice→HAO, Counselling→CO, …). Drives dashboard
   * routing in the legacy app; `null` when no known screen matches.
   */
  featureCode: string | null;
}

/**
 * One `serviceRoleScreenMappings` entry on a role. Only the fields role
 * selection reads are typed; the rest is preserved via the index signature.
 */
export interface ServiceRoleScreenMapping {
  screen?: { screenName?: string };
  providerServiceMapping?: {
    stateID?: number;
    serviceProviderID?: number;
    m_ServiceMaster?: { serviceID?: number };
  };
  [key: string]: unknown;
}

/** One selectable role within a service privilege. Loosely typed. */
export interface Role {
  RoleID?: number;
  RoleName?: string;
  workingLocationID?: number;
  agentID?: number;
  serviceRoleScreenMappings?: ServiceRoleScreenMapping[];
  [key: string]: unknown;
}

/** One entry of the login response `previlegeObj` array. Loosely typed. */
export interface Privilege {
  serviceID?: number;
  serviceName?: string;
  providerServiceMapID?: number;
  /** APIMAN gateway key for this service, captured at role selection. */
  apimanClientKey?: string;
  roles?: Role[];
  [key: string]: unknown;
}

/** Raw login response (only the fields the foundation reads). */
export interface LoginResponse {
  key: string;
  isAuthenticated: boolean;
  Status?: string;
  userID?: number;
  agentID?: number;
  previlegeObj?: Privilege[];
  [key: string]: unknown;
}
