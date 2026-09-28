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
import { catchError, firstValueFrom, of } from 'rxjs';

import { SupervisorError, isNoDataFound } from '../shared/supervisor-api';
import { SupervisorReportsService } from './reports.service';

const REPORT_URL = 'crmReports/getUnblockedUserReport';

describe('SupervisorReportsService report downloads', () => {
  let service: SupervisorReportsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SupervisorReportsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function requestAndFail(body: Blob | string | null, status: number): Promise<SupervisorError> {
    const result = firstValueFrom(
      service.getUnblockedUserReport({}).pipe(catchError((err: SupervisorError) => of(err))),
    ) as Promise<SupervisorError>;
    http.expectOne((req) => req.url.includes(REPORT_URL)).flush(body, { status, statusText: 'Server Error' });
    return result;
  }

  it('requests the workbook as a blob', () => {
    service.getUnblockedUserReport({ fromDate: 'x' }).subscribe();
    const req = http.expectOne((r) => r.url.includes(REPORT_URL));
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['ok']));
  });

  it('reads a JSON envelope out of a 500 blob body so "No data found" is recognised as an empty result', async () => {
    const err = await requestAndFail(
      new Blob([JSON.stringify({ errorMessage: 'No data found', statusCode: 500 })], { type: 'application/json' }),
      500,
    );
    expect(err.status).toBe(500);
    expect(err.errorMessage).toBe('No data found');
    expect(isNoDataFound(err)).toBeTrue();
  });

  it('uses a plain-text 500 blob body verbatim', async () => {
    const err = await requestAndFail(new Blob(['No data found'], { type: 'text/plain' }), 500);
    expect(isNoDataFound(err)).toBeTrue();
  });

  it('keeps a real server fault distinct from an empty result', async () => {
    const err = await requestAndFail(
      new Blob([JSON.stringify({ errorMessage: 'JDBC exception executing SQL' })], { type: 'application/json' }),
      500,
    );
    expect(err.status).toBe(500);
    expect(isNoDataFound(err)).toBeFalse();
  });

  it('falls back to the generic message when the blob body is empty', async () => {
    const err = await requestAndFail(new Blob([]), 502);
    expect(err.status).toBe(502);
    expect(err.errorMessage).toBe('Internal issue, please try again later.');
    expect(isNoDataFound(err)).toBeFalse();
  });
});

/**
 * The gateway cuts a slow report off at 60s with an HTML 504, so the client
 * deadline is matched to it. The app is zoneless, so `fakeAsync`/`tick`
 * (zone.js) are not available; the deadline is driven with `jasmine.clock()`.
 */
describe('SupervisorReportsService report timeout', () => {
  let service: SupervisorReportsService;
  let http: HttpTestingController;

  beforeEach(() => {
    jasmine.clock().install();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SupervisorReportsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    jasmine.clock().uninstall();
  });

  it('errors just after the 60s deadline and not before', () => {
    let failure: SupervisorError | undefined;
    service.getUnblockedUserReport({}).subscribe({ error: (err: SupervisorError) => (failure = err) });

    http.expectOne((req) => req.url.includes(REPORT_URL));

    jasmine.clock().tick(59999);
    expect(failure).toBeUndefined();

    jasmine.clock().tick(2);
    expect(failure?.status).toBe(0);
    expect(failure?.errorMessage).toBe('The request timed out. Please check your connection and try again.');
  });
});
