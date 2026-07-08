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

import type { TranslationKey } from '../core/i18n/locales';
import { FEATURE_SCREEN_NAMES, FeatureScreen, OutboundCallRecord } from './outbound.models';

/** A role worklist bucket keyed by the screen that identifies the role. */
export interface RoleBucketDef {
  key: 'hao' | 'mo' | 'co' | 'pd' | 'sio';
  screenName: string;
  labelKey: TranslationKey;
}

/** One bucket of records for a role, plus the roleID records allocate to. */
export interface RoleBucket extends RoleBucketDef {
  roleID: number | null;
  records: OutboundCallRecord[];
}

/** The role buckets the outbound search/reallocate screens group records into. */
export const ROLE_BUCKETS: readonly RoleBucketDef[] = [
  { key: 'hao', screenName: FEATURE_SCREEN_NAMES.health, labelKey: 'outbound.role.hao' },
  { key: 'mo', screenName: FEATURE_SCREEN_NAMES.medical, labelKey: 'outbound.role.mo' },
  { key: 'co', screenName: FEATURE_SCREEN_NAMES.counselling, labelKey: 'outbound.role.co' },
  { key: 'pd', screenName: FEATURE_SCREEN_NAMES.psychiatrist, labelKey: 'outbound.role.pd' },
  {
    key: 'sio',
    screenName: FEATURE_SCREEN_NAMES.serviceImprovements,
    labelKey: 'outbound.role.sio',
  },
];

/** All screen names that identify a role bucket. */
const KNOWN_SCREENS = new Set(ROLE_BUCKETS.map((b) => b.screenName));

/**
 * Group unallocated outbound records into role buckets, mirroring the legacy
 * `addtoWorklistByFeatureName`.
 *
 * A record's `requestedFeature` resolves (via the provider's feature→role screen
 * mapping) to a `roleID`; that role's first *known* screen decides the bucket.
 * Buckets with no matching records still appear (empty), each carrying the
 * `roleID` its records would be allocated to.
 */
export function bucketRecords(
  records: OutboundCallRecord[],
  mapping: FeatureScreen[],
): RoleBucket[] {
  const buckets: RoleBucket[] = ROLE_BUCKETS.map((def) => ({
    ...def,
    roleID: mapping.find((m) => m.screen?.screenName === def.screenName)?.roleID ?? null,
    records: [],
  }));
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  for (const record of records) {
    const roleID = mapping.find((m) => m.screen?.screenName === record.requestedFeature)?.roleID;
    if (roleID == null) {
      continue;
    }
    const known = mapping.find(
      (m) => m.roleID === roleID && !!m.screen && KNOWN_SCREENS.has(m.screen.screenName ?? ''),
    );
    const def = ROLE_BUCKETS.find((b) => b.screenName === known?.screen?.screenName);
    if (def) {
      byKey.get(def.key)?.records.push(record);
    }
  }

  return buckets;
}

/**
 * Build the UTC ISO bounds for a `yyyy-MM-dd` date range, matching the legacy
 * `T00:00:00.000Z` / `T23:59:59.999Z` day boundaries. Returns `null` for a part
 * that is missing.
 */
export function dayRangeIso(
  startDate: string | null,
  endDate: string | null,
): { filterStartDate?: string; filterEndDate?: string } {
  const range: { filterStartDate?: string; filterEndDate?: string } = {};
  if (startDate) {
    range.filterStartDate = `${startDate}T00:00:00.000Z`;
  }
  if (endDate) {
    range.filterEndDate = `${endDate}T23:59:59.999Z`;
  }
  return range;
}
