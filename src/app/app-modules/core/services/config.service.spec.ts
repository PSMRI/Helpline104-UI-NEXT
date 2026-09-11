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

import { upgradeToHttps } from './config.service';

describe('upgradeToHttps', () => {
  it('upgrades a plain http:// URL to https://', () => {
    expect(upgradeToHttps('http://uatcz.piramalswasthya.org/')).toBe('https://uatcz.piramalswasthya.org/');
  });

  it('leaves an already-https URL untouched', () => {
    expect(upgradeToHttps('https://cz.piramalswasthya.org/')).toBe('https://cz.piramalswasthya.org/');
  });

  it('leaves a relative path untouched', () => {
    expect(upgradeToHttps('common-api/')).toBe('common-api/');
  });

  it('leaves localhost untouched, with or without a port', () => {
    expect(upgradeToHttps('http://localhost/')).toBe('http://localhost/');
    expect(upgradeToHttps('http://localhost:8083/')).toBe('http://localhost:8083/');
  });

  it('leaves 127.0.0.1 untouched', () => {
    expect(upgradeToHttps('http://127.0.0.1:8083/')).toBe('http://127.0.0.1:8083/');
  });

  it('does not treat a hostname merely prefixed with a loopback address as loopback', () => {
    expect(upgradeToHttps('http://127.0.0.1.evil.example/')).toBe('https://127.0.0.1.evil.example/');
    expect(upgradeToHttps('http://localhost.evil.example/')).toBe('https://localhost.evil.example/');
  });

  it('resolves the real host, not the userinfo, when a loopback address is used as userinfo', () => {
    expect(upgradeToHttps('http://127.0.0.1@evil.example/')).toBe('https://127.0.0.1@evil.example/');
  });
});
