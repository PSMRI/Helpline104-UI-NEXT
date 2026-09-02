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
import { provideRouter } from '@angular/router';

import { AuthStore } from '../../core/auth/auth.store';
import { ConfigService } from '../../core/services/config.service';
import { CzentrixService } from '../../core/services/czentrix.service';
import { DashboardHeaderComponent } from './dashboard-header.component';

/**
 * The License Info link was previously a literal UAT URL, so a prod build
 * would link to UAT instead of prod — this pins that it's now built from
 * ConfigService, which reads the per-environment host.
 */
describe('DashboardHeaderComponent licenseUrl', () => {
  it('is built from ConfigService.getCommonBaseURLLicense(), not a hardcoded host', () => {
    TestBed.configureTestingModule({
      imports: [DashboardHeaderComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    TestBed.overrideProvider(ConfigService, {
      useValue: { getCommonBaseURLLicense: () => 'https://prod.example.org/common-api/' },
    });

    const fixture = TestBed.createComponent(DashboardHeaderComponent);
    expect(fixture.componentInstance.licenseUrl).toBe('https://prod.example.org/common-api/license.html');
  });
});

/**
 * A manual logout previously only cleared auth keys — unlike the forced-logout
 * path (session.service.ts, idle-timeout/401/403/5002), which does a full
 * `storage.clear()`. If call/beneficiary storage keys were still populated
 * (e.g. an agent hit logout mid-call), that patient data survived a normal
 * logout on a shared browser. This pins that both paths now match.
 */
describe('DashboardHeaderComponent logout', () => {
  it('fully clears sessionStorage, not just auth keys', () => {
    sessionStorage.clear();
    sessionStorage.setItem('someUnrelatedCallStorageKey', 'still-here');

    TestBed.configureTestingModule({
      imports: [DashboardHeaderComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    TestBed.overrideProvider(CzentrixService, { useValue: { endCtiSession: () => undefined } });

    const fixture = TestBed.createComponent(DashboardHeaderComponent);
    const authStore = TestBed.inject(AuthStore);
    spyOn(authStore, 'clear');

    fixture.componentInstance.logout();

    expect(authStore.clear).toHaveBeenCalled();
    expect(sessionStorage.getItem('someUnrelatedCallStorageKey')).toBeNull();
    sessionStorage.clear();
  });
});
