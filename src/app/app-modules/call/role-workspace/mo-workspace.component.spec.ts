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
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthStore } from '../../core/auth/auth.store';
import { MoWorkspaceComponent } from './mo-workspace.component';

/**
 * Mirrors legacy `104-mo.component.ts`'s `checkCOPrivilege` / `navigateToCO`:
 * the "Switch to CO" hand-off is offered only when the agent also holds the
 * CO role on the 104 service, and it moves the agent to the CO workspace
 * without touching the call/beneficiary state (which is shared via CallStore,
 * not re-fetched on role switch).
 */
describe('MoWorkspaceComponent', () => {
  let authStore: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MoWorkspaceComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    authStore = TestBed.inject(AuthStore);
  });

  afterEach(() => sessionStorage.clear());

  function render() {
    const fixture = TestBed.createComponent(MoWorkspaceComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('offers Switch to CO when the agent also holds the CO role on the 104 service', () => {
    authStore.setSession({
      token: 't',
      user: { userID: 1, agentID: 100, userName: 'agent', status: 'Active' },
      privileges: [{ serviceName: '104', roles: [{ RoleName: 'MO' }, { RoleName: 'CO' }] }],
    });

    const fixture = render();

    expect(fixture.componentInstance.hasCoPrivilege()).toBeTrue();
  });

  it('hides Switch to CO when the agent has no CO role on the 104 service', () => {
    authStore.setSession({
      token: 't',
      user: { userID: 1, agentID: 100, userName: 'agent', status: 'Active' },
      privileges: [{ serviceName: '104', roles: [{ RoleName: 'MO' }] }],
    });

    const fixture = render();

    expect(fixture.componentInstance.hasCoPrivilege()).toBeFalse();
  });

  it('hides Switch to CO when the CO role is held on a different service', () => {
    authStore.setSession({
      token: 't',
      user: { userID: 1, agentID: 100, userName: 'agent', status: 'Active' },
      privileges: [{ serviceName: '1097', roles: [{ RoleName: 'CO' }] }],
    });

    const fixture = render();

    expect(fixture.componentInstance.hasCoPrivilege()).toBeFalse();
  });

  it('goToCo navigates to the CO workspace (legacy roleChanged.emit("CO"))', () => {
    const fixture = render();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.goToCo();

    expect(navigateSpy).toHaveBeenCalledWith(['/innerpage/co']);
  });
});
