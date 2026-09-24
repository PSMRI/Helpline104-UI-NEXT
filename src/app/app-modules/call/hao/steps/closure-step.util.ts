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

import { TransferCampaign } from '../hao.models';

export type TransferRole = 'hao' | 'co' | 'mo';

/**
 * Names a transfer campaign may carry for each role, matched as whole tokens
 * against the campaign name (so `MO_Inbound` is an MO campaign, `Demo` is not).
 */
export const CAMPAIGN_ROLE_ALIASES: Readonly<Record<TransferRole, readonly string[]>> = {
  mo: ['mo', 'medical officer', 'medicalofficer'],
  co: ['co', 'counsellor', 'counselor', 'counselling', 'counseling'],
  hao: ['hao', 'health advisory', 'healthadvisory', 'health assistant officer'],
};

function tokenize(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function containsSequence(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) {
    return false;
  }
  for (let start = 0; start + needle.length <= haystack.length; start++) {
    if (needle.every((token, offset) => haystack[start + offset] === token)) {
      return true;
    }
  }
  return false;
}

/** Whether a campaign name denotes the given transfer role. */
export function campaignMatchesRole(campaignName: string | null | undefined, role: TransferRole): boolean {
  const tokens = tokenize(campaignName ?? '');
  return CAMPAIGN_ROLE_ALIASES[role].some((alias) => containsSequence(tokens, tokenize(alias)));
}

/** First campaign whose name denotes the role, in list order. */
export function getCampaignName(campaigns: readonly TransferCampaign[], role: TransferRole): string | undefined {
  return campaigns.find((c) => campaignMatchesRole(c.campaignName, role))?.campaignName;
}
