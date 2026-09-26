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
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiseasesSummaryConfigComponent } from './diseases-summary-config.component';

const DISEASE_LIST = (req: { url: string }) => req.url.includes('diseaseController/getDisease');

describe('DiseasesSummaryConfigComponent catalogue list', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<DiseasesSummaryConfigComponent>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [DiseasesSummaryConfigComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DiseasesSummaryConfigComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function mainText(): string {
    return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
  }

  function retryButton(): HTMLButtonElement | undefined {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      /retry/i.test(b.textContent ?? ''),
    );
  }

  it('shows the load error with Retry and hides the empty-state row when the catalogue load fails', () => {
    http.expectOne(DISEASE_LIST).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.listError()).toBeTruthy();
    expect(retryButton()).toBeDefined();
    expect(mainText()).not.toContain('No Records Found');
  });

  it('shows the empty-state row, and no error, when the catalogue load succeeds with no rows', () => {
    http.expectOne(DISEASE_LIST).flush({ statusCode: 200, data: { DiseaseList: [], totalPages: 1 } });
    fixture.detectChanges();

    expect(fixture.componentInstance.listError()).toBe('');
    expect(retryButton()).toBeUndefined();
    expect(mainText()).toContain('No Records Found');
  });

  it('Retry re-issues the catalogue load and clears the error on success', () => {
    http.expectOne(DISEASE_LIST).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    retryButton()?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.listError()).toBe('');
    http.expectOne(DISEASE_LIST).flush({
      statusCode: 200,
      data: { DiseaseList: [{ diseaseID: 1, diseaseName: 'Malaria', summary: 'x', medicaladvice: 'y' }], totalPages: 1 },
    });
    fixture.detectChanges();

    expect(retryButton()).toBeUndefined();
    expect(mainText()).toContain('Malaria');
    expect(mainText()).not.toContain('No Records Found');
  });

  it('keeps the create form free of the list load error', () => {
    http.expectOne(DISEASE_LIST).flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    fixture.componentInstance.openCreate();
    fixture.detectChanges();

    expect(fixture.componentInstance.mode()).toBe('create');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('[role="alert"]').length).toBe(0);
    expect(mainText()).not.toContain('timed out');
  });
});
