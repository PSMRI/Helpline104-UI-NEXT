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
import { provideRouter } from '@angular/router';

import { AuthStore } from '../core/auth/auth.store';

import { CallStore } from './call.store';
import { CallWrapupService } from './call-wrapup.service';

/**
 * Caller-disconnect wrap-up flow, pinned against the legacy
 * `innerpage.component`'s `startCallWraupup`/`closeCall("wrapup exceeded")`
 * contract (see the class doc comment on {@link CallWrapupService}).
 *
 * The app is zoneless, so `fakeAsync`/`tick` (zone.js machinery) are not
 * available here — the countdown's `setInterval` is driven with
 * `jasmine.clock()` instead, which needs no zone.
 */
describe('CallWrapupService', () => {
  let service: CallWrapupService;
  let callStore: CallStore;
  let authStore: AuthStore;
  let http: HttpTestingController;

  const ROLE_ID = 7;
  const SERVICE_ID = 42;
  const AGENT_ID = 2145;

  beforeEach(() => {
    jasmine.clock().install();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service = TestBed.inject(CallWrapupService);
    callStore = TestBed.inject(CallStore);
    authStore = TestBed.inject(AuthStore);
    http = TestBed.inject(HttpTestingController);

    authStore.setSession({
      token: 'test-token',
      user: { userID: 1, agentID: AGENT_ID, userName: '104hao', status: 'Active' },
    });
    authStore.setCurrentRole({
      roleID: ROLE_ID,
      roleName: 'HAO',
      serviceID: SERVICE_ID,
      serviceName: '104',
      serviceProviderID: 1,
      providerServiceMapID: SERVICE_ID,
      workingLocationID: 1,
      apimanClientKey: null,
      featureCode: 'HAO',
    });
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
    jasmine.clock().uninstall();
  });

  function connectCall(sessionId = '1786464598330'): void {
    callStore.startCall({ cli: '9876543210', sessionId });
  }

  function respondWrapupTime(isWrapUpTime: boolean, wrapUpTime: number): void {
    http
      .expectOne((req) => req.url.includes(`user/role/${ROLE_ID}`))
      .flush({ data: { isWrapUpTime, wrapUpTime } });
  }

  /** Drain a countdown already known to be active, so it does not leak into other specs. */
  function drainCountdown(): void {
    http.expectOne((req) => req.url.includes('getCallTypesV1')).flush({ data: [] });
  }

  it('is a no-op with no active call', () => {
    service.handleCallerDisconnect('some-call-id');
    expect(service.disconnectedByCaller()).toBe(false);
    http.expectNone(() => true);
  });

  it('is a no-op for a call id that does not match the active call', () => {
    connectCall('1786464598330');
    service.handleCallerDisconnect('a-different-call-id');
    expect(service.disconnectedByCaller()).toBe(false);
    http.expectNone(() => true);
  });

  it('starts the grace period for the active call and fetches the role-based wrap-up time', () => {
    connectCall('1786464598330');
    service.handleCallerDisconnect('1786464598330');
    expect(service.disconnectedByCaller()).toBe(true);

    respondWrapupTime(true, 45);
    expect(service.secondsRemaining()).toBe(45);

    jasmine.clock().tick(3000);
    expect(service.secondsRemaining()).toBe(42);

    jasmine.clock().tick(42000);
    drainCountdown();
  });

  it('falls back to the 30s default when the role has no configured wrap-up time', () => {
    connectCall();
    service.handleCallerDisconnect('1786464598330');
    respondWrapupTime(false, 999);
    expect(service.secondsRemaining()).toBe(30);

    jasmine.clock().tick(30000);
    drainCountdown();
  });

  it('falls back to the 30s default when the wrap-up-time lookup errors', () => {
    connectCall();
    service.handleCallerDisconnect('1786464598330');
    http.expectOne((req) => req.url.includes(`user/role/${ROLE_ID}`)).flush('error', { status: 500, statusText: 'Server Error' });
    expect(service.secondsRemaining()).toBe(30);

    jasmine.clock().tick(30000);
    drainCountdown();
  });

  it('falls back to the 30s default when the backend reports a non-positive wrap-up time', () => {
    connectCall();
    service.handleCallerDisconnect('1786464598330');
    respondWrapupTime(true, 0);
    expect(service.secondsRemaining()).toBe(30);

    jasmine.clock().tick(30000);
    drainCountdown();
  });

  it('falls back to the 30s default when the backend reports a non-numeric wrap-up time', () => {
    connectCall();
    service.handleCallerDisconnect('1786464598330');
    http
      .expectOne((req) => req.url.includes(`user/role/${ROLE_ID}`))
      .flush({ data: { isWrapUpTime: true, wrapUpTime: Number.NaN } });
    expect(service.secondsRemaining()).toBe(30);

    jasmine.clock().tick(30000);
    drainCountdown();
  });

  it('ignores a repeat disconnect event for a call already being wrapped up', () => {
    connectCall('1786464598330');
    service.handleCallerDisconnect('1786464598330');
    respondWrapupTime(true, 45);

    // A second CustDisconnect for the same call must not restart the countdown.
    service.handleCallerDisconnect('1786464598330');
    http.expectNone((req) => req.url.includes(`user/role/${ROLE_ID}`));
    expect(service.secondsRemaining()).toBe(45);

    jasmine.clock().tick(45000);
    drainCountdown();
  });

  it('auto-closes with "Wrapup Exceeds" when the grace period elapses unattended', () => {
    connectCall('1786464598330');
    service.handleCallerDisconnect('1786464598330');
    respondWrapupTime(true, 5);

    jasmine.clock().tick(5000);

    http.expectOne((req) => req.url.includes('getCallTypesV1')).flush({
      data: [
        {
          callGroupType: 'Wrapup Exceeds',
          callTypes: [{ callTypeID: 28, callTypeDesc: 'For Wrapup Exceeds', callGroupType: 'Wrapup Exceeds' }],
        },
      ],
    });

    const closeReq = http.expectOne((req) => req.url.includes('closeCall'));
    expect(closeReq.request.body).toEqual(
      jasmine.objectContaining({
        benCallID: '1786464598330',
        callID: '1786464598330',
        callType: 'Wrapup Exceeds',
        callTypeID: 28,
        isFollowupRequired: false,
        requestedFor: 'wrapup exceeded',
        endCall: true,
        IsOutbound: false,
        agentID: AGENT_ID,
        providerServiceMapID: SERVICE_ID,
        createdBy: '104hao',
      }),
    );
    closeReq.flush({ statusCode: 200 });

    expect(callStore.onCall()).toBe(false);
    // disconnectedByCaller resets via the constructor's effect() watching
    // onCall — under real change detection that flushes on the next tick;
    // here it needs an explicit flush to observe synchronously.
    TestBed.flushEffects();
    expect(service.disconnectedByCaller()).toBe(false);
  });

  it('does not auto-close if the agent manually ends the call while the call-types lookup is in flight', () => {
    connectCall('1786464598330');
    service.handleCallerDisconnect('1786464598330');
    respondWrapupTime(true, 5);

    jasmine.clock().tick(5000);
    const callTypesReq = http.expectOne((req) => req.url.includes('getCallTypesV1'));

    // The agent submits a manual disposition (elsewhere in the app) before
    // this in-flight lookup resolves.
    callStore.endCall();

    // The lookup now resolves — auto-close must not fire for a call that has
    // already ended, and must not send a second closeCall for it.
    callTypesReq.flush({
      data: [
        {
          callGroupType: 'Wrapup Exceeds',
          callTypes: [{ callTypeID: 28, callTypeDesc: 'For Wrapup Exceeds', callGroupType: 'Wrapup Exceeds' }],
        },
      ],
    });
    http.expectNone((req) => req.url.includes('closeCall'));
  });

  it('resets the wrap-up state once the call ends, by any path', () => {
    connectCall('1786464598330');
    service.handleCallerDisconnect('1786464598330');
    respondWrapupTime(true, 45);
    expect(service.disconnectedByCaller()).toBe(true);

    // The agent submits a manual disposition before the grace period elapses.
    callStore.endCall();
    TestBed.flushEffects();

    expect(service.disconnectedByCaller()).toBe(false);
    expect(service.secondsRemaining()).toBe(0);

    // The timer must actually be cleared, not just the signal reset — no
    // getCallTypesV1/closeCall call should fire once the original deadline passes.
    jasmine.clock().tick(45000);
  });
});
