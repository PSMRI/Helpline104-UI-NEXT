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

import { CallTypeReportComponent } from './call-type-report.component';

describe('CallTypeReportComponent results rendering', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CallTypeReportComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  function render() {
    const fixture = TestBed.createComponent(CallTypeReportComponent);
    fixture.detectChanges();
    http.match(() => true).forEach((req) => req.flush({ data: [] }));
    fixture.detectChanges();
    return fixture;
  }

  it('shows the empty-results table after a successful search', () => {
    const fixture = render();
    fixture.componentInstance.searched.set(true);
    fixture.componentInstance.rows.set([]);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('table')).not.toBeNull();
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows only the error banner, not the table, when the search failed', () => {
    const fixture = render();
    fixture.componentInstance.searched.set(true);
    fixture.componentInstance.rows.set([]);
    fixture.componentInstance.errorMessage.set('Internal issue, please try again later.');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('table')).toBeNull();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Internal issue, please try again later.');
  });

  it('surfaces the report error through the error banner and hides the table', () => {
    const fixture = render();
    fixture.componentInstance.filterForm.patchValue({ startDate: '2026-01-01', endDate: '2026-01-31' });
    fixture.componentInstance.goToPage(1);
    http
      .expectOne((req) => req.url.includes('call/filterCallListPage'))
      .flush({ statusCode: 5000, errorMessage: 'No data found', data: null });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance.errorMessage()).toBe('No data found');
    expect(el.querySelector('table')).toBeNull();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('No data found');
  });

  it('no longer renders the deferred soft-phone footer copy', () => {
    const fixture = render();
    fixture.componentInstance.searched.set(true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('CTI soft-phone integration');
  });
});
