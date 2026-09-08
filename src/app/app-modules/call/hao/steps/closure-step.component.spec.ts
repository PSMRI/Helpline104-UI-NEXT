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
import { CurrentRole } from '../../../core/auth/auth.models';
import { CallStore } from '../../call.store';
import { ClosureStepComponent } from './closure-step.component';

function currentRole(featureCode: string): CurrentRole {
  return {
    roleID: 1,
    roleName: featureCode,
    serviceID: 42,
    serviceName: '104',
    serviceProviderID: 1,
    providerServiceMapID: 1,
    workingLocationID: 1,
    apimanClientKey: null,
    featureCode,
  };
}

describe('ClosureStepComponent', () => {
  let authStore: AuthStore;
  let callStore: CallStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ClosureStepComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    authStore = TestBed.inject(AuthStore);
    callStore = TestBed.inject(CallStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function render(featureCode: string) {
    authStore.setCurrentRole(currentRole(featureCode));
    const fixture = TestBed.createComponent(ClosureStepComponent);
    fixture.detectChanges();
    http.match((req) => req.url.includes('getCallTypesV1')).forEach((req) => req.flush({ data: [] }));
    http.match((req) => req.url.includes('getRegistrationDataV1')).forEach((req) => req.flush({ data: {} }));
    http.match((req) => req.url.includes('getInstituteTypes')).forEach((req) => req.flush({ data: [] }));
    fixture.detectChanges();
    return fixture;
  }

  it('shows Emergency/Suicidal only for RO', () => {
    const ro = render('RO');
    expect(ro.nativeElement.querySelector('input[formcontrolname="isEmergency"]')).not.toBeNull();
    ro.destroy();

    const hao = render('HAO');
    expect(hao.nativeElement.querySelector('input[formcontrolname="isEmergency"]')).toBeNull();
    expect(hao.nativeElement.querySelector('input[formcontrolname="isSuicidal"]')).toBeNull();
  });

  it('shows the IVR Feedback Required checkbox only when Call Type is Valid', () => {
    const fixture = render('HAO');
    const component = fixture.componentInstance;
    expect(fixture.nativeElement.querySelector('input[formcontrolname="isFeedbackRequired"]')).toBeNull();

    component.form.controls.callGroupType.setValue('Valid');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="isFeedbackRequired"]')).not.toBeNull();

    component.form.controls.callGroupType.setValue('Transfer');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="isFeedbackRequired"]')).toBeNull();
  });

  it('shows Caste for non-RO roles once a beneficiary is attached, and Education/External Referral only for CO', () => {
    const hao = render('HAO');
    expect(hao.nativeElement.querySelector('select[formcontrolname="caste"]')).toBeNull();
    callStore.setBeneficiaryId(123, null);
    hao.detectChanges();
    expect(hao.nativeElement.querySelector('select[formcontrolname="caste"]')).not.toBeNull();
    expect(hao.nativeElement.querySelector('select[formcontrolname="education"]')).toBeNull();
    expect(hao.nativeElement.querySelector('select[formcontrolname="externalRefferal"]')).toBeNull();
    callStore.setBeneficiaryId(null, null);
    hao.destroy();

    const co = render('CO');
    callStore.setBeneficiaryId(123, null);
    co.detectChanges();
    expect(co.nativeElement.querySelector('select[formcontrolname="caste"]')).not.toBeNull();
    expect(co.nativeElement.querySelector('select[formcontrolname="education"]')).not.toBeNull();
    expect(co.nativeElement.querySelector('select[formcontrolname="externalRefferal"]')).not.toBeNull();
    callStore.setBeneficiaryId(null, null);
  });

  it('hides the Skill dropdown for CO even when a transfer is armed and skills are loaded', () => {
    const fixture = render('CO');
    const component = fixture.componentInstance;
    component.skills.set([{ skillName: 'General' }]);
    component.form.controls.doTransfer.setValue(true);
    fixture.detectChanges();
    http.match((req) => req.url.includes('getTransferCampaigns')).forEach((req) => req.flush({ data: [] }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('select[formcontrolname="skill"]')).toBeNull();
  });

  it('disables Submit & Close / Submit & Continue while a transfer is armed', () => {
    const fixture = render('HAO');
    const component = fixture.componentInstance;
    component.form.controls.doTransfer.setValue(true);
    fixture.detectChanges();
    http.match((req) => req.url.includes('getTransferCampaigns')).forEach((req) => req.flush({ data: [] }));
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    const submitClose = buttons.find((b) => b.textContent?.includes('Submit & Close'));
    const submitContinue = buttons.find((b) => b.textContent?.includes('Submit & Continue'));
    expect(submitClose?.disabled).toBeTrue();
    expect(submitContinue?.disabled).toBeTrue();

    component.form.controls.doTransfer.setValue(false);
    fixture.detectChanges();
    expect(submitClose?.disabled).toBeFalse();
    expect(submitContinue?.disabled).toBeFalse();
  });
});
