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

import { campaignMatchesRole, getCampaignName } from './closure-step.util';

describe('closure-step campaign matcher', () => {
  describe('campaignMatchesRole', () => {
    it('matches the role code as a whole token regardless of case or separators', () => {
      expect(campaignMatchesRole('MO_Inbound', 'mo')).toBeTrue();
      expect(campaignMatchesRole('H_104_Hybrid_MO', 'mo')).toBeTrue();
      expect(campaignMatchesRole('co-campaign', 'co')).toBeTrue();
      expect(campaignMatchesRole('HAO Campaign', 'hao')).toBeTrue();
      expect(campaignMatchesRole('104.hao', 'hao')).toBeTrue();
    });

    it('does not match the role code inside another word', () => {
      expect(campaignMatchesRole('Demo', 'mo')).toBeFalse();
      expect(campaignMatchesRole('Common', 'mo')).toBeFalse();
      expect(campaignMatchesRole('Cochin', 'co')).toBeFalse();
      expect(campaignMatchesRole('Chaos', 'hao')).toBeFalse();
    });

    it('matches multi-word and joined aliases', () => {
      expect(campaignMatchesRole('Medical Officer Inbound', 'mo')).toBeTrue();
      expect(campaignMatchesRole('104_MedicalOfficer', 'mo')).toBeTrue();
      expect(campaignMatchesRole('Counsellor Queue', 'co')).toBeTrue();
      expect(campaignMatchesRole('Health Advisory 104', 'hao')).toBeTrue();
      expect(campaignMatchesRole('HealthAdvisory', 'hao')).toBeTrue();
    });

    it('requires multi-word aliases to appear in order and adjacent', () => {
      expect(campaignMatchesRole('Officer Medical', 'mo')).toBeFalse();
      expect(campaignMatchesRole('Medical Chief Officer', 'mo')).toBeFalse();
    });

    it('does not cross roles', () => {
      expect(campaignMatchesRole('MO_Inbound', 'co')).toBeFalse();
      expect(campaignMatchesRole('MO_Inbound', 'hao')).toBeFalse();
      expect(campaignMatchesRole('Medical Officer', 'hao')).toBeFalse();
    });

    it('treats an empty or missing name as no match', () => {
      expect(campaignMatchesRole('', 'mo')).toBeFalse();
      expect(campaignMatchesRole(null, 'mo')).toBeFalse();
      expect(campaignMatchesRole(undefined, 'co')).toBeFalse();
    });
  });

  describe('getCampaignName', () => {
    const campaigns = [
      { campaignName: 'Demo' },
      { campaignName: 'H_104_Hybrid_CO' },
      { campaignName: 'H_104_Hybrid_MO' },
      { campaignName: 'Medical Officer Overflow' },
    ];

    it('returns the first campaign for the role in list order', () => {
      expect(getCampaignName(campaigns, 'mo')).toBe('H_104_Hybrid_MO');
      expect(getCampaignName(campaigns, 'co')).toBe('H_104_Hybrid_CO');
    });

    it('returns undefined when no campaign denotes the role', () => {
      expect(getCampaignName(campaigns, 'hao')).toBeUndefined();
      expect(getCampaignName([], 'mo')).toBeUndefined();
    });

    it('skips campaigns that only contain the role code as a substring', () => {
      expect(getCampaignName([{ campaignName: 'Demo' }], 'mo')).toBeUndefined();
    });
  });
});
