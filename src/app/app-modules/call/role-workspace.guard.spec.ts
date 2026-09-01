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

import { AuthStore } from '../core/auth/auth.store';

import { roleWorkspaceGuard } from './role-workspace.guard';

/**
 * A CO agent typing `/innerpage/hao` (or any other role's URL) must not reach
 * that role's shell — legacy made this impossible by construction (one route,
 * switched on an in-memory `current_role`); this app's per-role routes reopen
 * the gap, which is exactly what {@link roleWorkspaceGuard} closes.
 */
describe('roleWorkspaceGuard', () => {
  let authStore: AuthStore;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    authStore = TestBed.inject(AuthStore);
  });

  afterEach(() => sessionStorage.clear());

  function snapshotFor(path: string): ActivatedRouteSnapshot {
    return { routeConfig: { path } } as ActivatedRouteSnapshot;
  }

  function run(path: string): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => roleWorkspaceGuard(snapshotFor(path), {} as RouterStateSnapshot)) as
      | boolean
      | UrlTree;
  }

  function setRole(featureCode: string): void {
    authStore.setSession({
      token: 'test-token',
      user: { userID: 1, agentID: 2145, userName: '104hao', status: 'Active' },
    });
    authStore.setCurrentRole({
      roleID: 1,
      roleName: featureCode,
      serviceID: 42,
      serviceName: '104',
      serviceProviderID: 1,
      providerServiceMapID: 42,
      workingLocationID: 1,
      apimanClientKey: null,
      featureCode,
    });
  }

  it('allows a HAO agent onto /innerpage/hao', () => {
    setRole('HAO');
    expect(run('hao')).toBe(true);
  });

  it('allows a CO agent onto /innerpage/co', () => {
    setRole('CO');
    expect(run('co')).toBe(true);
  });

  it('redirects a CO agent away from /innerpage/hao instead of rendering the HAO shell', () => {
    setRole('CO');
    const result = run('hao');
    expect(result).not.toBe(true);
    expect((result as UrlTree).toString()).toBe('/innerpage/co');
  });

  it('redirects an MO agent away from /innerpage/pd', () => {
    setRole('MO');
    const result = run('pd');
    expect(result).not.toBe(true);
    expect((result as UrlTree).toString()).toBe('/innerpage/mo');
  });

  it('redirects to the dispatcher root when the role has no workspace at all (plain RO)', () => {
    setRole('RO');
    const result = run('hao');
    expect(result).not.toBe(true);
    expect((result as UrlTree).toString()).toBe('/innerpage');
  });

  it('redirects away from /innerpage/counsellor for every role — no featureCode maps to it today', () => {
    setRole('CO');
    const result = run('counsellor');
    expect(result).not.toBe(true);
  });

  it('allows a hybrid RO+HAO agent (RO role, holds a Health_Advice screen) onto /innerpage/hao', () => {
    // setSession resets currentRole as a fresh-login side effect, so the
    // privileges must be set here, before setCurrentRole — not via setRole().
    authStore.setSession({
      token: 'test-token',
      user: { userID: 1, agentID: 2145, userName: '104hao', status: 'Active' },
      privileges: [
        {
          serviceName: '104',
          roles: [
            {
              RoleName: 'RO',
              serviceRoleScreenMappings: [{ screen: { screenName: 'Health_Advice' } }],
            },
          ],
        },
      ],
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
    expect(run('hao')).toBe(true);
  });
});
