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

import { EmergencyContactsViewComponent } from './emergency-contacts-view.component';

const GSON_ERROR =
  "Failed making field 'java.text.SimpleDateFormat#serialVersionOnStream' accessible; either increase its visibility or write a custom TypeAdapter for its declaring type.";
const LOAD_ERROR = 'Unable to load emergency contacts. Please try again.';

describe('EmergencyContactsViewComponent load errors', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<EmergencyContactsViewComponent>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [EmergencyContactsViewComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EmergencyContactsViewComponent);
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.includes('notification/getNotificationType'))
      .flush({ statusCode: 200, data: [{ notificationTypeID: 7, notificationType: 'Emergency Contact' }] });
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function alertText(): string {
    return (fixture.nativeElement.querySelector('[role="alert"]')?.textContent ?? '').trim();
  }

  it('never shows a Gson/Java exception envelope to the agent', () => {
    http
      .expectOne((req) => req.url.includes('notification/getEmergencyContacts'))
      .flush({ statusCode: 5000, errorMessage: GSON_ERROR });
    fixture.detectChanges();

    expect(alertText()).toBe(LOAD_ERROR);
    expect(fixture.nativeElement.textContent).not.toContain('TypeAdapter');
  });

  it('maps an HTTP 5xx to the translated load error', () => {
    http
      .expectOne((req) => req.url.includes('notification/getEmergencyContacts'))
      .flush('Internal Server Error', { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();

    expect(alertText()).toBe(LOAD_ERROR);
  });

  it('shows a non-fault business message verbatim', () => {
    http
      .expectOne((req) => req.url.includes('notification/getEmergencyContacts'))
      .flush({ statusCode: 400, errorMessage: 'Emergency contacts not configured for this service' });
    fixture.detectChanges();

    expect(alertText()).toBe('Emergency contacts not configured for this service');
  });
});
