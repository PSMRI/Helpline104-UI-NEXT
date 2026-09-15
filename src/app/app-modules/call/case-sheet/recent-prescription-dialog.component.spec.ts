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

import { Z_MODAL_DATA, ZardDialogRef } from '@common-ui/ui/dialog';

import { AuthStore } from '../../core/auth/auth.store';
import { CallStore } from '../call.store';
import { PrescriptionRecord } from './prescription.models';
import { RecentPrescriptionDialogComponent } from './recent-prescription-dialog.component';

/**
 * Legacy's Resend Prescription modal (`case-sheet-recentPrescription-modal`).
 * These assertions moved here with the feature: the resend checkboxes, the
 * alternate number and Send SMS live in this dialog, not in the prescription
 * form, because legacy keeps the two history tables separate.
 */
describe('RecentPrescriptionDialogComponent', () => {
  let http: HttpTestingController;
  let closed: jasmine.Spy;

  const records: PrescriptionRecord[] = [
    {
      prescriptionID: 5,
      diagnosisProvided: 'Fever',
      remarks: 'after food',
      createdDate: new Date().toISOString(),
      prescribedDrugs: [
        { prescribedDrugID: 501, drugName: 'Paracetamol', dosage: '500mg', frequency: 'BD', noOfDays: '5' },
      ],
    },
  ];

  beforeEach(() => {
    closed = jasmine.createSpy('close');
    TestBed.configureTestingModule({
      imports: [RecentPrescriptionDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Z_MODAL_DATA, useValue: { records } },
        { provide: ZardDialogRef, useValue: { close: closed } },
      ],
    });
    http = TestBed.inject(HttpTestingController);

    const authStore = TestBed.inject(AuthStore);
    authStore.setSession({
      token: 't',
      user: { userID: 1, agentID: 100, userName: 'agent', status: 'Active' },
    });
    authStore.setCurrentRole({
      roleID: 1,
      roleName: 'MO',
      serviceID: 55,
      serviceName: '104',
      serviceProviderID: 1,
      providerServiceMapID: 7,
      workingLocationID: null,
      apimanClientKey: null,
      featureCode: 'MO',
    });
    TestBed.inject(CallStore).setBeneficiaryId(42, null);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function render() {
    const fixture = TestBed.createComponent(RecentPrescriptionDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('flattens each prescription into one row per prescribed drug, as legacy does', () => {
    const fixture = render();
    const rows = fixture.componentInstance.rows();
    expect(rows.length).toBe(1);
    expect(rows[0]).toEqual(
      jasmine.objectContaining({
        prescriptionID: 5,
        prescribedDrugID: 501,
        diagnosisProvided: 'Fever',
        drugName: 'Paracetamol',
        dosage: '500mg',
        frequency: 'BD',
        noOfDays: '5',
        remarks: 'after food',
      }),
    );
  });

  it('cannot send until a drug line is selected', () => {
    const fixture = render();
    expect(fixture.componentInstance.canSend()).toBeFalse();

    fixture.componentInstance.toggle(501);
    expect(fixture.componentInstance.canSend()).toBeTrue();
  });

  it('rejects an alternate number that is not exactly 10 digits', () => {
    const fixture = render();
    const c = fixture.componentInstance;
    c.toggle(501);
    c.toggleAlt();

    c.altNumber.set('12345');
    expect(c.altNumberValid()).toBeFalse();
    expect(c.canSend()).toBeFalse();

    c.altNumber.set('9876543210');
    expect(c.altNumberValid()).toBeTrue();
    expect(c.canSend()).toBeTrue();
  });

  it('sends one SMS request per selected drug via the Prescription SMS template', () => {
    const fixture = render();
    fixture.componentInstance.toggle(501);

    fixture.componentInstance.send();

    const typesReq = http.expectOne((r) => r.url.includes('sms/getSMSTypes'));
    expect(typesReq.request.body).toEqual({ serviceID: 55 });
    typesReq.flush({
      data: [
        { smsTypeID: 9, smsType: 'Registration SMS' },
        { smsTypeID: 11, smsType: 'Prescription SMS' },
      ],
    });

    const templatesReq = http.expectOne((r) => r.url.includes('sms/getSMSTemplates'));
    expect(templatesReq.request.body).toEqual({ providerServiceMapID: 7, smsTemplateTypeID: 11 });
    templatesReq.flush({ data: [{ smsTemplateID: 21, smsTemplateName: 'Rx template', deleted: false }] });

    const sendReq = http.expectOne((r) => r.url.includes('sms/sendSMS'));
    expect(sendReq.request.body).toEqual([
      {
        beneficiaryRegID: 42,
        smsTemplateID: 21,
        smsTemplateTypeID: 11,
        providerServiceMapID: 7,
        createdBy: 'agent',
        alternateNo: null,
        is1097: false,
        prescribedDrugID: 501,
      },
    ]);
    sendReq.flush({ data: {} });

    // Legacy dismisses the modal once the messages are away.
    expect(closed).toHaveBeenCalled();
  });

  it('no-ops when the service has no Prescription SMS type configured', () => {
    const fixture = render();
    fixture.componentInstance.toggle(501);

    fixture.componentInstance.send();

    http.expectOne((r) => r.url.includes('sms/getSMSTypes')).flush({ data: [{ smsTypeID: 9, smsType: 'Other' }] });

    expect(fixture.componentInstance.sending()).toBeFalse();
    expect(closed).not.toHaveBeenCalled();
    http.expectNone((r) => r.url.includes('sms/getSMSTemplates'));
    http.expectNone((r) => r.url.includes('sms/sendSMS'));
  });
});
