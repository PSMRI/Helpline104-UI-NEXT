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
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';

import { toast } from 'ngx-sonner';
import { of } from 'rxjs';

import { ZardDialogService } from '@common-ui/ui/dialog';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../../core/auth/auth.store';
import { CurrentRole } from '../../core/auth/auth.models';
import { CallerDemographics, CallStore } from '../call.store';
import { BeneficiaryRegistrationComponent } from './beneficiary-registration.component';
import { BeneficiaryRecord } from './beneficiary.models';

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

  describe('called-earlier history pager', () => {
    function historyRows(count: number): BeneficiaryRecord[] {
      return Array.from({ length: count }, (_, i) => ({ beneficiaryRegID: i + 1 }) as BeneficiaryRecord);
    }

    function renderHistory(count: number) {
      const fixture = renderWithCli();
      http.expectOne(SEARCH_BY_PHONE).flush({ data: historyRows(count) });
      fixture.componentInstance.onCalledEarlier('yes');
      fixture.detectChanges();
      return fixture;
    }

    function pageButtons(fixture: ComponentFixture<BeneficiaryRegistrationComponent>): string[] {
      const buttons = fixture.nativeElement.querySelectorAll(
        'li > button[z-pagination-button]',
      ) as NodeListOf<HTMLElement>;
      return Array.from(buttons).map((b) => b.textContent?.replace(/To (last )?page(, page)?/, '').trim() ?? '');
    }

    it('shows four rows per page, as legacy does', () => {
      const component = renderHistory(10).componentInstance;

      expect(component.historyTotalPages()).toBe(3);
      expect(component.pagedHistoryResults().map((r) => r.beneficiaryRegID)).toEqual([1, 2, 3, 4]);

      component.historyPageIndex.set(3);

      expect(component.pagedHistoryResults().map((r) => r.beneficiaryRegID)).toEqual([9, 10]);
    });

    it('draws a bounded window of page buttons for a long history instead of one per page', () => {
      const fixture = renderHistory(470);

      expect(fixture.componentInstance.historyTotalPages()).toBe(118);
      expect(pageButtons(fixture)).toEqual(['1', '2', '3', '4', '118']);
      expect(fixture.nativeElement.querySelectorAll('z-pagination-ellipsis').length).toBe(1);
    });

    it('moves the window with the current page', () => {
      const fixture = renderHistory(470);
      const component = fixture.componentInstance;

      component.historyPageIndex.set(60);
      fixture.detectChanges();

      expect(pageButtons(fixture)).toEqual(['1', '59', '60', '61', '118']);
      expect(component.pagedHistoryResults().map((r) => r.beneficiaryRegID)).toEqual([237, 238, 239, 240]);
    });

    it('pages forward from the next control', () => {
      const fixture = renderHistory(10);
      const next = fixture.nativeElement.querySelector('z-pagination-next button') as HTMLButtonElement;

      next.click();
      fixture.detectChanges();

      expect(fixture.componentInstance.historyPageIndex()).toBe(2);
      expect(fixture.componentInstance.pagedHistoryResults().map((r) => r.beneficiaryRegID)).toEqual([5, 6, 7, 8]);
    });

    it('hides the pager when the history fits on one page', () => {
      const fixture = renderHistory(4);

      expect(fixture.nativeElement.querySelector('z-pagination')).toBeNull();
    });
  });

  describe('healthcare worker type lookup', () => {
    function openHcwField() {
      const fixture = render();
      const component = fixture.componentInstance;
      // The screen is gated on the "Have you called earlier?" answer; clear it and open the register view.
      component.calledEarlier.set('no');
      component.activeView.set('register');
      component.registerForm.controls.isHealthcareWorker.setValue(true);
      component.onHealthcareWorkerChange();
      fixture.detectChanges();
      return { fixture, component };
    }

    function hcwField(fixture: ComponentFixture<BeneficiaryRegistrationComponent>) {
      const root: HTMLElement = fixture.nativeElement;
      const select = root.querySelector<HTMLSelectElement>('#healthCareWorkerID');
      const fieldText = select?.closest('z-form-field')?.textContent ?? '';
      return {
        select,
        fieldText,
        retry: Array.from(root.querySelectorAll('button')).find((b) => /retry/i.test(b.textContent ?? '')),
      };
    }

    it('disables the select and shows a loading message while the lookup is in flight', () => {
      const { fixture, component } = openHcwField();

      expect(component.hcwTypesLoading()).toBeTrue();
      expect(component.registerForm.controls.healthCareWorkerID.disabled).toBeTrue();
      const pending = hcwField(fixture);
      expect(pending.select?.disabled).toBeTrue();
      expect(pending.fieldText).toContain('Loading healthcare worker types');
      expect(pending.retry).toBeUndefined();

      http.expectOne(HCW_TYPES).flush({ statusCode: 200, data: [{ healthCareWorkerID: 1, healthCareWorkerType: 'ASHA' }] });
      fixture.detectChanges();

      expect(component.hcwTypesLoading()).toBeFalse();
      const done = hcwField(fixture);
      expect(done.select?.hasAttribute('disabled')).toBeFalse();
      expect(done.fieldText).not.toContain('Loading healthcare worker types');
    });

    it('surfaces a failed lookup with an inline error and Retry, and clears it on a successful retry', () => {
      const { fixture, component } = openHcwField();

      http.expectOne(HCW_TYPES).flush(null, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(component.hcwTypesError()).toBeTruthy();
      expect(component.hcwTypesLoading()).toBeFalse();
      expect(component.noHcwTypes()).toBeFalse();
      expect(component.hcwTypes()).toEqual([]);
      const failed = hcwField(fixture);
      expect(failed.retry).toBeDefined();
      expect(failed.select?.hasAttribute('disabled')).toBeFalse();

      component.loadHcwTypes();
      expect(component.hcwTypesError()).toBeNull();
      expect(component.hcwTypesLoading()).toBeTrue();
      http.expectOne(HCW_TYPES).flush({ statusCode: 200, data: [{ healthCareWorkerID: 1, healthCareWorkerType: 'ASHA' }] });
      fixture.detectChanges();

      expect(component.hcwTypesError()).toBeNull();
      expect(component.hcwTypes()).toEqual([{ healthCareWorkerID: 1, healthCareWorkerType: 'ASHA' }]);
      expect(hcwField(fixture).retry).toBeUndefined();
    });

    it('reports a successful lookup that returns no types as an explicit empty state, not an error', () => {
      const { fixture, component } = openHcwField();

      http.expectOne(HCW_TYPES).flush({ statusCode: 200, data: [] });
      fixture.detectChanges();

      expect(component.noHcwTypes()).toBeTrue();
      expect(component.hcwTypesError()).toBeNull();
      expect(component.hcwTypesLoading()).toBeFalse();
      const empty = hcwField(fixture);
      expect(empty.fieldText).toContain('No healthcare worker types configured');
      expect(empty.retry).toBeUndefined();
      expect(empty.select?.options.length).toBe(1);
    });

    it('renders the returned types with no loading, empty, or error message on success', () => {
      const { fixture, component } = openHcwField();

      http.expectOne(HCW_TYPES).flush({
        statusCode: 200,
        data: [
          { healthCareWorkerID: 1, healthCareWorkerType: 'ASHA' },
          { healthCareWorkerID: 2, healthCareWorkerType: 'ANM' },
        ],
      });
      fixture.detectChanges();

      expect(component.hcwTypes().length).toBe(2);
      expect(component.noHcwTypes()).toBeFalse();
      expect(component.hcwTypesError()).toBeNull();
      const ok = hcwField(fixture);
      expect(ok.select?.options.length).toBe(3);
      expect(ok.fieldText).not.toContain('Loading healthcare worker types');
      expect(ok.fieldText).not.toContain('No healthcare worker types configured');
      expect(ok.retry).toBeUndefined();
    });
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

  describe('role state filter', () => {
    const STATES = [
      { stateID: 3, stateName: 'Assam' },
      { stateID: 4, stateName: 'Bihar' },
    ];
    const DISTRICTS_3 = [{ districtID: 9, districtName: 'Kamrup' }];

    function withRoleState(stateID: number | undefined) {
      authStore.setSession({
        token: 'token',
        user: { userID: 1, agentID: 1, userName: 'agent104', status: 'Active' },
        privileges: [
          {
            providerServiceMapID: 1,
            roles: [
              {
                RoleName: 'HAO',
                serviceRoleScreenMappings: [{ providerServiceMapping: stateID === undefined ? {} : { stateID } }],
              },
            ],
          },
        ],
      });
      authStore.setCurrentRole(currentRole());
    }

    function renderWithStates() {
      const fixture = TestBed.createComponent(BeneficiaryRegistrationComponent);
      fixture.detectChanges();
      http.expectOne((req) => req.url.includes('beneficiary/getRegistrationDataV1')).flush({ data: null });
      http.expectOne((req) => req.url.includes('m/role/state')).flush({ data: STATES });
      return fixture;
    }

    function stateSelect(fixture: ComponentFixture<BeneficiaryRegistrationComponent>, id: string) {
      const component = fixture.componentInstance;
      component.calledEarlier.set('no');
      component.activeView.set(id === 'stateID' ? 'register' : 'search');
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(`#${id}`);
    }

    it('narrows the options to the role state and pre-selects it on both forms so their districts load at once', () => {
      withRoleState(3);
      const fixture = renderWithStates();
      const component = fixture.componentInstance;

      expect(component.states()).toEqual([STATES[0]]);
      expect(component.registerForm.controls.stateID.value).toBe(3);
      expect(component.searchForm.controls.stateID.value).toBe(3);
      http.expectOne((r) => r.url.includes('location/districts/3')).flush({ data: DISTRICTS_3 });
      expect(component.districts()).toEqual(DISTRICTS_3);
      expect(component.searchDistricts()).toEqual(DISTRICTS_3);

      const register = stateSelect(fixture, 'stateID');
      expect(register?.options.length).toBe(2);
      expect(register?.selectedIndex).toBe(1);
      const search = stateSelect(fixture, 'search-stateID');
      expect(search?.options.length).toBe(2);
      expect(search?.selectedIndex).toBe(1);
    });

    it('offers every state with nothing selected when the role mapping carries no stateID', () => {
      withRoleState(undefined);
      const fixture = renderWithStates();
      const component = fixture.componentInstance;

      expect(component.states()).toEqual(STATES);
      expect(component.registerForm.controls.stateID.value).toBeNull();
      expect(component.searchForm.controls.stateID.value).toBeNull();
      http.expectNone((r) => r.url.includes('location/districts/'));
    });

    it('offers every state with nothing selected when the role stateID is not among the provider states', () => {
      withRoleState(99);
      const fixture = renderWithStates();
      const component = fixture.componentInstance;

      expect(component.states()).toEqual(STATES);
      expect(component.registerForm.controls.stateID.value).toBeNull();
      expect(component.searchForm.controls.stateID.value).toBeNull();
      http.expectNone((r) => r.url.includes('location/districts/'));
    });

    it('keeps a reviewed beneficiary in their own state, lists it alongside the role state, and restores the filter on exit', () => {
      withRoleState(3);
      const fixture = renderWithStates();
      const component = fixture.componentInstance;
      http.expectOne((r) => r.url.includes('location/districts/3')).flush({ data: DISTRICTS_3 });

      component.selectBeneficiary({ beneficiaryRegID: 4321 });
      http.expectOne((r) => r.url.includes('beneficiary/searchUserByID')).flush({
        data: [
          {
            beneficiaryRegID: 4321,
            firstName: 'Jane',
            m_gender: { genderID: 2, genderName: 'Female' },
            i_bendemographics: { stateID: 4, districtID: 12, blockID: 6, districtBranchID: 14 },
          },
        ],
      });
      http.expectOne((r) => r.url.includes('location/districts/4')).flush({ data: [{ districtID: 12, districtName: 'Patna' }] });
      http.expectOne((r) => r.url.includes('location/taluks/12')).flush({ data: [{ blockID: 6, blockName: 'Block' }] });
      http.expectOne((r) => r.url.includes('location/village/6')).flush({ data: [{ districtBranchID: 14, villageName: 'Village' }] });

      expect(component.updateMode()).toBeTrue();
      expect(component.registerForm.controls.stateID.value).toBe(4);
      expect(component.states()).toEqual(STATES);
      const select = stateSelect(fixture, 'stateID');
      expect(select?.options.length).toBe(3);
      expect(select?.selectedIndex).toBe(2);

      component.backToList();

      expect(component.updateMode()).toBeFalse();
      expect(component.states()).toEqual([STATES[0]]);
      expect(component.registerForm.controls.stateID.value).toBe(3);
      expect(component.districts()).toEqual(DISTRICTS_3);
    });
  });

  describe('address lookup states', () => {
    interface Lookup {
      name: string;
      view: 'register' | 'search';
      id: string;
      url: string;
      rows: object[];
      loadingText: string;
      emptyText: string;
      control: (component: BeneficiaryRegistrationComponent) => FormControl<number | null>;
      loading: (component: BeneficiaryRegistrationComponent) => boolean;
      empty: (component: BeneficiaryRegistrationComponent) => boolean;
      options: (component: BeneficiaryRegistrationComponent) => object[];
      select: (component: BeneficiaryRegistrationComponent, id: number) => void;
    }

    const LOOKUPS: Lookup[] = [
      {
        name: 'register-form districts',
        view: 'register',
        id: 'districtID',
        url: 'location/districts/',
        rows: [{ districtID: 9, districtName: 'Kamrup' }],
        loadingText: 'Loading districts',
        emptyText: 'No districts found for this state.',
        control: (c) => c.registerForm.controls.districtID,
        loading: (c) => c.districtsLoading(),
        empty: (c) => c.noDistricts(),
        options: (c) => c.districts(),
        select: (c, id) => {
          c.registerForm.controls.stateID.setValue(id);
          c.onStateChange();
        },
      },
      {
        name: 'search-form districts',
        view: 'search',
        id: 'search-districtID',
        url: 'location/districts/',
        rows: [{ districtID: 9, districtName: 'Kamrup' }],
        loadingText: 'Loading districts',
        emptyText: 'No districts found for this state.',
        control: (c) => c.searchForm.controls.districtID,
        loading: (c) => c.searchDistrictsLoading(),
        empty: (c) => c.noSearchDistricts(),
        options: (c) => c.searchDistricts(),
        select: (c, id) => {
          c.searchForm.controls.stateID.setValue(id);
          c.onSearchStateChange();
        },
      },
      {
        name: 'blocks',
        view: 'register',
        id: 'subDistrictID',
        url: 'location/taluks/',
        rows: [{ blockID: 6, blockName: 'Block' }],
        loadingText: 'Loading blocks',
        emptyText: 'No blocks found for this district.',
        control: (c) => c.registerForm.controls.subDistrictID,
        loading: (c) => c.blocksLoading(),
        empty: (c) => c.noBlocks(),
        options: (c) => c.subDistricts(),
        select: (c, id) => {
          c.registerForm.controls.districtID.setValue(id);
          c.onDistrictChange();
        },
      },
      {
        name: 'villages',
        view: 'register',
        id: 'villageID',
        url: 'location/village/',
        rows: [{ districtBranchID: 14, villageName: 'Village' }],
        loadingText: 'Loading villages',
        emptyText: 'No villages found for this block.',
        control: (c) => c.registerForm.controls.villageID,
        loading: (c) => c.villagesLoading(),
        empty: (c) => c.noVillages(),
        options: (c) => c.villages(),
        select: (c, id) => {
          c.registerForm.controls.subDistrictID.setValue(id);
          c.onSubDistrictChange();
        },
      },
    ];

    for (const lookup of LOOKUPS) {
      describe(lookup.name, () => {
        function open() {
          const fixture = renderWithCli();
          http.expectOne(SEARCH_BY_PHONE).flush({ data: [] });
          const component = fixture.componentInstance;
          component.calledEarlier.set('no');
          component.activeView.set(lookup.view);
          lookup.select(component, 3);
          fixture.detectChanges();
          return { fixture, component };
        }

        function field(fixture: ComponentFixture<BeneficiaryRegistrationComponent>) {
          const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(`#${lookup.id}`);
          return { select, text: select?.closest('z-form-field')?.textContent ?? '' };
        }

        it('disables the select through its control and shows a loading message until the lookup settles', () => {
          const { fixture, component } = open();

          expect(lookup.loading(component)).toBeTrue();
          expect(lookup.control(component).disabled).toBeTrue();
          const pending = field(fixture);
          expect(pending.select?.disabled).toBeTrue();
          expect(pending.text).toContain(lookup.loadingText);

          http.expectOne((r) => r.url.includes(`${lookup.url}3`)).flush({ statusCode: 200, data: lookup.rows });
          fixture.detectChanges();

          expect(lookup.loading(component)).toBeFalse();
          expect(lookup.control(component).enabled).toBeTrue();
          const done = field(fixture);
          expect(done.select?.disabled).toBeFalse();
          expect(done.select?.options.length).toBe(2);
          expect(done.text).not.toContain(lookup.loadingText);
        });

        it('flags an empty result with a message and clears it once the selection moves on', () => {
          const { fixture, component } = open();

          http.expectOne((r) => r.url.includes(`${lookup.url}3`)).flush({ statusCode: 200, data: [] });
          fixture.detectChanges();

          expect(lookup.empty(component)).toBeTrue();
          expect(lookup.loading(component)).toBeFalse();
          expect(field(fixture).text).toContain(lookup.emptyText);

          lookup.select(component, 4);
          fixture.detectChanges();

          expect(lookup.empty(component)).toBeFalse();
          expect(field(fixture).text).not.toContain(lookup.emptyText);
          http.expectOne((r) => r.url.includes(`${lookup.url}4`)).flush({ statusCode: 200, data: lookup.rows });
        });

        it('surfaces a failed lookup as a toast and re-enables the select', () => {
          const toastSpy = spyOn(toast, 'error');
          const { fixture, component } = open();

          http.expectOne((r) => r.url.includes(`${lookup.url}3`)).flush(null, { status: 500, statusText: 'Server Error' });
          fixture.detectChanges();

          expect(toastSpy).toHaveBeenCalledTimes(1);
          expect(lookup.loading(component)).toBeFalse();
          expect(lookup.empty(component)).toBeFalse();
          expect(lookup.control(component).enabled).toBeTrue();
          const failed = field(fixture);
          expect(failed.select?.disabled).toBeFalse();
          expect(failed.text).not.toContain(lookup.loadingText);
        });

        it('keeps the select disabled when a stale response lands while a newer lookup is pending', () => {
          const { component } = open();
          lookup.select(component, 4);

          http.expectOne((r) => r.url.includes(`${lookup.url}3`)).flush({ statusCode: 200, data: [] });

          expect(lookup.loading(component)).toBeTrue();
          expect(lookup.control(component).disabled).toBeTrue();
          expect(lookup.empty(component)).toBeFalse();

          http.expectOne((r) => r.url.includes(`${lookup.url}4`)).flush({ statusCode: 200, data: lookup.rows });

          expect(lookup.loading(component)).toBeFalse();
          expect(lookup.control(component).enabled).toBeTrue();
          expect(lookup.options(component)).toEqual(lookup.rows);
        });
      });
    }
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

  it('keeps the submit button disabled while an address lookup is in flight', () => {
    const fixture = renderWithCli();
    http.expectOne(SEARCH_BY_PHONE).flush({ data: [] });
    const component = fixture.componentInstance;
    component.calledEarlier.set('no');
    component.activeView.set('register');
    component.registerForm.controls.stateID.setValue(3);
    component.onStateChange();
    fixture.detectChanges();

    const submitDisabled = () =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('form button[type=submit]')).every(
        (b) => b.hasAttribute('disabled') || b.getAttribute('aria-disabled') === 'true',
      );
    expect(component.addressLookupBusy()).toBeTrue();
    expect(submitDisabled()).toBeTrue();

    http.expectOne((r) => r.url.includes('location/districts/3')).flush({ statusCode: 200, data: [{ districtID: 9, districtName: 'Kamrup' }] });
    fixture.detectChanges();

    expect(component.addressLookupBusy()).toBeFalse();
    expect(submitDisabled()).toBeFalse();
  });
});

/**
 * `beneficiary/update` rejects a body without `benPhoneMaps` (statusCode 5005,
 * "benPhoneMapModelList is null") and silently persists nothing without the
 * six `changeIn*` section flags — both verified live against UAT. Legacy sends
 * the fetched record's phone maps and hardcodes all six flags to `true`.
 */
describe('BeneficiaryRegistrationComponent modify', () => {
  let authStore: AuthStore;
  let http: HttpTestingController;

  const SEARCH_BY_ID = (req: { url: string }) => req.url.includes('beneficiary/searchUserByID');
  const UPDATE = (req: { url: string }) => req.url.includes('beneficiary/update');

  const ADDRESS_BEFORE = { stateID: 3, districtID: 9, blockID: 5, districtBranchID: 11 };
  const ADDRESS_AFTER = { stateID: 4, districtID: 12, blockID: 6, districtBranchID: 14 };

  function record(address: typeof ADDRESS_BEFORE, benPhoneMaps?: BeneficiaryRecord['benPhoneMaps']): BeneficiaryRecord {
    return {
      beneficiaryRegID: 4321,
      beneficiaryID: '123456789012',
      firstName: 'Jane',
      lastName: 'Doe',
      actualAge: 30,
      ageUnits: 'Years',
      dOB: '1996-01-15T00:00:00.000Z',
      m_gender: { genderID: 2, genderName: 'Female' },
      benPhoneMaps,
      i_bendemographics: {
        ...address,
        addressLine1: 'H-1',
        pinCode: '462001',
        communityID: 3,
        educationID: 4,
      },
    };
  }

  function existingPhoneMaps(): BeneficiaryRecord['benPhoneMaps'] {
    return [
      {
        benPhoneMapID: 900,
        benificiaryRegID: 4321,
        parentBenRegID: 4321,
        phoneNo: '9876543210',
        phoneTypeID: 1,
        benRelationshipID: 1,
        createdBy: 'someoneelse',
      },
    ];
  }

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [BeneficiaryRegistrationComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    authStore = TestBed.inject(AuthStore);
    authStore.setSession({
      token: 'token',
      user: { userID: 1, agentID: 1, userName: 'agent104', status: 'Active' },
    });
    authStore.setCurrentRole(currentRole());
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function render() {
    const fixture = TestBed.createComponent(BeneficiaryRegistrationComponent);
    fixture.detectChanges();
    http.expectOne((req) => req.url.includes('beneficiary/getRegistrationDataV1')).flush({ data: null });
    http.expectOne((req) => req.url.includes('m/role/state')).flush({ data: [] });
    return fixture;
  }

  function flushAddressCascade(address: typeof ADDRESS_BEFORE) {
    http
      .expectOne((r) => r.url.includes(`location/districts/${address.stateID}`))
      .flush({ data: [{ districtID: address.districtID, districtName: 'District' }] });
    http
      .expectOne((r) => r.url.includes(`location/taluks/${address.districtID}`))
      .flush({ data: [{ blockID: address.blockID, blockName: 'Block' }] });
    http
      .expectOne((r) => r.url.includes(`location/village/${address.blockID}`))
      .flush({ data: [{ districtBranchID: address.districtBranchID, villageName: 'Village' }] });
  }

  function selectForUpdate(component: BeneficiaryRegistrationComponent, detail: BeneficiaryRecord) {
    component.selectBeneficiary({ beneficiaryRegID: detail.beneficiaryRegID });
    http.expectOne(SEARCH_BY_ID).flush({ data: [detail] });
    flushAddressCascade(detail.i_bendemographics as unknown as typeof ADDRESS_BEFORE);
  }

  it('doModify() sends the fetched phone maps back, re-stamping only the primary entry', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    selectForUpdate(component, record(ADDRESS_BEFORE, existingPhoneMaps()));
    component.registerForm.controls.relationshipTypeID.setValue(3);

    component.doModify();

    const req = http.expectOne(UPDATE);
    expect(req.request.body.benPhoneMaps.length).toBe(1);
    expect(req.request.body.benPhoneMaps[0].phoneNo).toBe('9876543210');
    expect(req.request.body.benPhoneMaps[0].benificiaryRegID).toBe(4321);
    expect(req.request.body.benPhoneMaps[0].benPhoneMapID).toBe(900);
    expect(req.request.body.benPhoneMaps[0].benRelationshipID).toBe(3);
    expect(req.request.body.benPhoneMaps[0].createdBy).toBe('agent104');
    req.flush({ statusCode: 200, data: 'Success' });
  });

  function phoneMapsWithAlternates(...alternates: string[]): BeneficiaryRecord['benPhoneMaps'] {
    return [
      ...(existingPhoneMaps() ?? []),
      ...alternates.map((phoneNo, i) => ({
        benPhoneMapID: 901 + i,
        benificiaryRegID: 4321,
        parentBenRegID: 4321,
        phoneNo,
        benRelationshipID: 1,
        createdBy: 'someoneelse',
      })),
    ];
  }

  it('an edited and a newly added alternate number are sent on Modify and come back on the next read', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    selectForUpdate(component, record(ADDRESS_BEFORE, phoneMapsWithAlternates('9111111111')));
    expect(component.registerForm.controls.alternateNumber1.value).toBe('9111111111');
    expect(component.registerForm.controls.alternateNumber2.value).toBe('');

    component.registerForm.patchValue({ alternateNumber1: '9222222222', alternateNumber2: '9333333333' });
    component.doModify();

    const req = http.expectOne(UPDATE);
    const maps = req.request.body.benPhoneMaps;
    expect(maps.length).toBe(3);
    expect(maps[0]).toEqual(jasmine.objectContaining({ benPhoneMapID: 900, phoneNo: '9876543210' }));
    expect(maps[1]).toEqual(
      jasmine.objectContaining({
        benPhoneMapID: 901,
        benificiaryRegID: 4321,
        phoneNo: '9222222222',
        createdBy: 'someoneelse',
        modifiedBy: 'agent104',
        deleted: false,
      }),
    );
    expect(maps[2]).toEqual({
      parentBenRegID: 4321,
      benificiaryRegID: 4321,
      benRelationshipID: 1,
      phoneNo: '9333333333',
      modifiedBy: 'agent104',
      createdBy: 'agent104',
      deleted: false,
    });
    expect(req.request.body.changeInContacts).toBeTrue();
    req.flush({ statusCode: 200, data: 'Success' });

    selectForUpdate(component, record(ADDRESS_AFTER, phoneMapsWithAlternates('9222222222', '9333333333')));

    const reloaded = component.registerForm.getRawValue();
    expect(reloaded.alternateNumber1).toBe('9222222222');
    expect(reloaded.alternateNumber2).toBe('9333333333');
  });

  it('a cleared alternate number is sent back as its emptied map, not dropped', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    selectForUpdate(component, record(ADDRESS_BEFORE, phoneMapsWithAlternates('9111111111')));

    component.registerForm.patchValue({ alternateNumber1: '' });
    component.doModify();

    const req = http.expectOne(UPDATE);
    expect(req.request.body.benPhoneMaps.length).toBe(2);
    expect(req.request.body.benPhoneMaps[1]).toEqual(
      jasmine.objectContaining({ benPhoneMapID: 901, phoneNo: '', modifiedBy: 'agent104', deleted: false }),
    );
    req.flush({ statusCode: 200, data: 'Success' });
  });

  it('doModify() sends all six changeIn flags as true', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    selectForUpdate(component, record(ADDRESS_BEFORE, existingPhoneMaps()));

    component.doModify();

    const req = http.expectOne(UPDATE);
    expect(req.request.body.changeInSelfDetails).toBeTrue();
    expect(req.request.body.changeInIdentities).toBeTrue();
    expect(req.request.body.changeInOtherDetails).toBeTrue();
    expect(req.request.body.changeInAddress).toBeTrue();
    expect(req.request.body.changeInContacts).toBeTrue();
    expect(req.request.body.changeInFamilyDetails).toBeTrue();
    req.flush({ statusCode: 200, data: 'Success' });
  });

  it('doModify() falls back to the call CLI when the record came back without phone maps', () => {
    TestBed.inject(CallStore).startCall({ cli: '9876543210', sessionId: 'session-1' });
    const fixture = render();
    http.expectOne(SEARCH_BY_PHONE).flush({ data: [] });
    const component = fixture.componentInstance;
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    selectForUpdate(component, record(ADDRESS_BEFORE));

    component.doModify();

    const req = http.expectOne(UPDATE);
    expect(req.request.body.benPhoneMaps).toEqual([
      jasmine.objectContaining({ phoneNo: '9876543210', createdBy: 'agent104' }),
    ]);
    req.flush({ statusCode: 200, data: 'Success' });
  });

  it('doModify() still sends an empty array when there is neither a stored map nor a CLI', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    selectForUpdate(component, record(ADDRESS_BEFORE));

    component.doModify();

    const req = http.expectOne(UPDATE);
    expect(req.request.body.benPhoneMaps).toEqual([]);
    req.flush({ statusCode: 200, data: 'Success' });
  });

  it('an address edit is sent with the new ids and comes back on the next read', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    selectForUpdate(component, record(ADDRESS_BEFORE, existingPhoneMaps()));

    component.registerForm.patchValue({
      stateID: ADDRESS_AFTER.stateID,
      districtID: ADDRESS_AFTER.districtID,
      subDistrictID: ADDRESS_AFTER.blockID,
      villageID: ADDRESS_AFTER.districtBranchID,
    });
    component.doModify();

    const req = http.expectOne(UPDATE);
    expect(req.request.body.i_bendemographics).toEqual(
      jasmine.objectContaining({
        beneficiaryRegID: 4321,
        stateID: ADDRESS_AFTER.stateID,
        districtID: ADDRESS_AFTER.districtID,
        blockID: ADDRESS_AFTER.blockID,
        districtBranchID: ADDRESS_AFTER.districtBranchID,
      }),
    );
    expect(req.request.body.changeInAddress).toBeTrue();
    req.flush({ statusCode: 200, data: 'Success' });

    selectForUpdate(component, record(ADDRESS_AFTER, existingPhoneMaps()));

    const reloaded = component.registerForm.getRawValue();
    expect(reloaded.stateID).toBe(ADDRESS_AFTER.stateID);
    expect(reloaded.districtID).toBe(ADDRESS_AFTER.districtID);
    expect(reloaded.subDistrictID).toBe(ADDRESS_AFTER.blockID);
    expect(reloaded.villageID).toBe(ADDRESS_AFTER.districtBranchID);
  });

  it('loading a beneficiary for review settles a district lookup left pending, even once its stale response lands', () => {
    TestBed.inject(CallStore).startCall({ cli: '9876543210', sessionId: 'session-1' });
    const fixture = render();
    http.expectOne(SEARCH_BY_PHONE).flush({ data: [] });
    const component = fixture.componentInstance;
    component.registerForm.controls.stateID.setValue(3);
    component.onStateChange();
    expect(component.districtsLoading()).toBeTrue();
    expect(component.registerForm.controls.districtID.disabled).toBeTrue();

    component.selectBeneficiary({ beneficiaryRegID: 4321 });
    http.expectOne(SEARCH_BY_ID).flush({ data: [record(ADDRESS_AFTER, existingPhoneMaps())] });

    expect(component.districtsLoading()).toBeFalse();
    expect(component.registerForm.controls.districtID.enabled).toBeTrue();

    http.expectOne((r) => r.url.includes('location/districts/3')).flush({ statusCode: 200, data: [{ districtID: 9, districtName: 'Stale' }] });

    expect(component.districtsLoading()).toBeFalse();
    expect(component.registerForm.controls.districtID.enabled).toBeTrue();
    expect(component.addressLookupBusy()).toBeFalse();
    expect(component.districts()).toEqual([]);

    flushAddressCascade(ADDRESS_AFTER);

    expect(component.districts()).toEqual([{ districtID: ADDRESS_AFTER.districtID, districtName: 'District' }]);
    expect(component.registerForm.controls.districtID.value).toBe(ADDRESS_AFTER.districtID);
    expect(component.registerForm.controls.villageID.value).toBe(ADDRESS_AFTER.districtBranchID);
  });

  function recordWithIncome(address: typeof ADDRESS_BEFORE, incomeStatusID: number): BeneficiaryRecord {
    const detail = record(address, existingPhoneMaps());
    detail.i_bendemographics = { ...detail.i_bendemographics, incomeStatusID };
    return detail;
  }

  it('doModify() echoes the fetched incomeStatusID so the backend does not clear it', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    selectForUpdate(component, recordWithIncome(ADDRESS_BEFORE, 2));

    component.doModify();

    const req = http.expectOne(UPDATE);
    expect(req.request.body.i_bendemographics.incomeStatusID).toBe(2);
    req.flush({ statusCode: 200, data: 'Success' });
  });

  it('doModify() omits incomeStatusID when the fetched record has none', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    selectForUpdate(component, record(ADDRESS_BEFORE, existingPhoneMaps()));

    component.doModify();

    const req = http.expectOne(UPDATE);
    expect('incomeStatusID' in req.request.body.i_bendemographics).toBeFalse();
    req.flush({ statusCode: 200, data: 'Success' });
  });

  it('an address-only modify preserves incomeStatusID end to end', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    selectForUpdate(component, recordWithIncome(ADDRESS_BEFORE, 2));

    component.registerForm.patchValue({
      stateID: ADDRESS_AFTER.stateID,
      districtID: ADDRESS_AFTER.districtID,
      subDistrictID: ADDRESS_AFTER.blockID,
      villageID: ADDRESS_AFTER.districtBranchID,
    });
    component.doModify();

    const req = http.expectOne(UPDATE);
    expect(req.request.body.i_bendemographics).toEqual(
      jasmine.objectContaining({
        stateID: ADDRESS_AFTER.stateID,
        districtBranchID: ADDRESS_AFTER.districtBranchID,
        incomeStatusID: 2,
      }),
    );
    req.flush({ statusCode: 200, data: 'Success' });

    selectForUpdate(component, recordWithIncome(ADDRESS_AFTER, 2));

    component.doModify();
    const again = http.expectOne(UPDATE);
    expect(again.request.body.i_bendemographics.incomeStatusID).toBe(2);
    again.flush({ statusCode: 200, data: 'Success' });
  });

  function renderOnCall() {
    TestBed.inject(CallStore).startCall({ cli: '9876543210', sessionId: 'session-1' });
    const fixture = render();
    http.expectOne(SEARCH_BY_PHONE).flush({ data: [] });
    return fixture;
  }

  function recordWithIdentity(govtIdentityTypeID: number | null, govtIdentityNo: string | null): BeneficiaryRecord {
    return { ...record(ADDRESS_BEFORE, existingPhoneMaps()), govtIdentityTypeID, govtIdentityNo };
  }

  it('treats ID type 0 with ID number "0" as no ID and still sends the modify', () => {
    const fixture = renderOnCall();
    const component = fixture.componentInstance;
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    selectForUpdate(component, recordWithIdentity(0, '0'));

    expect(component.registerForm.controls.identityType.value).toBeNull();
    expect(component.registerForm.controls.govtIdentityNo.value).toBe('');
    expect(component.registerForm.controls.govtIdentityNo.disabled).toBeTrue();
    expect(component.registerForm.valid).toBeTrue();

    component.page.set(2);
    component.doModify();

    const req = http.expectOne(UPDATE);
    expect(req.request.body.beneficiaryIdentities).toEqual([{ govtIdentityNo: '0', govtIdentityTypeID: 0 }]);
    req.flush({ statusCode: 200, data: 'Success' });
  });

  it('treats ID number "0" under a real ID type as an empty number', () => {
    const fixture = renderOnCall();
    const component = fixture.componentInstance;
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    selectForUpdate(component, recordWithIdentity(1, '0'));

    expect(component.registerForm.controls.identityType.value).toBe(1);
    expect(component.registerForm.controls.govtIdentityNo.value).toBe('');

    component.doModify();

    const req = http.expectOne(UPDATE);
    expect(req.request.body.beneficiaryIdentities).toEqual([{ govtIdentityNo: '', govtIdentityTypeID: 1 }]);
    req.flush({ statusCode: 200, data: 'Success' });
  });

  it('sends a real ID from the form unchanged', () => {
    const fixture = renderOnCall();
    const component = fixture.componentInstance;
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    selectForUpdate(component, recordWithIdentity(1, '123456789012'));

    component.doModify();

    const req = http.expectOne(UPDATE);
    expect(req.request.body.beneficiaryIdentities).toEqual([{ govtIdentityNo: '123456789012', govtIdentityTypeID: 1 }]);
    req.flush({ statusCode: 200, data: 'Success' });
  });

  it('doModify() on an invalid ID number names the field and returns to page 1 instead of failing silently', () => {
    const fixture = renderOnCall();
    const component = fixture.componentInstance;
    const toastSpy = spyOn(toast, 'error');
    selectForUpdate(component, recordWithIdentity(1, '12'));
    component.page.set(2);

    component.doModify();

    http.expectNone(UPDATE);
    expect(component.page()).toBe(1);
    expect(toastSpy).toHaveBeenCalledOnceWith('Please correct these fields before saving: ID number');
  });

  it('doModify() on an invalid page-2 field names it and stays on page 2', () => {
    const fixture = renderOnCall();
    const component = fixture.componentInstance;
    const toastSpy = spyOn(toast, 'error');
    selectForUpdate(component, record(ADDRESS_BEFORE, existingPhoneMaps()));
    component.page.set(2);
    component.registerForm.controls.pincode.setValue('12');

    component.doModify();

    http.expectNone(UPDATE);
    expect(component.page()).toBe(2);
    expect(toastSpy).toHaveBeenCalledOnceWith('Please correct these fields before saving: Pincode');
  });
});
