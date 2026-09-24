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

import { CzentrixService } from '../../core/services/czentrix.service';
import { CtiKeyNoticeComponent } from './cti-key-notice.component';

describe('CtiKeyNoticeComponent', () => {
  let czentrix: CzentrixService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [CtiKeyNoticeComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    czentrix = TestBed.inject(CzentrixService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function render() {
    const fixture = TestBed.createComponent(CtiKeyNoticeComponent);
    fixture.detectChanges();
    return fixture;
  }

  function captureCredentials(): void {
    czentrix.startCtiSession('dimpi', 'encrypted-pw', null).subscribe();
    http.expectOne((req) => req.url.includes('cti/getLoginKey')).flush({ data: {} });
  }

  it('explains the missing key and offers Retry, without the failure text, before any retry', () => {
    const fixture = render();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('The telephony session key was not received from CZentrix.');
    expect(text).not.toContain('Still unavailable');
    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });

  it('shows the retry-failed text without a request when no login credentials were captured', () => {
    const fixture = render();
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();

    http.expectNone((req) => req.url.includes('cti/getLoginKey'));
    expect(fixture.componentInstance.retrying()).toBeFalse();
    expect(fixture.componentInstance.retryFailed()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Still unavailable. Please log out and log in again.');
  });

  it('re-requests the key with the captured credentials and clears the notice state on success', () => {
    captureCredentials();
    const fixture = render();

    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.retrying()).toBeTrue();

    const retry = http.expectOne((req) => req.url.includes('cti/getLoginKey'));
    expect(retry.request.body).toEqual({ username: 'dimpi', password: 'encrypted-pw' });
    retry.flush({ data: { login_key: 'fresh-key' } });
    fixture.detectChanges();

    expect(fixture.componentInstance.retrying()).toBeFalse();
    expect(fixture.componentInstance.retryFailed()).toBeFalse();
    expect(czentrix.loginKey()).toBe('fresh-key');
  });

  it('shows the retry-failed text when the refresh request fails, and lets the user retry again', () => {
    captureCredentials();
    const fixture = render();

    fixture.nativeElement.querySelector('button').click();
    http.expectOne((req) => req.url.includes('cti/getLoginKey')).flush('fail', { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.retryFailed()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Still unavailable. Please log out and log in again.');
    expect(czentrix.loginKey()).toBeNull();

    fixture.nativeElement.querySelector('button').click();
    http.expectOne((req) => req.url.includes('cti/getLoginKey')).flush({ data: { login_key: 'k2' } });
    fixture.detectChanges();
    expect(fixture.componentInstance.retryFailed()).toBeFalse();
    expect(czentrix.loginKey()).toBe('k2');
  });

  it('shows the retry-failed text when the envelope carries no key', () => {
    captureCredentials();
    const fixture = render();

    fixture.nativeElement.querySelector('button').click();
    http
      .expectOne((req) => req.url.includes('cti/getLoginKey'))
      .flush({ statusCode: 5002, errorMessage: 'Agent not logged in' });
    fixture.detectChanges();

    expect(fixture.componentInstance.retryFailed()).toBeTrue();
    expect(czentrix.loginKey()).toBeNull();
  });
});
