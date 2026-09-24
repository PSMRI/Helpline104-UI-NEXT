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

import { HaoRequestError } from './hao.models';
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

  // Every method in this file was missing a request timeout — a hung backend
  // left the caller (and its loading spinner) stuck forever. The app is
  // zoneless, so `fakeAsync`/`tick` (zone.js) are not available; the 20s
  // deadline is driven with `jasmine.clock()` instead.
  describe('request timeout', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('closeCall errors instead of hanging past the 20s deadline', () => {
      let failure: Error | undefined;
      service.closeCall(closeRequest()).subscribe({ error: (err: Error) => (failure = err) });

      expectOne('call/closeCall');

      jasmine.clock().tick(19999);
      expect(failure).toBeUndefined();

      jasmine.clock().tick(2);
      expect(failure).toBeDefined();
    });
  });
});

describe('HaoService case-sheet and services error normalisation', () => {
  let service: HaoService;
  let http: HttpTestingController;

  const TIMEOUT_MESSAGE = 'The request timed out. Please check your connection and try again.';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HaoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const caseSheetRequest = () =>
    ({ beneficiaryRegID: 5006622, chiefComplaints: 'Fever' }) as unknown as Parameters<HaoService['saveCaseSheet']>[0];

  function expectOne(urlFragment: string) {
    return http.expectOne((req) => req.url.includes(urlFragment));
  }

  describe('saveCaseSheet', () => {
    it('resolves the saved payload on a success envelope', () => {
      let result: unknown;
      service.saveCaseSheet(caseSheetRequest()).subscribe((res) => (result = res));

      expectOne('beneficiary/save/benCaseSheet').flush({ statusCode: 200, status: 'Success', data: { benCaseSheetID: 9 } });

      expect(result).toEqual({ benCaseSheetID: 9 });
    });

    it('errors with the backend message on a 200 carrying statusCode 5000 instead of reporting success', () => {
      let result: unknown;
      let failure: HaoRequestError | undefined;
      service.saveCaseSheet(caseSheetRequest()).subscribe({
        next: (res) => (result = res),
        error: (err: HaoRequestError) => (failure = err),
      });

      expectOne('beneficiary/save/benCaseSheet').flush({
        statusCode: 5000,
        status: 'FAILURE',
        errorMessage: 'Beneficiary not found',
        data: null,
      });

      expect(result).toBeUndefined();
      expect(failure).toEqual({ status: 5000, errorMessage: 'Beneficiary not found' });
    });

    it('errors on a 200 whose status reads "Failed with …" even with an OK statusCode', () => {
      let failure: HaoRequestError | undefined;
      service.saveCaseSheet(caseSheetRequest()).subscribe({ error: (err: HaoRequestError) => (failure = err) });

      expectOne('beneficiary/save/benCaseSheet').flush({ statusCode: 200, status: 'Failed with NPE at 12:00' });

      expect(failure?.status).toBe(200);
    });

    it('carries the HTTP status and body message on a 5xx', () => {
      let failure: HaoRequestError | undefined;
      service.saveCaseSheet(caseSheetRequest()).subscribe({ error: (err: HaoRequestError) => (failure = err) });

      expectOne('beneficiary/save/benCaseSheet').flush(
        { errorMessage: 'Database unavailable' },
        { status: 503, statusText: 'Service Unavailable' },
      );

      expect(failure).toEqual({ status: 503, errorMessage: 'Database unavailable' });
    });

    it('leaves the message empty on a 5xx with no body message so the caller can use its own copy', () => {
      let failure: HaoRequestError | undefined;
      service.saveCaseSheet(caseSheetRequest()).subscribe({ error: (err: HaoRequestError) => (failure = err) });

      expectOne('beneficiary/save/benCaseSheet').flush(null, { status: 500, statusText: 'Internal Server Error' });

      expect(failure).toEqual({ status: 500, errorMessage: '' });
    });

    it('passes a 5002 envelope through as success — session expiry is the interceptor\'s to own', () => {
      let completed = false;
      service.saveCaseSheet(caseSheetRequest()).subscribe({ next: () => (completed = true) });

      expectOne('beneficiary/save/benCaseSheet').flush({ statusCode: 5002, errorMessage: 'Session expired' });

      expect(completed).toBeTrue();
    });
  });

  describe('getAvailableServices', () => {
    it('errors with the backend message on a failure envelope', () => {
      let failure: HaoRequestError | undefined;
      service.getAvailableServices(1, true).subscribe({ error: (err: HaoRequestError) => (failure = err) });

      expectOne('beneficiary/get/services').flush({ statusCode: 5000, errorMessage: 'No services mapped' });

      expect(failure).toEqual({ status: 5000, errorMessage: 'No services mapped' });
    });

    it('normalises an HTTP failure', () => {
      let failure: HaoRequestError | undefined;
      service.getAvailableServices(1, true).subscribe({ error: (err: HaoRequestError) => (failure = err) });

      expectOne('beneficiary/get/services').flush(null, { status: 504, statusText: 'Gateway Timeout' });

      expect(failure).toEqual({ status: 504, errorMessage: '' });
    });

    it('rejects a null serviceID without a request', () => {
      let failure: HaoRequestError | undefined;
      service.getAvailableServices(null, true).subscribe({ error: (err: HaoRequestError) => (failure = err) });

      expect(failure).toEqual({ status: 0, errorMessage: '' });
    });
  });

  describe('request timeout', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('saveCaseSheet errors with the status-0 timeout message past the 20s deadline', () => {
      let failure: HaoRequestError | undefined;
      service.saveCaseSheet(caseSheetRequest()).subscribe({ error: (err: HaoRequestError) => (failure = err) });

      expectOne('beneficiary/save/benCaseSheet');

      jasmine.clock().tick(19999);
      expect(failure).toBeUndefined();

      jasmine.clock().tick(2);
      expect(failure).toEqual({ status: 0, errorMessage: TIMEOUT_MESSAGE });
    });

    it('getAvailableServices errors with the status-0 timeout message past the 20s deadline', () => {
      let failure: HaoRequestError | undefined;
      service.getAvailableServices(1, true).subscribe({ error: (err: HaoRequestError) => (failure = err) });

      expectOne('beneficiary/get/services');

      jasmine.clock().tick(20001);
      expect(failure).toEqual({ status: 0, errorMessage: TIMEOUT_MESSAGE });
    });
  });
});
