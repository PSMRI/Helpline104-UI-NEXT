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
import { Router } from '@angular/router';

import { of } from 'rxjs';

import { ZardDialogService } from '@common-ui/ui/dialog';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../../core/auth/auth.store';
import { CurrentRole } from '../../core/auth/auth.models';
import { CallerDemographics, CallStore } from '../call.store';
import { BeneficiaryRegistrationComponent } from './beneficiary-registration.component';

const SEARCH_BY_PHONE = (req: { url: string }) => req.url.includes('beneficiary/searchUserByPhone');
const SEARCH_BENEFICIARY = (req: { url: string }) => req.url.includes('beneficiary/searchBeneficiary');
const HCW_TYPES = (req: { url: string }) => req.url.includes('beneficiary/get/healthCareWorkerTypes');

function demographics(): CallerDemographics {
  return {
    firstName: 'Jane',
    lastName: 'Doe',
    age: 30,
    genderId: 2,
    genderName: 'Female',
    displayId: '123456789012',
    stateName: null,
    districtName: null,
    subDistrictName: null,
    villageName: null,
    maritalStatus: null,
    category: null,
    communityName: null,
    educationName: null,
  };
}

function currentRole(): CurrentRole {
  return {
    roleID: 1,
    roleName: 'HAO',
    serviceID: 42,
    serviceName: '104',
    serviceProviderID: 7,
    providerServiceMapID: 1,
    workingLocationID: 1,
    apimanClientKey: null,
    featureCode: 'HAO',
  };
}

