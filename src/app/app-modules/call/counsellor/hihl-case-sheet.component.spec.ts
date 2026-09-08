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

import { of } from 'rxjs';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { CallStore } from '../call.store';
import { HihlCaseSheetComponent } from './hihl-case-sheet.component';
import { HihlMasterData } from './hihl-case-sheet.models';

const MASTER_DATA: HihlMasterData = {
  psychiatricChiefComplaints: [
    { psychiatricChiefComplaintId: 1, psychiatricChiefComplaintName: 'Insomnia' },
    { psychiatricChiefComplaintId: 2, psychiatricChiefComplaintName: 'Other' },
  ],
  m_104appetite: [{ appetiteName: 'Normal' }],
  m_104sleep: [{ slipName: 'Normal' }, { slipName: 'Disturbed' }, { slipName: 'Excessive' }],
  m_104hygieneselfcare: [{ hygieneseSelfCareName: 'Adequate' }],
  m_104bladder: [{ bladderName: 'Normal' }],
  m_104bowel: [{ bowelName: 'Normal' }],
  m_104libido: [{ libidoName: 'Normal' }],
  m_104regularworok: [{ regularWorkName: 'Yes' }],
  m_104issuesatworkplace: [{ issueAtWorkPlaceName: 'None' }],
  m_104householdwork: [{ houseHoldWorkName: 'Yes' }],
  m_104gettingwithfamily: [{ gettingWithFamilyName: 'Good' }],
  m_104precipitatingfactor: [{ precipitatingFactorName: 'None' }, { precipitatingFactorName: 'Stress' }],
  m_104pastpsychiatriccondition: [{ pastPsychiatricConditionId: 1, pastPsychiatricConditionName: 'None' }],
  m_104treatmenttype: [{ treatmentTypeName: 'Medication' }],
  m_104progress: [{ progressName: 'Improving' }],
  m_104course: [{ courseName: 'Continuous' }],
  m_104pastmedicalcondition: [{ pastMedicalConditionId: 1, pastMedicalConditionName: 'None' }],
  m_104familycondition: [
    { familyConditionId: 1, familyConditionName: 'None' },
    { familyConditionId: 2, familyConditionName: 'Depression' },
  ],
  m_104relationship: [{ relationShipName: 'Mother' }],
};

describe('HihlCaseSheetComponent', () => {
  let callStore: CallStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HihlCaseSheetComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    callStore = TestBed.inject(CallStore);
    http = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(ConfirmDialogService), 'confirm').and.returnValue(of(true));
    callStore.startCall({ cli: '9876543210', sessionId: 'sess-1' });
    callStore.setBeneficiaryId(42);
    callStore.setDemographics({ firstName: 'Test', lastName: null, age: 30, genderId: null, genderName: null });
  });

  afterEach(() => http.verify());

  function render() {
    const fixture = TestBed.createComponent(HihlCaseSheetComponent);
    fixture.componentRef.setInput('beneficiaryId', 42);
    fixture.componentRef.setInput('callId', 'call-1');
    fixture.detectChanges();
    http.expectOne((req) => req.url.includes('hihl/get/masters')).flush({ data: MASTER_DATA });
    fixture.detectChanges();
    return fixture;
  }

  it('adds a new chief-complaint row and removes one', () => {
    const fixture = render();
    const component = fixture.componentInstance;

    expect(component.complaints.length).toBe(1);

    component.complaints.at(0).patchValue({
      chiefComplaint: MASTER_DATA.psychiatricChiefComplaints![0],
      duration: 2,
      unitOfDuration: 'Weeks',
    });
    component.addComplaint();
    expect(component.complaints.length).toBe(2);

    component.removeComplaint(1);
    expect(component.complaints.length).toBe(1);
  });

  it('disables non-Normal sleep options once Normal is selected (mutual exclusivity)', () => {
    const fixture = render();
    const component = fixture.componentInstance;

    component.form.controls.sleep.setValue(['Normal']);
    component.disableSleepValue.set(true);

    expect(component.sleepOptionDisabled('Normal')).toBeFalse();
    expect(component.sleepOptionDisabled('Disturbed')).toBeTrue();
    expect(component.sleepOptionDisabled('Excessive')).toBeTrue();
  });

  it('disables the Normal option once a non-Normal sleep value is selected', () => {
    const fixture = render();
    const component = fixture.componentInstance;

    component.form.controls.sleep.setValue(['Disturbed']);
    component.disableFactorValue.set(null);
    component.disableSleepValue.set(false);

    expect(component.sleepOptionDisabled('Normal')).toBeTrue();
    expect(component.sleepOptionDisabled('Disturbed')).toBeFalse();
  });

  it('disables Family Members once the Family Condition is None', () => {
    const fixture = render();
    const component = fixture.componentInstance;

    const row = component.familyDiseaseList.at(0);
    expect(component.familyMembersDisabled(row)).toBeTrue();

    row.patchValue({ familyCondition: MASTER_DATA.m_104familycondition![1] });
    expect(component.familyMembersDisabled(row)).toBeFalse();

    row.patchValue({ familyCondition: MASTER_DATA.m_104familycondition![0] });
    expect(component.familyMembersDisabled(row)).toBeTrue();
  });

  it('saves the HIHL case sheet for the active beneficiary', () => {
    const fixture = render();
    const component = fixture.componentInstance;

    component.form.patchValue({ summary: 'Doing well' });
    component.form.markAsDirty();
    component.save();

    const req = http.expectOne((r) => r.url.includes('hihl/save/casesheet'));
    expect(req.request.body.beneficiaryRegID).toBe(42);
    expect(req.request.body.summary).toBe('Doing well');
    req.flush({ data: {} });

    fixture.detectChanges();
    expect(component.saving()).toBeFalse();
  });
});
