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

import { HaoService } from './hao.service';

/**
 * The call-lifecycle endpoints answer HTTP 200 even when the backend rejected
 * the action, so these specs pin the envelope contract in both directions: a
 * failure envelope must reach the caller's `error:` branch (or the agent is told
 * a discarded transfer/close succeeded), and a success envelope must still
 * complete untouched.
 *
 * The success direction cannot be exercised against UAT — a genuine `closeCall`
 * success needs a CZentrix-created `t_bencall` row — which is exactly why it is
 * covered here.
 */
describe('HaoService call-lifecycle envelope handling', () => {
  let service: HaoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HaoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const closeRequest = () =>
    ({
      benCallID: '1786464598330',
      callID: '1786464598330',
      beneficiaryRegID: 5006622,
      callType: 'Wrapup Exceeds',
      callTypeID: 28,
      endCall: true,
      createdBy: '104hao',
    }) as unknown as Parameters<HaoService['closeCall']>[0];

  const transferRequest = () => ({
    transferFrom: 2145,
    transferCampaignInfo: 'H_104_Hybrid_MO',
    skillTransferFlag: false,
    skill: null,
    agentIPAddress: null,
    benCallID: '1786464598330',
    callType: 'Valid',
    callTypeID: 28,
  });

  function expectOne(urlFragment: string) {
    return http.expectOne((req) => req.url.includes(urlFragment));
  }

  describe('closeCall', () => {
    it('completes on a success envelope', () => {
      const outcome = jasmine.createSpyObj<{ next: () => void; error: () => void }>('observer', ['next', 'error']);
      service.closeCall(closeRequest()).subscribe(outcome);

      expectOne('call/closeCall').flush({ statusCode: 200, errorMessage: 'Success', status: 'Success' });

      expect(outcome.error).not.toHaveBeenCalled();
      expect(outcome.next).toHaveBeenCalled();
    });

    it('errors on a 200 carrying statusCode 5000', () => {
      let failure: Error | undefined;
      service.closeCall(closeRequest()).subscribe({ error: (err: Error) => (failure = err) });

      expectOne('call/closeCall').flush({
        statusCode: 5000,
        errorMessage: 'could not execute statement [FK constraint fails]',
        status: 'Failed with could not execute statement',
      });

      expect(failure).toBeDefined();
      expect(failure?.message).toContain('closeCall failed');
      expect(failure?.message).toContain('FK constraint fails');
    });

    // Same two-trigger split as transferCall below: an OK statusCode here leaves
    // the longer "Failed with <cause>" status as the only thing that can raise.
    it('errors on a 200 whose status reads "Failed with …", even with an OK statusCode', () => {
      let failure: Error | undefined;
      service.closeCall(closeRequest()).subscribe({ error: (err: Error) => (failure = err) });

      expectOne('call/closeCall').flush({
        statusCode: 200,
        errorMessage: 'could not execute statement [FK constraint fails]',
        status: 'Failed with could not execute statement',
      });

      expect(failure).toBeDefined();
      expect(failure?.message).toContain('closeCall failed');
      expect(failure?.message).toContain('FK constraint fails');
    });

    it("passes a 5002 envelope through — session expiry is the interceptor's to own", () => {
      const outcome = jasmine.createSpyObj<{ next: () => void; error: () => void }>('observer', ['next', 'error']);
      service.closeCall(closeRequest()).subscribe(outcome);

      expectOne('call/closeCall').flush({ statusCode: 5002, errorMessage: 'Session expired' });

      expect(outcome.error).not.toHaveBeenCalled();
      expect(outcome.next).toHaveBeenCalled();
    });
  });

  describe('transferCall', () => {
    it('completes on a success envelope and sends the legacy snake_case body', () => {
      const outcome = jasmine.createSpyObj<{ next: () => void; error: () => void }>('observer', ['next', 'error']);
      service.transferCall(transferRequest()).subscribe(outcome);

      const req = expectOne('cti/transferCall');
      expect(req.request.body).toEqual({
        transfer_from: 2145,
        transfer_campaign_info: 'H_104_Hybrid_MO',
        skill_transfer_flag: false,
        agentIPAddress: null,
        benCallID: '1786464598330',
        callType: 'Valid',
        callTypeID: 28,
      });
      req.flush({ statusCode: 200, status: 'Success' });

      expect(outcome.error).not.toHaveBeenCalled();
      expect(outcome.next).toHaveBeenCalled();
    });

    it('sends callType/callTypeID on a skill-based transfer too, not only on the default transfer', () => {
      service
        .transferCall({ ...transferRequest(), skillTransferFlag: true, skill: 'Hindi' })
        .subscribe({ next: () => undefined, error: () => undefined });

      const req = expectOne('cti/transferCall');
      expect(req.request.body).toEqual({
        transfer_from: 2145,
        transfer_campaign_info: 'H_104_Hybrid_MO',
        skill_transfer_flag: true,
        skill: 'Hindi',
        agentIPAddress: null,
        benCallID: '1786464598330',
        callType: 'Valid',
        callTypeID: 28,
      });
      req.flush({ statusCode: 200, status: 'Success' });
    });

    // The envelope check has two independent triggers — a non-200 statusCode and
    // a FAIL* status — so each is exercised on its own. Asserting both at once
    // would let either regress unnoticed behind the other.
    it('errors on a 200 whose status reports FAILURE, even with an OK statusCode', () => {
      let failure: Error | undefined;
      service.transferCall(transferRequest()).subscribe({ error: (err: Error) => (failure = err) });

      expectOne('cti/transferCall').flush({ statusCode: 200, errorMessage: 'NOT_LOGGED_IN', status: 'FAILURE' });

      expect(failure).toBeDefined();
      expect(failure?.message).toContain('transferCall failed');
      expect(failure?.message).toContain('NOT_LOGGED_IN');
    });

    it('errors on a 200 carrying statusCode 5000, even when the status reads Success', () => {
      let failure: Error | undefined;
      service.transferCall(transferRequest()).subscribe({ error: (err: Error) => (failure = err) });

      expectOne('cti/transferCall').flush({ statusCode: 5000, errorMessage: 'NOT_LOGGED_IN', status: 'Success' });

      expect(failure).toBeDefined();
      expect(failure?.message).toContain('transferCall failed');
      expect(failure?.message).toContain('NOT_LOGGED_IN');
    });

    it('completes on an empty body — endpoints that answer without an envelope stay unaffected', () => {
      const outcome = jasmine.createSpyObj<{ next: () => void; error: () => void }>('observer', ['next', 'error']);
      service.transferCall(transferRequest()).subscribe(outcome);

      expectOne('cti/transferCall').flush({});

      expect(outcome.error).not.toHaveBeenCalled();
      expect(outcome.next).toHaveBeenCalled();
    });
  });

  // A body-less answer must not be read through: it carries no failure, and a
  // TypeError here would be surfaced to the agent as a failed transfer/close —
  // the mis-report the envelope check exists to prevent. Both shapes are covered:
  // HTTP 204 No Content, and a 200 whose JSON body is literally `null`.
  describe('null response body', () => {
    const noContent = { status: 204, statusText: 'No Content' };
    const okWithNullBody = { status: 200, statusText: 'OK' };

    for (const [label, options] of [
      ['204 No Content', noContent],
      ['200 with a JSON null body', okWithNullBody],
    ] as const) {
      it(`closeCall completes on ${label}`, () => {
        const outcome = jasmine.createSpyObj<{ next: () => void; error: () => void }>('observer', ['next', 'error']);
        service.closeCall(closeRequest()).subscribe(outcome);

        expectOne('call/closeCall').flush(null, options);

        expect(outcome.error).not.toHaveBeenCalled();
        expect(outcome.next).toHaveBeenCalled();
      });

      it(`transferCall completes on ${label}`, () => {
        const outcome = jasmine.createSpyObj<{ next: () => void; error: () => void }>('observer', ['next', 'error']);
        service.transferCall(transferRequest()).subscribe(outcome);

        expectOne('cti/transferCall').flush(null, options);

        expect(outcome.error).not.toHaveBeenCalled();
        expect(outcome.next).toHaveBeenCalled();
      });
    }
  });
});
