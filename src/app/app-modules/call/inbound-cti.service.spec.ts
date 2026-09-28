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
import { CTI_DEBUG_STORAGE_KEY, InboundCtiService } from './inbound-cti.service';

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

  it('does not look the beneficiary up by call id for a HAO agent, who identifies the caller on registration', () => {
    setRole('HAO');
    acceptInboundCall('1539175449.1040000005');
    flushStartCall();

    expect(callStore.beneficiaryPending()).toBeFalse();
    expect(http.match((req) => req.url.includes('call/beneficiaryByCallID'))).toEqual([]);
  });

  const TRANSFERRED_BENEFICIARY = {
    beneficiaryRegID: 555,
    firstName: 'Asha',
    actualAge: 30,
    m_gender: { genderID: 2, genderName: 'Female' },
    i_bendemographics: { districtID: 9 },
  };

  /**
   * A transferred call: the receiving role's `call/startCall` answers with no
   * beneficiary at all; `call/beneficiaryByCallID` is what carries the one the
   * previous leg identified (verified against the live UAT backend).
   */
  function expectBeneficiaryByCallID(sessionId: string) {
    const req = http.expectOne((r) => r.url.includes('call/beneficiaryByCallID'));
    expect(req.request.body).toEqual({ callID: sessionId, is1097: false });
    return req;
  }

  it('sends the receiving role and called service on startCall', () => {
    setRole('MO');
    acceptInboundCall('1539175449.1040000002');

    const req = http.expectOne((r) => r.url.includes('call/startCall'));
    expect(req.request.body.receivedRoleName).toBe('MO');
    expect(req.request.body.calledServiceID).toBe(42);
    req.flush({ data: { benCallID: 'ben-1' } });
    expectBeneficiaryByCallID('1539175449.1040000002').flush({ data: { response: 'null' } });
  });

  it('routes an MO agent to their own workspace immediately, before startCall answers', () => {
    setRole('MO');
    acceptInboundCall('1539175449.1040000002');

    expect(router.navigate).toHaveBeenCalledWith(['/innerpage', 'mo']);
    expect(callStore.beneficiaryPending()).toBeTrue();

    flushStartCall();
    expectBeneficiaryByCallID('1539175449.1040000002').flush({ data: { response: 'null' } });
  });

  it('seeds the store from beneficiaryByCallID after startCall, so the open MO workspace picks the beneficiary up', () => {
    setRole('MO');
    acceptInboundCall('1539175449.1040000002');
    expect(http.match((req) => req.url.includes('call/beneficiaryByCallID'))).toEqual([]);

    flushStartCall();
    expectBeneficiaryByCallID('1539175449.1040000002').flush({
      data: { benCallID: 'ben-1', beneficiaryRegID: 555, i_beneficiary: TRANSFERRED_BENEFICIARY },
    });

    expect(callStore.beneficiaryId()).toBe(555);
    expect(callStore.districtID()).toBe(9);
    expect(callStore.demographics()?.firstName).toBe('Asha');
    expect(callStore.beneficiaryPending()).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalledWith(['/innerpage', 'registration']);
  });

  it('routes a CO agent to their own workspace immediately and seeds the transferred beneficiary afterwards', () => {
    setRole('CO');
    acceptInboundCall('1539175449.1040000003');

    expect(router.navigate).toHaveBeenCalledWith(['/innerpage', 'co']);

    flushStartCall();
    expectBeneficiaryByCallID('1539175449.1040000003').flush({
      data: { benCallID: 'ben-1', beneficiaryRegID: 555, i_beneficiary: TRANSFERRED_BENEFICIARY },
    });

    expect(callStore.beneficiaryId()).toBe(555);
  });

  it('still looks the beneficiary up by call id when startCall itself failed', () => {
    setRole('MO');
    acceptInboundCall('1539175449.1040000006');
    spyOn(console, 'warn');

    http
      .expectOne((req) => req.url.includes('call/startCall'))
      .flush({ errorMessage: 'boom' }, { status: 500, statusText: 'Server Error' });
    expectBeneficiaryByCallID('1539175449.1040000006').flush({
      data: { benCallID: 'ben-1', beneficiaryRegID: 555, i_beneficiary: TRANSFERRED_BENEFICIARY },
    });

    expect(callStore.beneficiaryId()).toBe(555);
  });

  it('leaves the store without a beneficiary and sends the MO agent to registration on a { response: "null" } reply', () => {
    setRole('MO');
    acceptInboundCall('1539175449.1040000004');

    flushStartCall();
    expectBeneficiaryByCallID('1539175449.1040000004').flush({ data: { response: 'null' } });

    expect(callStore.beneficiaryId()).toBeNull();
    expect(callStore.demographics()).toBeNull();
    expect(callStore.beneficiaryPending()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/innerpage', 'registration']);
  });

  it('warns (never toasts) and sends the MO agent to registration when beneficiaryByCallID fails', () => {
    setRole('MO');
    acceptInboundCall('1539175449.1040000007');
    const warn = spyOn(console, 'warn');

    flushStartCall();
    expectBeneficiaryByCallID('1539175449.1040000007').flush(
      { errorMessage: 'boom' },
      { status: 500, statusText: 'Server Error' },
    );

    expect(warn).toHaveBeenCalled();
    expect(callStore.beneficiaryId()).toBeNull();
    expect(callStore.beneficiaryPending()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/innerpage', 'registration']);
  });

  it('ignores a beneficiaryByCallID reply for a call that has since ended', () => {
    setRole('MO');
    acceptInboundCall('1539175449.1040000008');
    flushStartCall();
    callStore.endCall();
    (router.navigate as jasmine.Spy).calls.reset();

    expectBeneficiaryByCallID('1539175449.1040000008').flush({
      data: { benCallID: 'ben-1', beneficiaryRegID: 555, i_beneficiary: TRANSFERRED_BENEFICIARY },
    });

    expect(callStore.beneficiaryId()).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  describe('debug log', () => {
    let info: jasmine.Spy;

    beforeEach(() => {
      info = spyOn(console, 'info');
    });

    afterEach(() => localStorage.removeItem(CTI_DEBUG_STORAGE_KEY));

    function post(data: unknown, origin = window.location.origin): void {
      window.dispatchEvent(new MessageEvent('message', { data, origin }));
    }

    function logged(): string[] {
      return info.calls.allArgs().map((args) => String(args[0]));
    }

    it('logs nothing while the flag is off', () => {
      setRole('MO');
      post('garbage', 'https://evil.example');

      expect(info).not.toHaveBeenCalled();
    });

    it('logs the origin and raw data before the origin check drops a foreign message', () => {
      localStorage.setItem(CTI_DEBUG_STORAGE_KEY, '1');
      setRole('MO');
      post('Accept|9034862882|1.2|INBOUND', 'https://evil.example');

      expect(logged()).toEqual(['[cti-debug] received', '[cti-debug] dropped: origin']);
      expect(info.calls.argsFor(0)[1]).toEqual({ origin: 'https://evil.example', data: 'Accept|9034862882|1.2|INBOUND' });
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('names the eligibility check when a supervisor session drops the message', () => {
      localStorage.setItem(CTI_DEBUG_STORAGE_KEY, '1');
      setRole('Supervisor');
      post('Accept|9034862882|1.3|INBOUND');

      expect(logged()).toEqual(['[cti-debug] received', '[cti-debug] dropped: ineligible']);
      expect(info.calls.argsFor(1)[1]).toEqual(jasmine.objectContaining({ agentID: AGENT_ID, featureCode: 'Supervisor' }));
    });

    it('names the parser when a trusted, eligible message is not a CTI event', () => {
      localStorage.setItem(CTI_DEBUG_STORAGE_KEY, '1');
      setRole('MO');
      post('accept|9034862882|1.4|TRANSFER');

      expect(logged()).toEqual(['[cti-debug] received', '[cti-debug] dropped: parse']);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('reports an accepted inbound call and a re-posted duplicate', () => {
      localStorage.setItem(CTI_DEBUG_STORAGE_KEY, '1');
      setRole('HAO');
      acceptInboundCall('1.5');
      acceptInboundCall('1.5');

      expect(logged()).toEqual([
        '[cti-debug] received',
        '[cti-debug] accepted: inbound',
        '[cti-debug] received',
        '[cti-debug] dropped: duplicate',
      ]);
      flushStartCall();
    });
  });
});
