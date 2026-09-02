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

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { AuthStore } from './auth.store';
import { authGuard } from './auth.guard';

/**
 * A deep link redirect to /login previously always dropped the originally
 * requested URL (audit #21) — login success unconditionally navigated to
 * role-selection, with no round trip back. This pins that the guard now
 * attaches it as returnUrl.
 */
describe('authGuard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  afterEach(() => sessionStorage.clear());

  function runGuard(requestedUrl: string) {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: requestedUrl } as RouterStateSnapshot),
    );
  }

  it('allows activation when authenticated', () => {
    TestBed.inject(AuthStore).setSession({
      token: 't',
      user: { userID: 1, agentID: null, userName: 'someuser', status: 'Active' },
    });

    expect(runGuard('/dashboard')).toBe(true);
  });

  it('redirects to /login with the requested URL as returnUrl when unauthenticated', () => {
    const result = runGuard('/reports/call-type?startDate=2026-01-01') as UrlTree;

    expect(result.toString()).toContain('/login');
    expect(result.queryParams['returnUrl']).toBe('/reports/call-type?startDate=2026-01-01');
  });
});