describe('BeneficiaryRegistrationComponent', () => {
  let authStore: AuthStore;
  let http: HttpTestingController;
  let confirmDialog: ConfirmDialogService;
  let dialogService: ZardDialogService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [BeneficiaryRegistrationComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    authStore = TestBed.inject(AuthStore);
    authStore.setCurrentRole(currentRole());
    http = TestBed.inject(HttpTestingController);
    confirmDialog = TestBed.inject(ConfirmDialogService);
    dialogService = TestBed.inject(ZardDialogService);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  /**
   * No CLI on the CallStore short-circuits `ngOnInit` before `loadHistory` —
   * only the registration master data and provider-states lookups fire, which
   * every test needs flushed regardless of what it goes on to exercise.
   */
  function render() {
    const fixture = TestBed.createComponent(BeneficiaryRegistrationComponent);
    fixture.detectChanges();
    http.expectOne((req) => req.url.includes('beneficiary/getRegistrationDataV1')).flush({ data: null });
    http.expectOne((req) => req.url.includes('m/role/state')).flush({ data: [] });
    return fixture;
  }

  /** Seed an active call so `ngOnInit` also fires the CLI-history load, left pending for the test to flush. */
  function renderWithCli() {
    TestBed.inject(CallStore).startCall({ cli: '9876543210', sessionId: 'session-1' });
    return render();
  }

  it('proceedAfterRegistration() Cancel on the Health Advisory prompt leaves the beneficiary unresolved and returns to the history list', () => {
    const fixture = renderWithCli();
    http.expectOne(SEARCH_BY_PHONE).flush({ data: [] });
    const component = fixture.componentInstance;
    const callStore = TestBed.inject(CallStore);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    spyOn(confirmDialog, 'confirm').and.returnValue(of(false));
    component.activeView.set('register');

    component['proceedAfterRegistration'](123, 9, demographics());

    expect(callStore.beneficiaryId()).toBeNull();
    expect(callStore.demographics()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    expect(component.activeView()).toBe('list');
    expect(component.calledEarlier()).toBe('yes');
    http.expectOne(SEARCH_BY_PHONE).flush({ data: [{ beneficiaryRegID: 123 }] });
    expect(component.historyResults()).toEqual([{ beneficiaryRegID: 123 }]);
  });

  it('proceedAfterRegistration() OK on the Health Advisory prompt resolves the beneficiary and opens the HAO workspace', () => {
    const fixture = renderWithCli();
    http.expectOne(SEARCH_BY_PHONE).flush({ data: [] });
    const component = fixture.componentInstance;
    const callStore = TestBed.inject(CallStore);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    spyOn(confirmDialog, 'confirm').and.returnValue(of(true));

    component['proceedAfterRegistration'](123, 9, demographics());

    expect(callStore.beneficiaryId()).toBe(123);
    expect(callStore.demographics()?.firstName).toBe('Jane');
    expect(navigate).toHaveBeenCalledWith(['/innerpage', 'hao']);
  });

  it('quickSearchById() clears a stale history timeout and shows its own results', () => {
    const fixture = renderWithCli();
    http.expectOne(SEARCH_BY_PHONE).flush(null, { status: 500, statusText: 'Server Error' });
    const component = fixture.componentInstance;
    expect(component.historyTimedOut()).toBeTrue();
    component.quickSearchTerm.set('123456789012');

    component.quickSearchById();

    expect(component.historyTimedOut()).toBeFalse();
    http.expectOne(SEARCH_BENEFICIARY).flush({ data: [{ beneficiaryRegID: 5 }] });
    expect(component.historyTimedOut()).toBeFalse();
    expect(component.historyError()).toBeFalse();
    expect(component.displayedHistoryResults()).toEqual([{ beneficiaryRegID: 5 }]);
  });

  it('viewAllHistory() re-fetches the CLI history when the earlier load failed', () => {
    const fixture = renderWithCli();
    http.expectOne(SEARCH_BY_PHONE).flush(null, { status: 500, statusText: 'Server Error' });
    const component = fixture.componentInstance;
    component.quickSearchTerm.set('123456789012');
    component.quickSearchById();
    http.expectOne(SEARCH_BENEFICIARY).flush({ data: [{ beneficiaryRegID: 5 }] });

    component.viewAllHistory();

    expect(component.quickSearchResults()).toBeNull();
    expect(component.quickSearchTerm()).toBe('');
    http.expectOne(SEARCH_BY_PHONE).flush({ data: [{ beneficiaryRegID: 7 }] });
    expect(component.historyResults()).toEqual([{ beneficiaryRegID: 7 }]);
    expect(component.displayedHistoryResults()).toEqual([{ beneficiaryRegID: 7 }]);
  });

  it('viewAllHistory() keeps an already-loaded history without re-fetching it', () => {
    const fixture = renderWithCli();
    http.expectOne(SEARCH_BY_PHONE).flush({ data: [{ beneficiaryRegID: 7 }] });
    const component = fixture.componentInstance;
    component.quickSearchTerm.set('123456789012');
    component.quickSearchById();
    http.expectOne(SEARCH_BENEFICIARY).flush({ data: [{ beneficiaryRegID: 5 }] });

    component.viewAllHistory();

    http.expectNone(SEARCH_BY_PHONE);
    expect(component.displayedHistoryResults()).toEqual([{ beneficiaryRegID: 7 }]);
  });

  it('onHealthcareWorkerChange() surfaces a failed type lookup and loadHcwTypes() clears it on a successful retry', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    component.registerForm.controls.isHealthcareWorker.setValue(true);

    component.onHealthcareWorkerChange();
    http.expectOne(HCW_TYPES).flush(null, { status: 500, statusText: 'Server Error' });

    expect(component.hcwTypesError()).toBeTruthy();
    expect(component.hcwTypes()).toEqual([]);

    component.loadHcwTypes();
    expect(component.hcwTypesError()).toBeNull();
    http.expectOne(HCW_TYPES).flush({ statusCode: 200, data: [{ healthCareWorkerID: 1, healthCareWorkerType: 'ASHA' }] });

    expect(component.hcwTypesError()).toBeNull();
    expect(component.hcwTypes()).toEqual([{ healthCareWorkerID: 1, healthCareWorkerType: 'ASHA' }]);
  });

  it('onSubDistrictChange() flags an empty village list and clears the flag when the block changes', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    component.registerForm.controls.subDistrictID.setValue(5);

    component.onSubDistrictChange();
    http.expectOne((r) => r.url.includes('location/village/5')).flush({ statusCode: 200, data: [] });

    expect(component.villages()).toEqual([]);
    expect(component.noVillages()).toBeTrue();

    component.registerForm.controls.subDistrictID.setValue(null);
    component.onSubDistrictChange();

    expect(component.noVillages()).toBeFalse();
  });

  it('doSearch() sends the state/district filter nested under i_bendemographics', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    component.searchForm.setValue({
      firstName: 'Jane',
      lastName: '',
      beneficiaryID: '',
      genderID: null,
      stateID: 3,
      districtID: 9,
    });

    component.doSearch();

    const req = http.expectOne((r) => r.url.includes('beneficiary/searchBeneficiary'));
    expect(req.request.body.i_bendemographics).toEqual({ stateID: 3, districtID: 9 });
    req.flush({ data: [] });
  });

  it('doSearch() omits i_bendemographics when no state/district is chosen', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    component.searchForm.setValue({
      firstName: 'Jane',
      lastName: '',
      beneficiaryID: '',
      genderID: null,
      stateID: null,
      districtID: null,
    });

    component.doSearch();

    const req = http.expectOne((r) => r.url.includes('beneficiary/searchBeneficiary'));
    expect(req.request.body.i_bendemographics).toBeUndefined();
    req.flush({ data: [] });
  });

  it('onSearchStateChange() loads districts for the chosen state only', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    component.searchForm.controls.stateID.setValue(3);

    component.onSearchStateChange();

    const req = http.expectOne((r) => r.url.includes('location/districts/3'));
    req.flush({ data: [{ districtID: 9, districtName: 'Some District' }] });
    expect(component.searchDistricts()).toEqual([{ districtID: 9, districtName: 'Some District' }]);
  });

  it('cancelToStart() restarts the landing gate after confirmation, without ending the call', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    spyOn(confirmDialog, 'confirm').and.returnValue(of(true));
    component.calledEarlier.set('yes');
    component.activeView.set('search');
    component.quickSearchTerm.set('12345');

    component.cancelToStart();

    expect(component.calledEarlier()).toBeNull();
    expect(component.activeView()).toBe('list');
    expect(component.quickSearchTerm()).toBe('');
  });

  it('cancelToStart() leaves the view untouched when the agent backs out of the confirm dialog', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    spyOn(confirmDialog, 'confirm').and.returnValue(of(false));
    component.calledEarlier.set('yes');
    component.activeView.set('search');

    component.cancelToStart();

    expect(component.calledEarlier()).toBe('yes');
    expect(component.activeView()).toBe('search');
  });

  it('viewAbhaDetails() alerts instead of opening a dialog when there are no ABHA linkages', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    const alertSpy = spyOn(confirmDialog, 'alert').and.returnValue(of(undefined));
    const createSpy = spyOn(dialogService, 'create').and.callThrough();

    component.viewAbhaDetails({ beneficiaryRegID: 1 });

    expect(alertSpy).toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('viewAbhaDetails() opens the ABHA details dialog when linkages exist', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    const alertSpy = spyOn(confirmDialog, 'alert');
    const createSpy = spyOn(dialogService, 'create').and.callThrough();

    component.viewAbhaDetails({
      beneficiaryRegID: 1,
      abhaDetails: [{ HealthIDNumber: '91-1234-5678-9012' }],
    });

    expect(createSpy).toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
