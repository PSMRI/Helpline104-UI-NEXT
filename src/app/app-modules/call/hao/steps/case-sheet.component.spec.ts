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

import { AuthStore } from '../../../core/auth/auth.store';
import { CallStore } from '../../call.store';
import { CaseSheetComponent } from './case-sheet.component';

function setRole(authStore: AuthStore, featureCode: string): void {
  authStore.setSession({
    token: 't',
    user: { userID: 1, agentID: 100, userName: 'agent', status: 'Active' },
  });
  authStore.setCurrentRole({
    roleID: 1,
    roleName: featureCode,
    serviceID: 1,
    serviceName: '104',
    serviceProviderID: 1,
    providerServiceMapID: 1,
    workingLocationID: null,
    apimanClientKey: null,
    featureCode,
  });
}

describe('CaseSheetComponent — Prescription (MO-only)', () => {
  let authStore: AuthStore;
  let callStore: CallStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CaseSheetComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    authStore = TestBed.inject(AuthStore);
    callStore = TestBed.inject(CallStore);
    http = TestBed.inject(HttpTestingController);
    callStore.setBeneficiaryId(1, null);
  });

  afterEach(() => {
    http.verify();
    // CallStore persists beneficiaryId/districtID to real sessionStorage —
    // clear it so a prior test's beneficiary doesn't leak into the next.
    sessionStorage.clear();
  });

  function render() {
    const fixture = TestBed.createComponent(CaseSheetComponent);
    fixture.componentRef.setInput('beneficiaryId', 1);
    fixture.detectChanges();
    return fixture;
  }

  function flushInit(recentPrescriptions: Array<{ createdDate: string }> = []) {
    http.match((req) => req.url.includes('getAvailableDiseases')).forEach((req) => req.flush({ data: [] }));
    http.match((req) => req.url.includes('getPresentCaseSheet')).forEach((req) => req.flush({ data: null }));
    http.match((req) => req.url.includes('prescriptionList')).forEach((req) => req.flush({ data: recentPrescriptions }));
    http.match((req) => req.url.includes('covid/master/VaccinationTypeAndDoseTaken')).forEach((req) => req.flush({ data: null }));
  }

  it('shows Prescription and Resend Last Prescription for MO with a prescription in the last 5 days', () => {
    setRole(authStore, 'MO');
    const fixture = render();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    flushInit([{ createdDate: twoDaysAgo }]);
    fixture.detectChanges();

    expect(fixture.componentInstance.showPrescription()).toBeTrue();
    expect(fixture.componentInstance.recentPrescription()).not.toBeNull();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    expect(buttons.some((b) => b.textContent?.includes('Resend Last Prescription'))).toBeTrue();
  });

  it('hides Resend Last Prescription for MO when the only prescription is older than 5 days', () => {
    setRole(authStore, 'MO');
    const fixture = render();
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    flushInit([{ createdDate: eightDaysAgo }]);
    fixture.detectChanges();

    expect(fixture.componentInstance.recentPrescription()).toBeNull();
  });

  it('does not show Prescription for HAO', () => {
    setRole(authStore, 'HAO');
    const fixture = render();
    http.match((req) => req.url.includes('getAvailableDiseases')).forEach((req) => req.flush({ data: [] }));
    http.match((req) => req.url.includes('getPresentCaseSheet')).forEach((req) => req.flush({ data: null }));
    http.match((req) => req.url.includes('covid/master/VaccinationTypeAndDoseTaken')).forEach((req) => req.flush({ data: null }));
    fixture.detectChanges();

    expect(fixture.componentInstance.showPrescription()).toBeFalse();
    http.expectNone((req) => req.url.includes('prescriptionList'));
  });

  it('Clear resets the case sheet form to its defaults', () => {
    setRole(authStore, 'MO');
    const fixture = render();
    flushInit();
    fixture.detectChanges();

    fixture.componentInstance.form.controls.chiefComplaints.setValue('some complaint');
    fixture.componentInstance.form.controls.remarks.setValue('some remark');
    fixture.componentInstance.resetForm();

    expect(fixture.componentInstance.form.controls.chiefComplaints.value).toBe('');
    expect(fixture.componentInstance.form.controls.remarks.value).toBeNull();
  });
});

