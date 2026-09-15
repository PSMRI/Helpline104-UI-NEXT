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
import { Router, provideRouter } from '@angular/router';

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

describe('DashboardHeaderComponent logout', () => {
  it('closes the backend session via user/userLogout before clearing the client session', () => {
    TestBed.configureTestingModule({
      imports: [DashboardHeaderComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(CzentrixService), 'endCtiSession');
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    const fixture = TestBed.createComponent(DashboardHeaderComponent);
    fixture.componentInstance.logout();

    const req = http.expectOne((r) => r.url.endsWith('user/userLogout'));
    expect(req.request.method).toBe('POST');
    req.flush({ data: null });
    expect(navigate).toHaveBeenCalled();
    http.verify();
  });
});
