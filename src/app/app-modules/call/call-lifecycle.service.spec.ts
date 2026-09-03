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

import { CallLifecycleService } from './call-lifecycle.service';

describe('CallLifecycleService', () => {
  let service: CallLifecycleService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CallLifecycleService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const request = () => ({
    beneficiaryRegID: null,
    callID: '1786464598330',
    phoneNo: '9876543210',
    agentID: 2145,
    createdBy: '104hao',
    callReceivedUserID: 501,
    isOutbound: false,
  });

  it('posts to call/startCall with the request body unchanged and resolves benCallID', () => {
    let result: { benCallID: string } | undefined;
    service.startCall(request()).subscribe((res) => (result = res));

    const req = http.expectOne((r) => r.url.includes('call/startCall'));
    expect(req.request.body).toEqual(request());
    req.flush({ data: { benCallID: '9988776655' } });

    expect(result?.benCallID).toBe('9988776655');
  });

  it('resolves an empty benCallID rather than throwing when the backend answers with no data', () => {
    let result: { benCallID: string } | undefined;
    service.startCall(request()).subscribe((res) => (result = res));

    http.expectOne((r) => r.url.includes('call/startCall')).flush({});

    expect(result?.benCallID).toBe('');
  });
});
