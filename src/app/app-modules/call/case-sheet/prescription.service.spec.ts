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

import { PrescriptionService } from './prescription.service';
import { SavePrescriptionRequest } from './prescription.models';

/**
 * Pins the exact legacy `PrescriptionService` endpoint paths and payload/
 * response envelope handling — these must match legacy's `services/
 * prescriptionServices/prescription.service.ts` exactly, since the backend
 * contract is unchanged by this rewrite.
 */
describe('PrescriptionService', () => {
  let service: PrescriptionService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PrescriptionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function expectOne(urlFragment: string) {
    return http.expectOne((req) => req.url.includes(urlFragment));
  }

  it('getDrugList posts to beneficiary/getDrugDetailList and drops rows missing an id or name', () => {
    let result: unknown;
    service.getDrugList(7).subscribe((drugs) => (result = drugs));

    const req = expectOne('beneficiary/getDrugDetailList');
    expect(req.request.body).toEqual({ providerServiceMapID: 7 });
    req.flush({
      data: [
        { drugMapID: 1, drugName: ' Paracetamol ', drugGroupName: 'Analgesic' },
        { drugMapID: null, drugName: 'Dropped (no id)' },
        { drugName: 'Dropped (no name is fine, this has one)' },
      ],
    });

    expect(result).toEqual([{ drugMapID: 1, drugName: 'Paracetamol', drugGroupName: 'Analgesic' }]);
  });

  it('getStrengths posts to beneficiary/get/drugStrength and de-dupes trimmed values', () => {
    let result: unknown;
    service.getStrengths(3).subscribe((strengths) => (result = strengths));

    const req = expectOne('beneficiary/get/drugStrength');
    expect(req.request.body).toEqual({ serviceProviderID: 3 });
    req.flush({ data: [{ drugStrength: ' 500mg ' }, { drugStrength: '500mg' }, { drugStrength: '' }] });

    expect(result).toEqual(['500mg']);
  });

  it('getFrequencies posts to beneficiary/get/drugFrequency', () => {
    let result: unknown;
    service.getFrequencies().subscribe((frequencies) => (result = frequencies));

    const req = expectOne('beneficiary/get/drugFrequency');
    expect(req.request.body).toEqual({});
    req.flush({ data: [{ frequency: 'OD' }, { frequency: 'BD' }] });

    expect(result).toEqual(['OD', 'BD']);
  });

  it('getPrescriptionList posts to beneficiary/get/prescriptionList with the beneficiaryRegID', () => {
    let result: unknown;
    service.getPrescriptionList(42).subscribe((history) => (result = history));

    const req = expectOne('beneficiary/get/prescriptionList');
    expect(req.request.body).toEqual({ beneficiaryRegID: 42 });
    req.flush({ data: [{ prescriptionID: 9 }] });

    expect(result).toEqual([{ prescriptionID: 9 }]);
  });

  it('savePrescription posts the exact legacy payload shape to beneficiary/save/prescription', () => {
    const payload: SavePrescriptionRequest = {
      userID: 1,
      beneficiaryRegID: 42,
      benCallID: '123',
      createdBy: 'agent',
      providerServiceMapID: 7,
      diagnosisProvided: 'Fever',
      remarks: 'Take after food',
      prescribedDrugs: [
        {
          drugMapID: 1,
          dosage: '500mg',
          drugRoute: 'Oral',
          noOfDays: '5',
          frequency: 'BD',
          timeToConsume: null,
          sideEffects: null,
          deleted: false,
          createdBy: 'agent',
        },
      ],
    };

    let result: unknown;
    service.savePrescription(payload).subscribe((res) => (result = res));

    const req = expectOne('beneficiary/save/prescription');
    expect(req.request.body).toEqual(payload);
    req.flush({ data: { prescriptionID: 99 } });

    expect(result).toEqual({ prescriptionID: 99 });
  });

  it('savePrescription surfaces a non-200 envelope as an error', () => {
    const outcome = jasmine.createSpyObj<{ next: () => void; error: (e: unknown) => void }>('observer', [
      'next',
      'error',
    ]);
    service
      .savePrescription({
        userID: null,
        beneficiaryRegID: null,
        benCallID: null,
        createdBy: '',
        providerServiceMapID: null,
        diagnosisProvided: '',
        remarks: null,
        prescribedDrugs: [],
      })
      .subscribe(outcome);

    expectOne('beneficiary/save/prescription').flush({ statusCode: 500, errorMessage: 'Backend rejected' });

    expect(outcome.next).not.toHaveBeenCalled();
    expect(outcome.error).toHaveBeenCalledWith(
      jasmine.objectContaining({ status: 500, errorMessage: 'Backend rejected' }),
    );
  });
});
