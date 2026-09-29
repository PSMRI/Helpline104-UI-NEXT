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
 * `startCtiSession` is the legacy `getCTILoginToken` step only: it captures
 * the login key (for a supervisor too — the Agent Status screen embeds
 * CZentrix's admin console with it) and never calls `cti/doAgentLogin`,
 * which Common-API no longer routes.
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
  });

  it('with a real agentID, fetches only the login key and records the agent id', () => {
    let result: boolean | undefined;
    service.startCtiSession('104hao', 'encrypted-pw', 2145).subscribe((r) => (result = r));

    const req = http.expectOne((r) => r.url.includes('cti/getLoginKey'));
    expect(req.request.body).toEqual({ username: '104hao', password: 'encrypted-pw' });
    req.flush({ data: { login_key: 'the-key' } });

    expect(result).toBe(true);
    expect(service.loginKey()).toBe('the-key');
    expect(service.agentID()).toBe(2145);
    http.expectNone((r) => r.url.includes('cti/doAgentLogin'));
    http.expectNone((r) => r.url.includes('cti/getAgentIPAddress'));
  });

  it('releases the recorded agent via doAgentLogout on endCtiSession', () => {
    service.startCtiSession('104hao', 'encrypted-pw', 2145).subscribe();
    http.expectOne((req) => req.url.includes('cti/getLoginKey')).flush({ data: { login_key: 'the-key' } });

    service.endCtiSession();

    const logout = http.expectOne((req) => req.url.includes('cti/doAgentLogout'));
    expect(logout.request.body).toEqual({ agent_id: 2145 });
    logout.flush({ data: {} });
    expect(service.agentID()).toBeNull();
    expect(service.loginKey()).toBeNull();
  });

  it('records no agent id, and so skips doAgentLogout, when the login-key call fails', () => {
    let result: boolean | undefined;
    service.startCtiSession('104hao', 'encrypted-pw', 2145).subscribe((r) => (result = r));
    http.expectOne((req) => req.url.includes('cti/getLoginKey')).flush('fail', { status: 500, statusText: 'Error' });

    expect(result).toBe(false);
    expect(service.agentID()).toBeNull();

    service.endCtiSession();
    http.expectNone((req) => req.url.includes('cti/doAgentLogout'));
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

describe('CzentrixService.refreshLoginKey', () => {
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

  function captureCredentials(): void {
    service.startCtiSession('dimpi', 'encrypted-pw', null).subscribe();
    http.expectOne((req) => req.url.includes('cti/getLoginKey')).flush({ data: {} });
  }

  it('resolves no-credentials without a request when no portal login has been captured', () => {
    let status: string | undefined;
    service.refreshLoginKey().subscribe((s) => (status = s));

    http.expectNone((req) => req.url.includes('cti/getLoginKey'));
    expect(status).toBe('no-credentials');
  });

  it('re-posts the username and encrypted password captured by startCtiSession and stores the new key', () => {
    captureCredentials();
    expect(service.loginKey()).toBeNull();

    let status: string | undefined;
    service.refreshLoginKey().subscribe((s) => (status = s));
    const req = http.expectOne((r) => r.url.includes('cti/getLoginKey'));
    expect(req.request.body).toEqual({ username: 'dimpi', password: 'encrypted-pw' });
    req.flush({ data: { login_key: 'fresh-key' } });

    expect(status).toBe('ok');
    expect(service.loginKey()).toBe('fresh-key');
  });

  it('resolves no-key when the envelope carries no login_key', () => {
    captureCredentials();

    let status: string | undefined;
    service.refreshLoginKey().subscribe((s) => (status = s));
    http
      .expectOne((r) => r.url.includes('cti/getLoginKey'))
      .flush({ statusCode: 5002, errorMessage: 'Agent not logged in' });

    expect(status).toBe('no-key');
    expect(service.loginKey()).toBeNull();
  });

  it('resolves http-error, without throwing, when the request fails', () => {
    captureCredentials();

    let status: string | undefined;
    let errored = false;
    service.refreshLoginKey().subscribe({ next: (s) => (status = s), error: () => (errored = true) });
    http.expectOne((r) => r.url.includes('cti/getLoginKey')).flush('fail', { status: 500, statusText: 'Error' });

    expect(errored).toBe(false);
    expect(status).toBe('http-error');
  });

  it('forgets the captured credentials on endCtiSession', () => {
    captureCredentials();
    service.endCtiSession();

    let status: string | undefined;
    service.refreshLoginKey().subscribe((s) => (status = s));

    http.expectNone((req) => req.url.includes('cti/getLoginKey'));
    expect(status).toBe('no-credentials');
  });
});
