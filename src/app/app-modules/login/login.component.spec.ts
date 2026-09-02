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
import { ActivatedRoute, Router, provideRouter } from '@angular/router';

import { LoginComponent } from './login.component';

/**
 * `authGuard`'s redirect to /login now carries the originally requested URL
 * as a `returnUrl` query param (audit #21) — this pins that a successful
 * login round-trips there instead of always landing on role-selection, and
 * that only an internal path is honoured (never an open redirect via a
 * crafted `returnUrl`).
 */
describe('LoginComponent returnUrl handling', () => {
  let http: HttpTestingController;
  let router: Router;

  function render(returnUrl: string | null) {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => returnUrl } } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);

    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return fixture;
  }

  function submitAndFlush(fixture: ReturnType<typeof render>) {
    const component = fixture.componentInstance;
    component.form.controls.userID.setValue('104hao');
    component.form.controls.password.setValue('Test@123');
    component.submit();

    http.expectOne((req) => req.url.includes('userAuthenticate')).flush({
      statusCode: 200,
      data: {
        key: 'token',
        isAuthenticated: true,
        Status: 'Active',
        userID: 1,
        previlegeObj: [{ serviceName: '104', providerServiceMapID: 9, roles: [{ RoleID: 1, RoleName: 'HAO' }] }],
      },
    });
  }

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('navigates to the returnUrl after a successful login when one is present', () => {
    const fixture = render('/reports/call-type');
    submitAndFlush(fixture);

    expect(router.navigateByUrl).toHaveBeenCalledWith('/reports/call-type');
  });

  it('falls back to role-selection when no returnUrl is present', () => {
    const fixture = render(null);
    submitAndFlush(fixture);

    expect(router.navigateByUrl).toHaveBeenCalledWith('/role-selection');
  });

  it('rejects a protocol-relative returnUrl (open-redirect attempt) and falls back to role-selection', () => {
    const fixture = render('//evil.example.com');
    submitAndFlush(fixture);

    expect(router.navigateByUrl).toHaveBeenCalledWith('/role-selection');
  });

  it('rejects a returnUrl that is not an internal path', () => {
    const fixture = render('https://evil.example.com');
    submitAndFlush(fixture);

    expect(router.navigateByUrl).toHaveBeenCalledWith('/role-selection');
  });
});
