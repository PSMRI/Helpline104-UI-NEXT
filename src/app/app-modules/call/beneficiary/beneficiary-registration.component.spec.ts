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

import { ZardDialogService } from '@common-ui/ui/dialog';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../../core/auth/auth.store';
import { CurrentRole } from '../../core/auth/auth.models';
import { BeneficiaryRegistrationComponent } from './beneficiary-registration.component';

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
