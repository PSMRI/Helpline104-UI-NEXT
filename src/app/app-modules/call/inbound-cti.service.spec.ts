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
import { Router, provideRouter } from '@angular/router';

import { AuthStore } from '../core/auth/auth.store';

import { CallStore } from './call.store';
import { InboundCtiService } from './inbound-cti.service';

/**
 * Inbound CTI accept routing, pinned against the class doc comment on
 * {@link InboundCtiService}: a fresh "Accept|<CLI>|<sessionId>|INBOUND" must
 * seed the {@link CallStore} and land the agent on their role's workspace —
 * `registration` for RO/HAO (the only roles that resolve a new, unidentified
 * caller), straight to the role's own workspace for everyone else (an
 * inbound accept carries no fresh-call-vs-transfer flag, so a transferred
 * call to e.g. MO must not bounce that agent through registration).
 *
 * `environment.production` is `false` in the test bundle, so
 * `isTrustedCtiOrigin`'s dev-simulator branch (same-origin) is exercised
 * here via a synthetic `MessageEvent` dispatched on `window` — `dispatchEvent`
 * (unlike `postMessage`) invokes listeners synchronously, so no async wait is
 * needed.
 */
describe('InboundCtiService', () => {
  let authStore: AuthStore;
  let callStore: CallStore;
  let router: Router;
  let http: HttpTestingController;

  const AGENT_ID = 2145;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });

    authStore = TestBed.inject(AuthStore);
    router = TestBed.inject(Router);
    http = TestBed.inject(HttpTestingController);
    spyOn(router, 'navigate').and.resolveTo(true);

    authStore.setSession({
      token: 'test-token',
      user: { userID: 1, agentID: AGENT_ID, userName: '104hao', status: 'Active' },
    });

    // Instantiating the service registers its window 'message' listener.
    TestBed.inject(InboundCtiService);
    callStore = TestBed.inject(CallStore);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function setRole(featureCode: string): void {
    authStore.setCurrentRole({
      roleID: 7,
      roleName: featureCode,
      serviceID: 42,
      serviceName: '104',
      serviceProviderID: 1,
      providerServiceMapID: 42,
      workingLocationID: 1,
      apimanClientKey: null,
      featureCode,
    });
  }

  function acceptInboundCall(sessionId: string, cli = '9034862882'): void {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: `Accept|${cli}|${sessionId}|INBOUND`,
        origin: window.location.origin,
      }),
    );
  }

  /** The service fires this fire-and-forget on every accepted call. */
  function flushStartCall(): void {
    http.expectOne((req) => req.url.includes('call/startCall')).flush({ data: { benCallID: 'ben-1' } });
  }

  it('routes a HAO agent to registration on inbound accept', () => {
    setRole('HAO');
    acceptInboundCall('1539175449.1040000000');

    expect(router.navigate).toHaveBeenCalledWith(['/innerpage', 'registration']);
    expect(callStore.onCall()).toBe(true);
    flushStartCall();
  });

  it('routes a plain RO agent to registration on inbound accept', () => {
    setRole('RO');
    acceptInboundCall('1539175449.1040000001');

    expect(router.navigate).toHaveBeenCalledWith(['/innerpage', 'registration']);
    flushStartCall();
  });

  it('routes an MO agent straight to their own workspace, not registration', () => {
    setRole('MO');
    acceptInboundCall('1539175449.1040000002');

    expect(router.navigate).toHaveBeenCalledWith(['/innerpage', 'mo']);
    flushStartCall();
  });

  it('routes a CO agent straight to their own workspace, not registration', () => {
    setRole('CO');
    acceptInboundCall('1539175449.1040000003');

    expect(router.navigate).toHaveBeenCalledWith(['/innerpage', 'co']);
    flushStartCall();
  });
});
