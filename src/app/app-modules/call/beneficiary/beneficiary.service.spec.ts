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

import { BeneficiaryService } from './beneficiary.service';
import { RegisterBeneficiaryRequest } from './beneficiary.models';

/**
 * `create()` (`beneficiary/create`, the registration submit) had no request
 * timeout at all before this fix — a hung backend left the agent stuck on the
 * submit spinner forever with no recovery path. The app is zoneless, so
 * `fakeAsync`/`tick` (zone.js) are not available; the 20s deadline is driven
 * with `jasmine.clock()` instead.
 */
describe('BeneficiaryService request timeout', () => {
  let service: BeneficiaryService;
  let http: HttpTestingController;

  beforeEach(() => {
    jasmine.clock().install();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BeneficiaryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    jasmine.clock().uninstall();
  });

  it('create() errors instead of hanging past the 20s deadline', () => {
    let failure: Error | undefined;
    service
      .create({} as RegisterBeneficiaryRequest)
      .subscribe({ error: (err: Error) => (failure = err) });

    http.expectOne((req) => req.url.includes('beneficiary/create'));
    jasmine.clock().tick(20001);

    expect(failure).toBeDefined();
  });
});
