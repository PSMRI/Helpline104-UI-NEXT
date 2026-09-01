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

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CzentrixService } from './czentrix.service';

/**
 * `startCtiSession` with a null `agentID` (a user with no personal CZentrix
 * dialer line, e.g. a supervisor) must still capture the login key — the
 * supervisor Agent Status screen embeds CZentrix's own admin console with
 * it — while skipping the agent-IP/doAgentLogin dialer-registration calls,
 * which need a real id.
 */
describe('CzentrixService.startCtiSession', () => {
  let service: CzentrixService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CzentrixService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('with a null agentID, fetches only the login key and stores it', () => {
    let result: boolean | undefined;
    service.startCtiSession('dimpi', 'encrypted-pw', null).subscribe((r) => (result = r));

    http.expectOne((req) => req.url.includes('cti/getLoginKey')).flush({ data: { login_key: 'the-key' } });

    expect(result).toBe(true);
    expect(service.loginKey()).toBe('the-key');
    expect(service.agentID()).toBeNull();
    http.expectNone((req) => req.url.includes('cti/getAgentIPAddress'));
    http.expectNone((req) => req.url.includes('cti/doAgentLogin'));
  });

  it('with a real agentID, still runs the full getAgentIPAddress -> doAgentLogin chain', () => {
    let result: boolean | undefined;
    service.startCtiSession('104hao', 'encrypted-pw', 2145).subscribe((r) => (result = r));

    http.expectOne((req) => req.url.includes('cti/getLoginKey')).flush({ data: { login_key: 'the-key' } });
    http.expectOne((req) => req.url.includes('cti/getAgentIPAddress')).flush({ data: { agent_ip: '10.1.1.1' } });
    http.expectOne((req) => req.url.includes('cti/doAgentLogin')).flush({ data: {} });

    expect(result).toBe(true);
    expect(service.loginKey()).toBe('the-key');
    expect(service.agentIP()).toBe('10.1.1.1');
    expect(service.agentID()).toBe(2145);
  });

  it('resolves to false, without throwing, when the login-key call fails', () => {
    let result: boolean | undefined;
    let errored = false;
    service.startCtiSession('dimpi', 'encrypted-pw', null).subscribe({
      next: (r) => (result = r),
      error: () => (errored = true),
    });

    http.expectOne((req) => req.url.includes('cti/getLoginKey')).flush('fail', { status: 500, statusText: 'Error' });

    expect(errored).toBe(false);
    expect(result).toBe(false);
  });

  it('cancels an in-flight getLoginKey request when endCtiSession() runs before it resolves, so a late response cannot resurrect stale session state', () => {
    let result: boolean | undefined;
    service.startCtiSession('dimpi', 'encrypted-pw', null).subscribe((r) => (result = r));
    const req = http.expectOne((r) => r.url.includes('cti/getLoginKey'));

    service.endCtiSession();

    expect(req.cancelled).toBe(true);
    expect(result).toBeUndefined();
    expect(service.loginKey()).toBeNull();
  });
});
