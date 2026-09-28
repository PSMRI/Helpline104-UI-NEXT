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
import { DestroyRef, inject, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { I18nService } from '../../core/i18n/i18n.service';
import { ReportRunner } from './report-runner';
import { SupervisorReportsService } from './reports.service';

const REPORT_URL = 'crmReports/getDistrictWiseCallReport';

async function settled(runner: ReportRunner): Promise<void> {
  for (let i = 0; i < 20 && runner.loading(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('ReportRunner.view with blob error bodies', () => {
  let runner: ReportRunner;
  let service: SupervisorReportsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    runner = TestBed.runInInjectionContext(() => new ReportRunner(inject(I18nService), inject(DestroyRef)));
    service = TestBed.inject(SupervisorReportsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('treats a 500 whose blob body is {"errorMessage":"No data found"} as an empty result, not a server fault', async () => {
    runner.view(service.getDistrictWiseCallReport({}));
    http
      .expectOne((req) => req.url.includes(REPORT_URL))
      .flush(new Blob([JSON.stringify({ errorMessage: 'No data found' })], { type: 'application/json' }), {
        status: 500,
        statusText: 'Server Error',
      });
    await settled(runner);

    expect(runner.loading()).toBeFalse();
    expect(runner.searched()).toBeTrue();
    expect(runner.rows()).toEqual([]);
    expect(runner.errorMessage()).toBe('');
    expect(runner.serverError()).toBeFalse();
  });

  it('still raises the server-error banner for a 500 whose blob body is a real fault', async () => {
    runner.view(service.getDistrictWiseCallReport({}));
    http
      .expectOne((req) => req.url.includes(REPORT_URL))
      .flush(new Blob([JSON.stringify({ errorMessage: 'JDBC exception executing SQL' })], { type: 'application/json' }), {
        status: 500,
        statusText: 'Server Error',
      });
    await settled(runner);

    expect(runner.searched()).toBeTrue();
    expect(runner.serverError()).toBeTrue();
    expect(runner.errorMessage()).toBe('Report unavailable — server error. Please try again or contact support.');
  });
});
