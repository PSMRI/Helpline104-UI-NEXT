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

import { CallStatisticsService } from './call-statistics.service';
import { CallStatistics } from './dashboard.store';

/**
 * `cti/getAgentCallStats` was verified live against UAT (agent 2145, 2026-09):
 * every field arrives as a string, and the three duration fields are
 * pre-formatted `HH:MM:SS`, not raw seconds — the opposite of what the
 * store's `CallStatistics` interface expects, so the parsing in
 * {@link CallStatisticsService} is the load-bearing part of this file.
 */
describe('CallStatisticsService', () => {
  let service: CallStatisticsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CallStatisticsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('parses HH:MM:SS duration strings to whole seconds and the call count to a number', () => {
    let result: CallStatistics | undefined;
    service.getCallStatistics(2145).subscribe((res) => (result = res));

    http.expectOne((req) => req.url.includes('cti/getAgentCallStats')).flush({
      data: {
        transaction_id: 'CTI_AGENT_CALL_RECORD',
        agent_id: '2145',
        total_calls: '2',
        total_invalid_calls: '0',
        total_call_duration: '00:01:31',
        total_free_time: '07:26:27',
        total_break_time: '00:00:00',
        response_code: '1',
        status: 'SUCCESS',
      },
      statusCode: 200,
      errorMessage: 'Success',
      status: 'Success',
    });

    expect(result).toEqual({
      callDurationSeconds: 91,
      breakTimeSeconds: 0,
      freeTimeSeconds: 26787,
      totalCalls: 2,
    });
  });

  it('sends the legacy agent_id body', () => {
    service.getCallStatistics(2145).subscribe();

    const req = http.expectOne((r) => r.url.includes('cti/getAgentCallStats'));
    expect(req.request.body).toEqual({ agent_id: 2145 });
    req.flush({ data: {} });
  });

  it('resolves to all-zero statistics when the envelope carries no data', () => {
    let result: CallStatistics | undefined;
    service.getCallStatistics(2145).subscribe((res) => (result = res));

    http.expectOne((req) => req.url.includes('cti/getAgentCallStats')).flush({ statusCode: 200 });

    expect(result).toEqual({
      callDurationSeconds: 0,
      breakTimeSeconds: 0,
      freeTimeSeconds: 0,
      totalCalls: 0,
    });
  });

  it('treats a malformed duration string as zero rather than throwing', () => {
    let result: CallStatistics | undefined;
    service.getCallStatistics(2145).subscribe((res) => (result = res));

    http.expectOne((req) => req.url.includes('cti/getAgentCallStats')).flush({
      data: { total_calls: 'not-a-number', total_call_duration: 'garbage' },
    });

    expect(result).toEqual({
      callDurationSeconds: 0,
      breakTimeSeconds: 0,
      freeTimeSeconds: 0,
      totalCalls: 0,
    });
  });

  it('rejects out-of-range and negative HH:MM:SS components as zero', () => {
    let result: CallStatistics | undefined;
    service.getCallStatistics(2145).subscribe((res) => (result = res));

    http.expectOne((req) => req.url.includes('cti/getAgentCallStats')).flush({
      data: { total_call_duration: '00:60:00', total_free_time: '00:00:-1', total_break_time: '01:02:03.5' },
    });

    expect(result).toEqual({
      callDurationSeconds: 0,
      breakTimeSeconds: 0,
      freeTimeSeconds: 0,
      totalCalls: 0,
    });
  });

  it('rejects a negative or fractional total_calls as zero', () => {
    let first: CallStatistics | undefined;
    let second: CallStatistics | undefined;
    service.getCallStatistics(2145).subscribe((res) => (first = res));
    http.expectOne((req) => req.url.includes('cti/getAgentCallStats')).flush({ data: { total_calls: '-3' } });

    service.getCallStatistics(2145).subscribe((res) => (second = res));
    http.expectOne((req) => req.url.includes('cti/getAgentCallStats')).flush({ data: { total_calls: '2.5' } });

    expect(first?.totalCalls).toBe(0);
    expect(second?.totalCalls).toBe(0);
  });
});
