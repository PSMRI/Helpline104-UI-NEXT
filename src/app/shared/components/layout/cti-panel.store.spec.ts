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

import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthStore } from '@/app-modules/core/auth/auth.store';

import { CtiPanelStore } from './cti-panel.store';

@Component({ standalone: true, template: '' })
class BlankComponent {}

describe('CtiPanelStore', () => {
  let store: CtiPanelStore;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: 'login', component: BlankComponent },
          { path: 'role-selection', component: BlankComponent },
          { path: 'dashboard', component: BlankComponent },
          { path: 'reports/call-type', component: BlankComponent },
        ]),
      ],
    });
    TestBed.inject(AuthStore).setSession({
      token: 't',
      user: { userID: 1, agentID: 2145, userName: '104hao', status: 'Active' },
    });
    TestBed.inject(AuthStore).setCurrentRole({
      roleID: 5,
      roleName: 'HAO',
      serviceID: 1,
      serviceName: '104',
      serviceProviderID: 1,
      providerServiceMapID: 9,
      workingLocationID: null,
      apimanClientKey: null,
      featureCode: 'HAO',
    });
    store = TestBed.inject(CtiPanelStore);
    router = TestBed.inject(Router);
  });

  afterEach(() => sessionStorage.clear());

  it('shows the toggle for an agent role on a workspace route', async () => {
    await router.navigateByUrl('/dashboard');
    expect(store.showCzentrix()).toBe(true);
  });

  it('hides the toggle on the login page even with a rehydrated session', async () => {
    await router.navigateByUrl('/login');
    expect(store.showCzentrix()).toBe(false);
  });

  it('hides the toggle on the role picker', async () => {
    await router.navigateByUrl('/role-selection');
    expect(store.showCzentrix()).toBe(false);
  });

  it('keeps showing the toggle on routes without a footer, such as reports', async () => {
    await router.navigateByUrl('/reports/call-type');
    expect(store.showCzentrix()).toBe(true);
  });
});
