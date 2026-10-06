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
    callStore.setDemographics({
      firstName: 'Test',
      lastName: null,
      age: 30,
      genderId: null,
      genderName: null,
      displayId: null,
      stateName: null,
      districtName: null,
      subDistrictName: null,
      villageName: null,
      maritalStatus: null,
      category: null,
      communityName: null,
      educationName: null,
    });
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

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

  it('sends family history rows as the whole selected condition object, matching the legacy payload', () => {
    const fixture = render();
    const component = fixture.componentInstance;

    component.familyDiseaseList.at(0).patchValue({
      familyCondition: MASTER_DATA.m_104familycondition![1],
      familyMembers: ['Mother'],
    });
    component.form.markAsDirty();
    component.save();

    const req = http.expectOne((r) => r.url.includes('hihl/save/casesheet'));
    expect(req.request.body.conditionInFamilyList).toEqual([
      { familyCondition: MASTER_DATA.m_104familycondition![1], familyMembers: ['Mother'] },
    ]);
    req.flush({ data: {} });
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

  describe('multi-select fields', () => {
    type Fixture = ReturnType<typeof render>;

    function trigger(fixture: Fixture, labelId: string): HTMLButtonElement {
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        `button[aria-labelledby="${labelId}"]`,
      )!;
    }

    async function open(fixture: Fixture, labelId: string): Promise<void> {
      trigger(fixture, labelId).click();
      fixture.detectChanges();
      await fixture.whenStable();
    }

    function option(text: string): HTMLElement {
      return Array.from(document.querySelectorAll<HTMLElement>('z-select-item')).find(
        (el) => el.textContent?.trim() === text,
      )!;
    }

    function pick(fixture: Fixture, text: string): void {
      option(text).click();
      fixture.detectChanges();
    }

    function labelText(fixture: Fixture, labelId: string): string {
      return (fixture.nativeElement as HTMLElement).querySelector(`#${labelId}`)?.textContent?.trim() ?? '';
    }

    it('renders no plain multi-select boxes', () => {
      const fixture = render();

      expect((fixture.nativeElement as HTMLElement).querySelector('select[multiple]')).toBeNull();
    });

    it('labels Sleep and Possible Precipitating Factor visibly', () => {
      const fixture = render();

      expect(labelText(fixture, 'hihl-sleep-label')).toBe('Sleep');
      expect(trigger(fixture, 'hihl-sleep-label')).not.toBeNull();
      expect(labelText(fixture, 'hihl-precipitating-factor-label')).toBe('Possible Precipitating Factor(s)');
      expect(trigger(fixture, 'hihl-precipitating-factor-label')).not.toBeNull();
    });

    it('toggles each sleep option on a single click and marks the form dirty', async () => {
      const fixture = render();
      const component = fixture.componentInstance;
      await open(fixture, 'hihl-sleep-label');

      pick(fixture, 'Disturbed');
      pick(fixture, 'Excessive');

      expect(component.form.controls.sleep.value).toEqual(['Disturbed', 'Excessive']);
      expect(component.form.dirty).toBeTrue();
      expect(option('Normal').hasAttribute('data-disabled')).toBeTrue();

      pick(fixture, 'Disturbed');

      expect(component.form.controls.sleep.value).toEqual(['Excessive']);
    });

    it('picking Normal disables the other sleep options, and clicking it again releases them', async () => {
      const fixture = render();
      const component = fixture.componentInstance;
      await open(fixture, 'hihl-sleep-label');

      pick(fixture, 'Normal');

      expect(component.form.controls.sleep.value).toEqual(['Normal']);
      expect(option('Disturbed').hasAttribute('data-disabled')).toBeTrue();

      pick(fixture, 'Disturbed');
      expect(component.form.controls.sleep.value).toEqual(['Normal']);

      pick(fixture, 'Normal');

      expect(component.form.controls.sleep.value).toEqual([]);
      expect(option('Disturbed').hasAttribute('data-disabled')).toBeFalse();
      expect(option('Normal').hasAttribute('data-disabled')).toBeFalse();
    });

    it('picking None disables the other precipitating factors, and clicking it again releases them', async () => {
      const fixture = render();
      const component = fixture.componentInstance;
      await open(fixture, 'hihl-precipitating-factor-label');

      pick(fixture, 'None');

      expect(component.form.controls.precipitatingFactor.value).toEqual(['None']);
      expect(option('Stress').hasAttribute('data-disabled')).toBeTrue();

      pick(fixture, 'None');

      expect(component.form.controls.precipitatingFactor.value).toEqual([]);
      expect(option('Stress').hasAttribute('data-disabled')).toBeFalse();
    });

    it('labels Family Member visibly and keeps it disabled until a family condition is chosen', async () => {
      const fixture = render();
      const component = fixture.componentInstance;

      expect(labelText(fixture, 'hihl-family-members-label-0')).toBe('Family Member(s)');
      expect(trigger(fixture, 'hihl-family-members-label-0').disabled).toBeTrue();

      component.familyDiseaseList.at(0).patchValue({ familyCondition: MASTER_DATA.m_104familycondition![1] });
      fixture.detectChanges();

      expect(trigger(fixture, 'hihl-family-members-label-0').disabled).toBeFalse();

      await open(fixture, 'hihl-family-members-label-0');
      pick(fixture, 'Mother');

      expect(component.familyDiseaseList.at(0).value.familyMembers).toEqual(['Mother']);
    });
  });

  const PICKER_CASES = [
    {
      name: 'chief complaint',
      control: 'chiefComplaint',
      rows: (c: HihlCaseSheetComponent) => c.complaints,
      add: (c: HihlCaseSheetComponent) => c.addComplaint(),
      options: (c: HihlCaseSheetComponent, i: number) => c.chiefComplaintOptions(i),
      pick: MASTER_DATA.psychiatricChiefComplaints![0],
      label: 'Insomnia',
    },
    {
      name: 'past psychiatric condition',
      control: 'pastPsychiatricCondition',
      rows: (c: HihlCaseSheetComponent) => c.pastPsychiatricConditions,
      add: (c: HihlCaseSheetComponent) => c.addPastPsychiatricCondition(),
      options: (c: HihlCaseSheetComponent, i: number) => c.pastPsychiatricConditionOptions(i),
      pick: MASTER_DATA.m_104pastpsychiatriccondition![0],
      label: 'None',
    },
    {
      name: 'past medical condition',
      control: 'pastMedicalCondition',
      rows: (c: HihlCaseSheetComponent) => c.pastMedicalConditions,
      add: (c: HihlCaseSheetComponent) => c.addPastMedicalCondition(),
      options: (c: HihlCaseSheetComponent, i: number) => c.pastMedicalConditionOptions(i),
      pick: MASTER_DATA.m_104pastmedicalcondition![0],
      label: 'None',
    },
    {
      name: 'family condition',
      control: 'familyCondition',
      rows: (c: HihlCaseSheetComponent) => c.familyDiseaseList,
      add: (c: HihlCaseSheetComponent) => c.addFamilyDisease(),
      options: (c: HihlCaseSheetComponent, i: number) => c.familyConditionOptions(i),
      pick: MASTER_DATA.m_104familycondition![1],
      label: 'Depression',
    },
  ];

  for (const picker of PICKER_CASES) {
    it(`keeps the picked ${picker.name} visible in its own select`, () => {
      const fixture = render();
      const component = fixture.componentInstance;

      picker
        .rows(component)
        .at(0)
        .patchValue({ [picker.control]: picker.pick });
      fixture.detectChanges();

      const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(
        `select[formcontrolname="${picker.control}"]`,
      )!;
      expect(select.selectedOptions[0]?.textContent?.trim()).toBe(picker.label);
      expect(picker.options(component, 0)).toContain(picker.pick);
    });

    it(`still hides a ${picker.name} picked in another row`, () => {
      const fixture = render();
      const component = fixture.componentInstance;

      picker
        .rows(component)
        .at(0)
        .patchValue({ [picker.control]: picker.pick });
      picker.add(component);

      expect(picker.options(component, 1)).not.toContain(picker.pick);
    });
  }
});
