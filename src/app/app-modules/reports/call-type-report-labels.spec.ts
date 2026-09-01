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

import { CallTypeReportComponent } from './call-type-report.component';

/**
 * The Start/End Date, Status and Rows-per-page filter controls had no for/id
 * pairing (audit #94, MEDIUM). HTTP fired by ngOnInit is left unflushed
 * deliberately — this spec only asserts static DOM structure.
 */
describe('CallTypeReportComponent field labels', () => {
  it('associates every filter control with its label', () => {
    TestBed.configureTestingModule({
      imports: [CallTypeReportComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(CallTypeReportComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    for (const id of ['startDate', 'endDate', 'status', 'pageSize']) {
      expect(el.querySelector(`label[for="${id}"]`)).withContext(`label[for=${id}]`).not.toBeNull();
      expect(el.querySelector(`#${id}`)).withContext(`#${id}`).not.toBeNull();
    }
  });
});
