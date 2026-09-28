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

import { EmergencyContactsAdminComponent } from './emergency-contacts-admin.component';

const GSON_ERROR =
  "Failed making field 'java.text.SimpleDateFormat#serialVersionOnStream' accessible; either increase its visibility or write a custom TypeAdapter for its declaring type.";
const UNAVAILABLE = 'Emergency contacts could not be loaded from the server. Please try again later.';

describe('EmergencyContactsAdminComponent load errors', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<EmergencyContactsAdminComponent>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [EmergencyContactsAdminComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EmergencyContactsAdminComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function alerts(): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="alert"]') as NodeListOf<HTMLElement>).map((el) =>
      (el.textContent ?? '').trim(),
    );
  }

  function flushDesignations(): void {
    http
      .expectOne((req) => req.url.includes('m/getDesignation'))
      .flush({ statusCode: 200, data: [{ designationID: 1, designationName: 'Doctor' }] });
  }

  function flushTypes(): void {
    http
      .expectOne((req) => req.url.includes('notification/getNotificationType'))
      .flush({ statusCode: 200, data: [{ notificationTypeID: 7, notificationType: 'Emergency Contact' }] });
  }

  it('maps a Gson/Java exception envelope on the contacts call to the translated unavailable message', () => {
    flushDesignations();
    flushTypes();
    http
      .expectOne((req) => req.url.includes('notification/getSupervisorEmergencyContacts'))
      .flush({ statusCode: 5000, errorMessage: GSON_ERROR });
    fixture.detectChanges();

    expect(fixture.componentInstance.contactsError()).toBe(UNAVAILABLE);
    expect(alerts()).toEqual([UNAVAILABLE]);
    expect(fixture.nativeElement.textContent).not.toContain('java.');
  });

  it('maps an HTTP 5xx on the contacts call to the translated unavailable message', () => {
    flushDesignations();
    flushTypes();
    http
      .expectOne((req) => req.url.includes('notification/getSupervisorEmergencyContacts'))
      .flush('Internal Server Error', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(alerts()).toEqual([UNAVAILABLE]);
  });

  it('keeps a designations failure separate from a successful contacts load', () => {
    http
      .expectOne((req) => req.url.includes('m/getDesignation'))
      .flush('Bad Gateway', { status: 502, statusText: 'Bad Gateway' });
    flushTypes();
    http
      .expectOne((req) => req.url.includes('notification/getSupervisorEmergencyContacts'))
      .flush({ statusCode: 200, data: [{ emergContactID: 1, emergContactName: 'Ambulance', emergContactNo: '108' }] });
    fixture.detectChanges();

    expect(fixture.componentInstance.designationsError()).toBe(UNAVAILABLE);
    expect(fixture.componentInstance.contactsError()).toBe('');
    expect(alerts()).toEqual([UNAVAILABLE]);
    expect(fixture.componentInstance.contacts().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Ambulance');
  });

  it('shows a business error message verbatim when it is not a server fault', () => {
    flushDesignations();
    flushTypes();
    http
      .expectOne((req) => req.url.includes('notification/getSupervisorEmergencyContacts'))
      .flush({ statusCode: 400, errorMessage: 'Service not mapped to emergency contacts' });
    fixture.detectChanges();

    expect(alerts()).toEqual(['Service not mapped to emergency contacts']);
  });

  it('clears each load error on that call succeeding', () => {
    http.expectOne((req) => req.url.includes('m/getDesignation')).flush('down', { status: 500, statusText: 'Error' });
    http
      .expectOne((req) => req.url.includes('notification/getNotificationType'))
      .flush({ statusCode: 5000, errorMessage: GSON_ERROR });
    fixture.detectChanges();
    expect(fixture.componentInstance.designationsError()).toBe(UNAVAILABLE);
    expect(fixture.componentInstance.notificationTypesError()).toBe(UNAVAILABLE);
    expect(alerts()).toEqual([UNAVAILABLE]);

    fixture.componentInstance.ngOnInit();
    flushDesignations();
    flushTypes();
    http
      .expectOne((req) => req.url.includes('notification/getSupervisorEmergencyContacts'))
      .flush({ statusCode: 200, data: [] });
    fixture.detectChanges();

    expect(fixture.componentInstance.designationsError()).toBe('');
    expect(fixture.componentInstance.notificationTypesError()).toBe('');
    expect(fixture.componentInstance.contactsError()).toBe('');
    expect(alerts()).toEqual([]);
  });
});
