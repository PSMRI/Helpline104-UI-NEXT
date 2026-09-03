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
import { Router, provideRouter } from '@angular/router';

import { AuthStore } from './app-modules/core/auth/auth.store';
import { CallStore } from './app-modules/call/call.store';
import { routes } from './app.routes';

/**
 * A plain RO (no service workspace, per role-workspace.guard.spec.ts) with an
 * active call but no beneficiary yet must land on the registration screen to
 * identify the caller — not on the bare `/innerpage` dispatcher root, which
 * `roleWorkspaceGuard` alone would produce and which then dead-ends (no
 * beneficiary to dispatch on either). This only holds if `beneficiaryGuard`
 * precedes `roleWorkspaceGuard` in each workspace route's `canActivate` array:
 * Angular's multi-guard resolution takes the first non-`true` result in array
 * order, so whichever guard is listed first wins the redirect when both fire.
 */
describe('app routes: role-workspace guard ordering', () => {
  let router: Router;
  let authStore: AuthStore;
  let callStore: CallStore;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter(routes)],
    });
    router = TestBed.inject(Router);
    authStore = TestBed.inject(AuthStore);
    callStore = TestBed.inject(CallStore);
  });

  afterEach(() => sessionStorage.clear());

  it('sends a plain RO with an active call but no beneficiary to /innerpage/registration, not /innerpage', async () => {
    authStore.setSession({
      token: 'test-token',
      user: { userID: 1, agentID: 2145, userName: '104ro', status: 'Active' },
    });
    authStore.setCurrentRole({
      roleID: 1,
      roleName: 'RO',
      serviceID: 42,
      serviceName: '104',
      serviceProviderID: 1,
      providerServiceMapID: 42,
      workingLocationID: 1,
      apimanClientKey: null,
      featureCode: 'RO',
    });
    callStore.startCall({ cli: '9876543210', sessionId: '1' });

    await router.navigateByUrl('/innerpage/hao');

    expect(router.url).toBe('/innerpage/registration');
  });
});
