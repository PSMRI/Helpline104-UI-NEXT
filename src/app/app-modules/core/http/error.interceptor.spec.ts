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

import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { SessionService } from '../services/session.service';
import { errorInterceptor } from './error.interceptor';

/**
 * Which failures are session expiry and which are not.
 *
 * The distinction matters because a false positive force-logs the agent out
 * mid-call: e-Health/Telemedicine case-sheet history calls answer 403 ("Access
 * denied") because the common-api token is not accepted by mmu-api/tm-api, and
 * legacy's own interceptor (http.interceptor.ts:235) treated *any* 401/403 as
 * expiry and cleared the session. A genuinely expired token returns 401 on both
 * common-api and 104-api (verified against UAT), so 401 alone is the signal.
 */
describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let expiry: jasmine.Spy;
  let activity: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    const session = TestBed.inject(SessionService);
    expiry = spyOn(session, 'handleSessionExpiry');
    activity = spyOn(session, 'notifyActivity');
  });

  afterEach(() => httpMock.verify());

  /** Fire a request and capture whether it surfaced an error to the caller. */
  function fire(url: string): { errored: () => boolean } {
    let errored = false;
    http.post(url, {}).subscribe({ next: () => undefined, error: () => (errored = true) });
    return { errored: () => errored };
  }

  it('treats a 401 as session expiry and swallows it', () => {
    const call = fire('common-api/beneficiary/get104BenMedHistory');
    httpMock.expectOne(() => true).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(expiry).toHaveBeenCalled();
    // Swallowed (EMPTY) so no component sees a spurious failure on the way out.
    expect(call.errored()).toBeFalse();
  });

  it('does NOT treat an mmu-api 403 as session expiry, and surfaces it to the caller', () => {
    const call = fire('mmu-api/common/getBeneficiaryCaseSheetHistory');
    httpMock
      .expectOne(() => true)
      .flush({ error: 'Forbidden', message: 'Access denied' }, { status: 403, statusText: 'Forbidden' });

    expect(expiry).not.toHaveBeenCalled();
    expect(call.errored()).toBeTrue();
  });

  it('does NOT treat a tm-api 403 as session expiry', () => {
    const call = fire('tm-api/common/getBeneficiaryCaseSheetHistory');
    httpMock
      .expectOne(() => true)
      .flush({ error: 'Forbidden', message: 'Access denied' }, { status: 403, statusText: 'Forbidden' });

    expect(expiry).not.toHaveBeenCalled();
    expect(call.errored()).toBeTrue();
  });

  it('does NOT treat a common-api 403 as session expiry either — expiry there is a 401', () => {
    const call = fire('common-api/beneficiary/get104BenMedHistory');
    httpMock.expectOne(() => true).flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(expiry).not.toHaveBeenCalled();
    expect(call.errored()).toBeTrue();
  });

  it('treats an in-body statusCode 5002 as session expiry', () => {
    fire('common-api/call/startCall');
    httpMock.expectOne(() => true).flush({ statusCode: 5002, errorMessage: 'Invalid session' });

    expect(expiry).toHaveBeenCalledWith('Invalid session');
  });

  it('does NOT treat a 5002 from a cti/ endpoint as session expiry', () => {
    fire('common-api/cti/getAgentState');
    httpMock.expectOne(() => true).flush({ statusCode: 5002, errorMessage: 'agent not logged in' });

    expect(expiry).not.toHaveBeenCalled();
  });

  it('does NOT force-logout on a failed login attempt', () => {
    const call = fire('common-api/user/userAuthenticate');
    httpMock.expectOne(() => true).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(expiry).not.toHaveBeenCalled();
    expect(call.errored()).toBeTrue();
  });

  it('pings the keepalive on a normal response but not on a background poll', () => {
    fire('common-api/beneficiary/get104BenMedHistory');
    httpMock.expectOne(() => true).flush({ data: [] });
    expect(activity).toHaveBeenCalled();

    activity.calls.reset();
    fire('common-api/cti/getAgentState');
    httpMock.expectOne(() => true).flush({ data: {} });
    expect(activity).not.toHaveBeenCalled();
  });
});
