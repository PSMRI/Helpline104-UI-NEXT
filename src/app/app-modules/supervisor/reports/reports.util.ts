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

import { CurrentRole, Privilege } from '../../core/auth/auth.models';
import { fromDateInputValue, toDateInputValue } from '../shared/supervisor-ui';

/** Today's local date as `yyyy-MM-dd` for date-input defaults/max. */
export function todayInput(): string {
  return toDateInputValue(new Date());
}

/** Yesterday's local date as `yyyy-MM-dd` (district-wise report cap). */
export function yesterdayInput(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return toDateInputValue(date);
}

/**
 * Latest permissible end date for a report range: the legacy screens allowed
 * at most 31 days (start + 30) and never beyond the report's cap (today, or
 * yesterday for the district-wise report).
 */
export function maxEndFor(start: string, cap: string): string {
  const parsed = fromDateInputValue(start);
  if (!parsed) {
    return cap;
  }
  parsed.setDate(parsed.getDate() + 30);
  const windowEnd = toDateInputValue(parsed);
  return windowEnd < cap ? windowEnd : cap;
}

/**
 * Value the end-date control must be reset to after the start date changed,
 * or `null` when the current end already fits the [start, maxEnd] window.
 * (`yyyy-MM-dd` strings compare correctly lexicographically.)
 */
export function clampEndDate(start: string, end: string, cap: string): string | null {
  if (!start) {
    return null;
  }
  const max = maxEndFor(start, cap);
  if (!end || end > max || end < start) {
    return max;
  }
  return null;
}

/**
 * Serialise the range bounds the way the legacy screens did: local midnight /
 * end-of-day emitted as the UTC portion of the ISO string (the legacy code
 * subtracted the timezone offset before `JSON.stringify`).
 */
export function rangeStartIso(date: string): string {
  return `${date}T00:00:00.000Z`;
}

export function rangeEndIso(date: string): string {
  return `${date}T23:59:59.000Z`;
}

/**
 * The state id behind the selected role (legacy
 * `current_stateID_based_on_role`), read from the privilege tree: the current
 * service's privilege → the selected role → its first screen mapping's
 * `providerServiceMapping.stateID`.
 */
export function stateIDForRole(
  privileges: readonly Privilege[],
  role: CurrentRole | null,
): number | null {
  if (!role) {
    return null;
  }
  const privilege = privileges.find((p) => p.providerServiceMapID === role.providerServiceMapID);
  const roles = privilege?.roles ?? [];
  const selected = roles.find((r) => r.RoleName === role.roleName) ?? roles[0];
  const mapping = selected?.serviceRoleScreenMappings?.[0];
  return mapping?.providerServiceMapping?.stateID ?? null;
}
