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

import { AuthStore } from '../../core/auth/auth.store';
import { CallStore } from '../call.store';
import { PrescriptionComponent } from './prescription.component';

describe('PrescriptionComponent', () => {
  let authStore: AuthStore;
  let callStore: CallStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PrescriptionComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    authStore = TestBed.inject(AuthStore);
    callStore = TestBed.inject(CallStore);
    http = TestBed.inject(HttpTestingController);

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
    callStore.setBeneficiaryId(42, null);
    callStore.setCallId('call-1');
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function render(recentPrescriptions: unknown[] = []) {
    const fixture = TestBed.createComponent(PrescriptionComponent);
    fixture.detectChanges();
    http.expectOne((r) => r.url.includes('getDrugDetailList')).flush({
      data: [{ drugMapID: 1, drugName: 'Paracetamol', drugGroupName: 'Analgesic' }],
    });
    http.expectOne((r) => r.url.includes('drugStrength')).flush({ data: [{ drugStrength: '500mg' }] });
    http.expectOne((r) => r.url.includes('drugFrequency')).flush({ data: [{ frequency: 'BD' }] });
    http.expectOne((r) => r.url.includes('prescriptionList')).flush({ data: recentPrescriptions });
    fixture.detectChanges();
    return fixture;
  }

  function addOneDrugLine(fixture: ReturnType<typeof render>): void {
    const c = fixture.componentInstance;
    c.lineForm.setValue({
      drugName: 'Paracetamol',
      drugMapID: 1,
      strength: '500mg',
      route: 'Oral',
      frequency: 'BD',
      noOfDays: '5',
      remarks: '',
    });
    c.addLine();
    fixture.detectChanges();
  }

  it('loads drug/strength/frequency masters and prescription history on init', () => {
    const fixture = render();
    expect(fixture.componentInstance.drugNames()).toEqual(['Paracetamol']);
    expect(fixture.componentInstance.strengths()).toEqual(['500mg', 'Not Applicable']);
    expect(fixture.componentInstance.frequencies()).toEqual(['BD']);
  });

  it('saves the prescription with the legacy payload shape', () => {
    const fixture = render();
    addOneDrugLine(fixture);
    fixture.componentInstance.diagnosis.setValue('Fever');

    fixture.componentInstance.save();

    const req = http.expectOne((r) => r.url.includes('beneficiary/save/prescription'));
    expect(req.request.body).toEqual(
      jasmine.objectContaining({
        beneficiaryRegID: 42,
        benCallID: 'call-1',
        createdBy: 'agent',
        providerServiceMapID: 7,
        diagnosisProvided: 'Fever',
        prescribedDrugs: [
          jasmine.objectContaining({
            drugMapID: 1,
            dosage: '500mg',
            drugRoute: 'Oral',
            noOfDays: '5',
            frequency: 'BD',
          }),
        ],
      }),
    );
    req.flush({ data: { prescriptionID: 5 } });
    // Saving reloads history.
    http.expectOne((r) => r.url.includes('prescriptionList')).flush({ data: [] });
  });

});
