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

import { toast } from 'ngx-sonner';

import { CaseSheetComponent } from './case-sheet.component';

/**
 * A failed diagnosis-catalogue fetch previously left the selector empty with
 * zero indication it had failed vs. genuinely having no matches (audit #39).
 */
describe('CaseSheetComponent diagnosis catalogue failure', () => {
  it('surfaces a toast and leaves the diagnosis list empty when getAvailableDiseases fails', () => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [CaseSheetComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    const toastSpy = spyOn(toast, 'error');
    const http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(CaseSheetComponent);
    fixture.detectChanges();

    http.expectOne((req) => req.url.includes('diseaseController/getAvailableDiseases')).flush('boom', {
      status: 500,
      statusText: 'Server Error',
    });

    expect(toastSpy).toHaveBeenCalledWith('Could not load the diagnosis list. You can still type a chief complaint by hand.');
    expect(fixture.componentInstance.diseases()).toEqual([]);

    http.verify();
    sessionStorage.clear();
  });
});
