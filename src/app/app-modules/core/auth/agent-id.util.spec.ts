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

import { parseAgentID } from './agent-id.util';

describe('parseAgentID', () => {
  it('accepts a number', () => {
    expect(parseAgentID(2545)).toBe(2545);
  });

  it('accepts a numeric string, trimmed', () => {
    expect(parseAgentID('2545')).toBe(2545);
    expect(parseAgentID(' 2545 ')).toBe(2545);
  });

  it('rejects empty and whitespace-only strings instead of reading them as 0', () => {
    expect(parseAgentID('')).toBeNull();
    expect(parseAgentID('   ')).toBeNull();
    expect(parseAgentID('\t\n')).toBeNull();
  });

  it('rejects non-numeric strings and non-finite numbers', () => {
    expect(parseAgentID('abc')).toBeNull();
    expect(parseAgentID(Number.NaN)).toBeNull();
    expect(parseAgentID(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('rejects values that are neither numbers nor strings', () => {
    expect(parseAgentID(null)).toBeNull();
    expect(parseAgentID(undefined)).toBeNull();
    expect(parseAgentID(true)).toBeNull();
    expect(parseAgentID([])).toBeNull();
    expect(parseAgentID({})).toBeNull();
  });
});