describe('CaseSheetComponent — CO role', () => {
  let authStore: AuthStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CaseSheetComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    authStore = TestBed.inject(AuthStore);
    http = TestBed.inject(HttpTestingController);
    authStore.setSession({
      token: 't',
      user: { userID: 1, agentID: 100, userName: 'co1', status: 'Active' },
    });
    authStore.setCurrentRole({
      roleID: 1,
      roleName: 'CO',
      serviceID: 1,
      serviceName: 'Counselling',
      serviceProviderID: 1,
      providerServiceMapID: 5,
      workingLocationID: 1,
      apimanClientKey: null,
      featureCode: 'CO',
    });
  });

  afterEach(() => {
    http.match(() => true).forEach((req) => req.flush({ data: [] }));
    http.verify();
    sessionStorage.clear();
  });

  function render() {
    const fixture = TestBed.createComponent(CaseSheetComponent);
    fixture.detectChanges();
    return fixture;
  }

  function flushInit(fixture: ReturnType<typeof render>, categories: unknown[] = []) {
    http.expectOne((req) => req.url.includes('diseaseController/getAvailableDiseases')).flush({ data: [] });
    http.expectOne((req) => req.url.includes('covid/master/VaccinationTypeAndDoseTaken')).flush({ data: null });
    http
      .expectOne((req) => req.url.includes('beneficiary/get/services'))
      .flush({ data: [{ subServiceName: 'Counselling', subServiceID: 9 }] });
    http.expectOne((req) => req.url.includes('service/category')).flush({ data: categories });
    fixture.detectChanges();
  }

  it('filters categories by Well Being vs Information', () => {
    const fixture = render();
    flushInit(fixture, [
      { categoryID: 1, categoryName: 'Stress', isWellBeing: true },
      { categoryID: 2, categoryName: 'Addiction Problems', isWellBeing: false },
    ]);

    const component = fixture.componentInstance;
    expect(component.filteredCategories().map((c) => c.categoryID)).toEqual([1]);

    component.form.controls.wellbeingOrInfo.setValue('2');
    fixture.detectChanges();
    expect(component.filteredCategories().map((c) => c.categoryID)).toEqual([2]);
  });

  it('disables guideline search until a category is chosen, then shows results with a download link', () => {
    const fixture = render();
    flushInit(fixture, [{ categoryID: 2, categoryName: 'Addiction Problems', isWellBeing: false }]);
    const component = fixture.componentInstance;

    expect(component.form.controls.categoryID.value).toBeNull();
    component.searchGuidelines();
    http.expectNone((req) => req.url.includes('service/getSubCategoryFilesWithURL'));

    component.form.controls.categoryID.setValue(2);
    http.expectOne((req) => req.url.includes('service/subcategory')).flush({ data: [] });
    fixture.detectChanges();

    component.searchGuidelines();
    http
      .expectOne((req) => req.url.includes('service/getSubCategoryFilesWithURL'))
      .flush({ data: [{ subCategoryName: 'Alcohol Intoxication', subCatFilePath: 'https://example.com/a.xlsx' }] });
    fixture.detectChanges();

    expect(component.guidelineResults()).not.toBeNull();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a[href="https://example.com/a.xlsx"]');
    expect(link).not.toBeNull();
  });

  it('shows "no document available" when a search returns no downloadable files', () => {
    const fixture = render();
    flushInit(fixture, [{ categoryID: 2, categoryName: 'Addiction Problems', isWellBeing: false }]);
    const component = fixture.componentInstance;

    component.form.controls.categoryID.setValue(2);
    http.expectOne((req) => req.url.includes('service/subcategory')).flush({ data: [] });
    fixture.detectChanges();

    component.searchGuidelines();
    http.expectOne((req) => req.url.includes('service/getSubCategoryFilesWithURL')).flush({ data: [] });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No document available');
  });

  it('requires Present Chief Complaint, Provisional Diagnosis (min 4 chars) and Treatment Recommendation for CO', () => {
    const fixture = render();
    flushInit(fixture);
    const component = fixture.componentInstance;

    expect(component.form.controls.chiefComplaints.hasError('required')).toBeTrue();
    expect(component.form.controls.provisionalDiagnosis.hasError('required')).toBeTrue();
    expect(component.form.controls.treatmentRecommendation.hasError('required')).toBeTrue();

    component.form.controls.provisionalDiagnosis.setValue('abc');
    expect(component.form.controls.provisionalDiagnosis.hasError('minlength')).toBeTrue();

    component.form.controls.chiefComplaints.setValue('fever');
    component.form.controls.provisionalDiagnosis.setValue('viral fever');
    component.form.controls.treatmentRecommendation.setValue('rest and fluids');
    expect(component.form.controls.chiefComplaints.valid).toBeTrue();
    expect(component.form.controls.provisionalDiagnosis.valid).toBeTrue();
    expect(component.form.controls.treatmentRecommendation.valid).toBeTrue();
  });

  it("resolves Counselling's subServiceID before requesting guideline categories", () => {
    const fixture = render();
    http.expectOne((req) => req.url.includes('diseaseController/getAvailableDiseases')).flush({ data: [] });
    http.expectOne((req) => req.url.includes('covid/master/VaccinationTypeAndDoseTaken')).flush({ data: null });
    http
      .expectOne((req) => req.url.includes('beneficiary/get/services'))
      .flush({ data: [{ subServiceName: 'Medical Officer' }, { subServiceName: 'Counselling', subServiceID: 42 }] });

    const categoryReq = http.expectOne((req) => req.url.includes('service/category'));
    expect(categoryReq.request.body).toEqual({ providerServiceMapID: 5, subServiceID: 42 });
    categoryReq.flush({ data: [] });
    fixture.detectChanges();
  });

  it('does not require Risk Level', () => {
    const fixture = render();
    flushInit(fixture);
    const component = fixture.componentInstance;
    expect(component.form.controls.riskLevel.valid).toBeTrue();
  });
});
