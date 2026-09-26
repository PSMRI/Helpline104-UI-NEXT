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

import { AuthStore } from '../../core/auth/auth.store';
import { CzentrixService } from '../../core/services/czentrix.service';
import { AgentStatusComponent } from './agent-status.component';

function unwrap(url: unknown): string {
  return (url as { changingThisBreaksApplicationSecurity: string }).changingThisBreaksApplicationSecurity;
}

describe('AgentStatusComponent', () => {
  let authStore: AuthStore;
  let czentrix: CzentrixService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [AgentStatusComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    authStore = TestBed.inject(AuthStore);
    czentrix = TestBed.inject(CzentrixService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function render() {
    const fixture = TestBed.createComponent(AgentStatusComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('embeds the CZentrix admin console once the login key is known, URL-encoding the key', () => {
    authStore.setSession({
      token: 't',
      user: { userID: 1, agentID: null, userName: 'dimpi', status: 'Active' },
    });
    // Drive the login key through the same public handshake login.component.ts
    // uses, rather than poking CzentrixService's private state directly.
    czentrix.startCtiSession('dimpi', 'encrypted-pw', null).subscribe();
    http.expectOne((req) => req.url.includes('cti/getLoginKey')).flush({ data: { login_key: 'abc+def/==' } });

    const fixture = render();
    const url = unwrap(fixture.componentInstance.screenUrl());
    expect(url).toContain('remote_login.php');
    expect(url).toContain('username=dimpi');
    expect(url).toContain('key=abc%2Bdef%2F%3D%3D');
  });

  it('renders the missing-key notice with a Retry button instead of an iframe when no login key is present', () => {
    authStore.setSession({
      token: 't',
      user: { userID: 1, agentID: null, userName: 'dimpi', status: 'Active' },
    });

    const fixture = render();
    expect(fixture.componentInstance.screenUrl()).toBeNull();
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    const notice = fixture.nativeElement.querySelector('app-cti-key-notice');
    expect(notice).not.toBeNull();
    expect(notice.textContent).toContain('The telephony session key was not received from CZentrix.');
    expect(notice.textContent).not.toContain('log in again');
    expect(notice.querySelector('button')).not.toBeNull();
  });

  it('swaps the notice for the iframe once Retry obtains a login key', () => {
    authStore.setSession({
      token: 't',
      user: { userID: 1, agentID: null, userName: 'dimpi', status: 'Active' },
    });
    czentrix.startCtiSession('dimpi', 'encrypted-pw', null).subscribe();
    http.expectOne((req) => req.url.includes('cti/getLoginKey')).flush({ statusCode: 5002, errorMessage: 'no key' });

    const fixture = render();
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();

    fixture.nativeElement.querySelector('app-cti-key-notice button').click();
    const retry = http.expectOne((req) => req.url.includes('cti/getLoginKey'));
    expect(retry.request.body).toEqual({ username: 'dimpi', password: 'encrypted-pw' });
    retry.flush({ data: { login_key: 'fresh-key' } });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-cti-key-notice')).toBeNull();
    expect(fixture.nativeElement.querySelector('iframe')).not.toBeNull();
    expect(unwrap(fixture.componentInstance.screenUrl())).toContain('key=fresh-key');
  });

  it('shows the log-out-and-back-in fallback only after a retry has failed', () => {
    authStore.setSession({
      token: 't',
      user: { userID: 1, agentID: null, userName: 'dimpi', status: 'Active' },
    });
    czentrix.startCtiSession('dimpi', 'encrypted-pw', null).subscribe();
    http.expectOne((req) => req.url.includes('cti/getLoginKey')).flush({ data: {} });

    const fixture = render();
    fixture.nativeElement.querySelector('app-cti-key-notice button').click();
    http.expectOne((req) => req.url.includes('cti/getLoginKey')).flush('fail', { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Still unavailable. Please log out and log in again.');
  });
});
