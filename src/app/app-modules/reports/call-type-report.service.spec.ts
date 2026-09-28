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

import { ReportError } from './call-type-report.models';
import { CallTypeReportService } from './call-type-report.service';

describe('CallTypeReportService', () => {
  let service: CallTypeReportService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CallTypeReportService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const request = () => ({
    calledServiceID: 1,
    callTypeID: 2,
    receivedRoleName: 'HAO',
    pageNo: 1,
    pageSize: 10,
    cDICallStatus: 'Pending',
  });

  function expectFilter() {
    return http.expectOne((req) => req.url.includes('call/filterCallListPage'));
  }

  it('resolves the worklist payload on a success envelope', () => {
    let result: unknown;
    service.filterCallList(request()).subscribe((res) => (result = res));

    expectFilter().flush({ statusCode: 200, data: { workList: [{ benCallID: 1 }], totalPages: 3 } });

    expect(result).toEqual({ workList: [{ benCallID: 1 }], totalPages: 3 });
  });

  it('errors with the backend message on a 200 carrying a failure envelope', () => {
    let failure: ReportError | undefined;
    service.filterCallList(request()).subscribe({ error: (err: ReportError) => (failure = err) });

    expectFilter().flush({ statusCode: 5000, errorMessage: 'No data found', data: null });

    expect(failure).toEqual({ status: 5000, errorMessage: 'No data found' });
  });

  it('falls back to the generic message on a 5xx without a body message', () => {
    let failure: ReportError | undefined;
    service.filterCallList(request()).subscribe({ error: (err: ReportError) => (failure = err) });

    expectFilter().flush(null, { status: 502, statusText: 'Bad Gateway' });

    expect(failure?.status).toBe(502);
    expect(failure?.errorMessage).toBe('Internal issue, please try again later.');
  });

  describe('request timeout', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('errors with a status-0 timeout message instead of hanging past 20s', () => {
      let failure: ReportError | undefined;
      service.filterCallList(request()).subscribe({ error: (err: ReportError) => (failure = err) });

      expectFilter();

      jasmine.clock().tick(19999);
      expect(failure).toBeUndefined();

      jasmine.clock().tick(2);
      expect(failure).toEqual({
        status: 0,
        errorMessage: 'The request timed out. Please check your connection and try again.',
      });
    });
  });
});
