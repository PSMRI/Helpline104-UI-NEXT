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

import { errorSanitizerInterceptor } from './error-sanitizer.interceptor';

const GENERIC = 'Something went wrong. Please try again or contact support.';

/**
 * A raw server message is replaced before it reaches the screen, but the
 * original has to survive somewhere. `/\b java\.\b/`-style patterns hid
 * `Cannot invoke "java.util.List.iterator()" because "benPhoneMapModelList"
 * is null` on the registration Modify path — the message that named the
 * missing field — leaving only generic copy to debug from.
 */
describe('errorSanitizerInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let logged: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([errorSanitizerInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    logged = spyOn(console, 'error');
  });

  afterEach(() => httpMock.verify());

  it('gives the caller generic copy but logs the original server message', () => {
    const original = 'Cannot invoke "java.util.List.iterator()" because "benPhoneMapModelList" is null';
    let body: { errorMessage?: string } | undefined;

    http.post<{ errorMessage?: string }>('/common-api/beneficiary/update', {}).subscribe((res) => (body = res));
    httpMock.expectOne('/common-api/beneficiary/update').flush({ statusCode: 5005, errorMessage: original });

    expect(body?.errorMessage).toBe(GENERIC);
    expect(logged).toHaveBeenCalledWith('[http] server error message hidden from the user:', original);
  });

  it('logs once, not twice, for a raw string error body', () => {
    let failure: string | undefined;

    http.post('/common-api/beneficiary/update', {}).subscribe({
      error: (err: { error?: string }) => (failure = err.error),
    });
    httpMock
      .expectOne('/common-api/beneficiary/update')
      .flush('java.lang.NullPointerException', { status: 500, statusText: 'Server Error' });

    expect(failure).toBe(GENERIC);
    expect(logged).toHaveBeenCalledTimes(1);
  });

  it('leaves a user-facing message untouched and logs nothing', () => {
    let body: { errorMessage?: string } | undefined;

    http.post<{ errorMessage?: string }>('/common-api/beneficiary/update', {}).subscribe((res) => (body = res));
    httpMock.expectOne('/common-api/beneficiary/update').flush({ statusCode: 5000, errorMessage: 'No data found' });

    expect(body?.errorMessage).toBe('No data found');
    expect(logged).not.toHaveBeenCalled();
  });
});
