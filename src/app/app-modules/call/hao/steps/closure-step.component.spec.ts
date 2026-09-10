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
    // CallStore persists beneficiaryId/districtID to real sessionStorage (by
    // design, for page-reload survival) — without clearing it here, a fresh
    // TestBed-created CallStore in the next test still rehydrates whatever a
    // prior test left behind, leaking state across tests order-dependently.
    sessionStorage.clear();
  });

  /**
   * `render()` always triggers the transfer-campaign/service lookups —
   * legacy's Transfer Call select is populated eagerly, not behind a
   * checkbox — so tests that need real data there pass it through.
   */
  function render(
    featureCode: string,
    transferData: { campaigns?: Array<{ campaign_name: string }>; services?: Array<{ subServiceName: string }> } = {},
  ) {
    authStore.setCurrentRole(currentRole(featureCode));
    const fixture = TestBed.createComponent(ClosureStepComponent);
    fixture.detectChanges();
    http.match((req) => req.url.includes('getCallTypesV1')).forEach((req) => req.flush({ data: [] }));
    http.match((req) => req.url.includes('getRegistrationDataV1')).forEach((req) => req.flush({ data: {} }));
    http.match((req) => req.url.includes('getInstituteTypes')).forEach((req) => req.flush({ data: [] }));
    http
      .match((req) => req.url.includes('getTransferCampaigns'))
      .forEach((req) => req.flush({ data: { campaign: transferData.campaigns ?? [] } }));
    http
      .match((req) => req.url.includes('beneficiary/get/services'))
      .forEach((req) => req.flush({ data: transferData.services ?? [] }));
    // resolveAgentIPAddress() only fires when a session is set (agentID != null) —
    // most callers here have none, so this is a no-op match for them.
    http.match((req) => req.url.includes('getAgentIPAddress')).forEach((req) => req.flush({ data: null }));
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
    expect(fixture.nativeElement.querySelector('input[formcontrolname="isFeedback"]')).toBeNull();

    component.form.controls.callGroupType.setValue('Valid');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="isFeedback"]')).not.toBeNull();

    component.form.controls.callGroupType.setValue('Transfer');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[formcontrolname="isFeedback"]')).toBeNull();
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

  it('hides the Skill dropdown for CO even when a transfer service is selected and skills are loaded', () => {
    const fixture = render('CO', { services: [{ subServiceName: 'Counselling Service' }] });
    const component = fixture.componentInstance;
    component.skills.set([{ skillName: 'General' }]);
    component.form.controls.transferService.setValue('Counselling Service');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('select[formcontrolname="skill"]')).toBeNull();
  });

  it('disables Submit & Close / Submit & Continue while a transfer service is selected', () => {
    // loadCampaigns() needs a real agentID (no session ⇒ it no-ops and the
    // campaign list stays empty, regardless of what render() is told to flush).
    authStore.setSession({ token: 't', user: { userID: 1, agentID: 7, userName: 'agent', status: 'Active' } });
    const fixture = render('HAO', {
      campaigns: [{ campaign_name: 'MO_CAMPAIGN' }],
      services: [{ subServiceName: 'Medical Advisory Service' }],
    });
    const component = fixture.componentInstance;
    component.form.controls.transferService.setValue('Medical Advisory Service');
    fixture.detectChanges();
    http.match((req) => req.url.includes('getCampaignSkills')).forEach((req) => req.flush({ data: [] }));
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    const submitClose = buttons.find((b) => b.textContent?.includes('Submit & Close'));
    const submitContinue = buttons.find((b) => b.textContent?.includes('Submit & Continue'));
    expect(submitClose?.disabled).toBeTrue();
    expect(submitContinue?.disabled).toBeTrue();

    component.form.controls.transferService.setValue(null);
    fixture.detectChanges();
    expect(submitClose?.disabled).toBeFalse();
    expect(submitContinue?.disabled).toBeFalse();
  });

  it('filters the transfer-service list to Health Advisory only for RO with no beneficiary selected', () => {
    const fixture = render('RO', {
      services: [{ subServiceName: 'Health Advisory Service' }, { subServiceName: 'Counselling Service' }],
    });
    const component = fixture.componentInstance;
    expect(component.transferServices()).toEqual([{ subServiceName: 'Health Advisory Service' }]);
  });

  it('resolves a selected transfer service to its campaign, and errors + clears the selection when none is configured', () => {
    authStore.setSession({ token: 't', user: { userID: 1, agentID: 7, userName: 'agent', status: 'Active' } });
    const fixture = render('HAO', {
      campaigns: [{ campaign_name: 'CO_CAMPAIGN' }],
      services: [{ subServiceName: 'Counselling Service' }, { subServiceName: 'Medical Advisory Service' }],
    });
    const component = fixture.componentInstance;

    component.form.controls.transferService.setValue('Counselling Service');
    fixture.detectChanges();
    http.match((req) => req.url.includes('getCampaignSkills')).forEach((req) => req.flush({ data: [] }));
    fixture.detectChanges();
    expect(component.selectedCampaign()).toBe('CO_CAMPAIGN');

    component.form.controls.transferService.setValue('Medical Advisory Service');
    fixture.detectChanges();
    expect(component.selectedCampaign()).toBeNull();
    expect(component.form.controls.transferService.value).toBeNull();
  });

  it('auto-opens Schedule Appointment for Referral only when a beneficiary is selected, and reverts to Valid otherwise', () => {
    const fixture = render('HAO');
    const component = fixture.componentInstance;
    component.callTypes.set([
      {
        callGroupType: 'Referral',
        callTypes: [
          {
            callTypeID: 2,
            callTypeDesc: 'Referral',
            callGroupType: 'Referral',
            isInbound: true,
            isOutbound: false,
            fitToBlock: false,
            fitForFollowUp: false,
          },
        ],
      },
    ]);
    fixture.detectChanges();

    component.form.controls.callGroupType.setValue('Referral');
    fixture.detectChanges();
    expect(component.showAppointment()).toBeFalse();
    expect(component.form.controls.callGroupType.value).toBe('Valid');

    callStore.setBeneficiaryId(123, null);
    component.form.controls.callGroupType.setValue('Referral');
    fixture.detectChanges();
    expect(component.showAppointment()).toBeTrue();
    callStore.setBeneficiaryId(null, null);
  });

  it('filters "Referral" out of the call-type list for roles other than HAO/MO', () => {
    const fixture = render('CO');
    const component = fixture.componentInstance;
    component.callTypes.set([
      { callGroupType: 'Valid', callTypes: [] },
      { callGroupType: 'Referral', callTypes: [] },
    ]);
    fixture.detectChanges();
    expect(component.visibleCallTypes().map((t) => t.callGroupType)).toEqual(['Valid']);
  });

  it('blocks Submit & Continue (but not Submit & Close) for call types other than Valid/Transfer/Referral', () => {
    const fixture = render('HAO');
    const component = fixture.componentInstance;
    component.callTypes.set([
      {
        callGroupType: 'Incomplete',
        callTypes: [
          {
            callTypeID: 9,
            callTypeDesc: 'Incomplete',
            callGroupType: 'Incomplete',
            isInbound: true,
            isOutbound: false,
            fitToBlock: false,
            fitForFollowUp: false,
          },
        ],
      },
    ]);
    component.form.controls.callGroupType.setValue('Incomplete');
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    const submitClose = buttons.find((b) => b.textContent?.includes('Submit & Close'));
    const submitContinue = buttons.find((b) => b.textContent?.includes('Submit & Continue'));
    expect(submitContinue?.disabled).toBeTrue();
    expect(submitClose?.disabled).toBeFalse();
  });

  it('hides the follow-up Feature select for a role with only one candidate feature', () => {
    const fixture = render('HAO');
    const component = fixture.componentInstance;
    expect(component.features()).toEqual(['Health_Advice']);

    component.form.controls.isFollowupRequired.setValue(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('select[formcontrolname="selectedFeature"]')).toBeNull();
  });

  it('shows and requires the follow-up Feature select when the role also holds Blood Request', () => {
    authStore.setSession({
      token: 't',
      user: { userID: 1, agentID: 7, userName: 'agent', status: 'Active' },
      privileges: [
        {
          serviceName: '104',
          roles: [
            {
              serviceRoleScreenMappings: [
                { screen: { screenName: 'Health_Advice' } },
                { screen: { screenName: 'Blood Request' } },
              ],
            },
          ],
        },
      ],
    });
    const fixture = render('HAO');
    const component = fixture.componentInstance;
    expect(component.features()).toEqual(['Health_Advice', 'Blood Request']);

    component.form.controls.isFollowupRequired.setValue(true);
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select[formcontrolname="selectedFeature"]');
    expect(select).not.toBeNull();
    expect(component.form.controls.selectedFeature.hasError('required')).toBeTrue();

    component.form.controls.selectedFeature.setValue('Blood Request');
    expect(component.form.controls.selectedFeature.valid).toBeTrue();
  });

  /**
   * closeCall must carry the real providerServiceMapID, not serviceID. When
   * isFollowupRequired is set the backend re-reads the very same body as an
   * OutboundCallRequest and persists this value to
   * t_outboundcallrequest.ProviderServiceMapID
   * (BeneficiaryCallServiceImpl.closeCall:396-398), and every outbound
   * worklist query filters on it. The wrong id there loses the follow-up
   * silently — no error, the row simply never appears in any worklist.
   */
  it('sends the providerServiceMapID (not serviceID) when closing a call with follow-up required', () => {
    const fixture = render('HAO');
    const component = fixture.componentInstance;
    callStore.setBeneficiaryId(123, null);
    callStore.setCallId('555');
    fixture.detectChanges();

    // subTypes is derived from the loaded call types, so seed those.
    component.callTypes.set([
      {
        callGroupType: 'Valid',
        callTypes: [
          {
            callTypeID: 9,
            callTypeDesc: 'Valid',
            callGroupType: 'Valid',
            isInbound: true,
            isOutbound: false,
            fitToBlock: false,
            fitForFollowUp: true,
          },
        ],
      },
    ]);
    component.form.patchValue({
      callGroupType: 'Valid',
      callSubTypeID: 9,
      isFollowupRequired: true,
      followUpDate: '2026-12-01',
    });
    fixture.detectChanges();

    // Submit & Close confirms first; take the Ok branch.
    spyOn(TestBed.inject(ConfirmDialogService), 'confirm').and.returnValue(of(true));
    spyOn(TestBed.inject(ConfirmDialogService), 'alert').and.returnValue(of(undefined));

    component.submit(false);

    const req = http.expectOne((r) => r.url.includes('call/closeCall'));
    const body = req.request.body as { providerServiceMapID: number; isFollowupRequired: boolean };
    expect(body.isFollowupRequired).toBeTrue();
    expect(body.providerServiceMapID).toBe(1);
    // The role's serviceID is 42 in this harness; it must not leak through.
    expect(body.providerServiceMapID).not.toBe(42);
    req.flush({ data: 1 });
    // Closure also pushes caste/education for the attached beneficiary.
    http
      .match((r) => r.url.includes('updateCommunityorEducation'))
      .forEach((r) => r.flush({ data: 1 }));

    callStore.setBeneficiaryId(null, null);
  });
});
