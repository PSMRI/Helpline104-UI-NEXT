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

  it('pre-selects Valid for an emergency call but leaves the Call Type select editable', () => {
    callStore.setEmergencyCall(true);
    const fixture = render('HAO');
    const component = fixture.componentInstance;
    component.callTypes.set([
      { callGroupType: 'Valid', callTypes: [] },
      { callGroupType: 'Transfer', callTypes: [] },
    ]);
    fixture.detectChanges();

    expect(component.form.controls.callGroupType.value).toBe('Valid');
    expect(component.form.controls.callGroupType.enabled).toBeTrue();
    const select = fixture.nativeElement.querySelector('select[formcontrolname="callGroupType"]') as HTMLSelectElement;
    expect(select.disabled).toBeFalse();

    component.form.controls.callGroupType.setValue('Transfer');
    fixture.detectChanges();
    expect(component.form.controls.callGroupType.value).toBe('Transfer');
    expect(component.form.controls.callGroupType.enabled).toBeTrue();

    callStore.setEmergencyCall(false);
  });

  it('clears the pre-selected Call Type once the call is no longer flagged emergency', () => {
    callStore.setEmergencyCall(true);
    const fixture = render('HAO');
    const component = fixture.componentInstance;
    expect(component.form.controls.callGroupType.value).toBe('Valid');

    callStore.setEmergencyCall(false);
    fixture.detectChanges();

    expect(component.form.controls.callGroupType.value).toBeNull();
    expect(component.form.controls.callGroupType.enabled).toBeTrue();
    expect(component.form.controls.callGroupType.touched).toBeFalse();
    expect(component.isInvalid('callGroupType')).toBeFalse();
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

    // A Valid disposition requires a service to have been availed (legacy
    // closure.component.ts:703-712); this case is about the closeCall body.
    fixture.componentRef.setInput('serviceAvailed', true);
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

  it('shows an inline error with Retry when the transfer services fail to load, and clears it once a retry succeeds', () => {
    authStore.setCurrentRole(currentRole('HAO'));
    const fixture = TestBed.createComponent(ClosureStepComponent);
    fixture.detectChanges();
    http.match((req) => req.url.includes('getCallTypesV1')).forEach((req) => req.flush({ data: [] }));
    http.match((req) => req.url.includes('getRegistrationDataV1')).forEach((req) => req.flush({ data: {} }));
    http.match((req) => req.url.includes('getInstituteTypes')).forEach((req) => req.flush({ data: [] }));
    http
      .expectOne((req) => req.url.includes('beneficiary/get/services'))
      .flush({ statusCode: 5000, errorMessage: 'Service map missing' });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.servicesError()).toBe('Service map missing');
    expect(component.services()).toEqual([]);
    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement | null;
    expect(alert?.textContent).toContain('Service map missing');
    const retry = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(
      (b) => b.textContent?.includes('Retry'),
    );
    expect(retry).toBeDefined();

    retry?.click();
    fixture.detectChanges();
    expect(component.servicesLoading()).toBeTrue();
    expect(component.form.controls.transferService.disabled).toBeTrue();
    http
      .expectOne((req) => req.url.includes('beneficiary/get/services'))
      .flush({ data: [{ subServiceName: 'Health Advisory Service' }] });
    fixture.detectChanges();

    expect(component.servicesError()).toBeNull();
    expect(component.servicesLoading()).toBeFalse();
    expect(component.form.controls.transferService.enabled).toBeTrue();
    expect(component.services()).toEqual([{ subServiceName: 'Health Advisory Service' }]);
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('disables the transfer-service select and shows a loading line until the services arrive', () => {
    authStore.setCurrentRole(currentRole('HAO'));
    const fixture = TestBed.createComponent(ClosureStepComponent);
    fixture.detectChanges();
    http.match((req) => req.url.includes('getCallTypesV1')).forEach((req) => req.flush({ data: [] }));
    http.match((req) => req.url.includes('getRegistrationDataV1')).forEach((req) => req.flush({ data: {} }));
    http.match((req) => req.url.includes('getInstituteTypes')).forEach((req) => req.flush({ data: [] }));
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const select = fixture.nativeElement.querySelector('#hao-cl-transfer-service') as HTMLSelectElement;
    expect(component.servicesLoading()).toBeTrue();
    expect(component.form.controls.transferService.disabled).toBeTrue();
    expect(select.disabled).toBeTrue();
    expect(select.getAttribute('aria-busy')).toBe('true');
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('Loading transfer services');

    http
      .expectOne((req) => req.url.includes('beneficiary/get/services'))
      .flush({ data: [{ subServiceName: 'Health Advisory Service' }] });
    fixture.detectChanges();

    expect(component.servicesLoading()).toBeFalse();
    expect(component.noServices()).toBeFalse();
    expect(component.form.controls.transferService.enabled).toBeTrue();
    expect(select.disabled).toBeFalse();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    expect(select.options.length).toBe(2);
  });

  it('shows an explicit empty state, not an error, when no transfer services are configured', () => {
    const fixture = render('HAO', { services: [] });
    const component = fixture.componentInstance;

    expect(component.noServices()).toBeTrue();
    expect(component.servicesError()).toBeNull();
    expect(component.servicesLoading()).toBeFalse();
    expect(component.form.controls.transferService.enabled).toBeTrue();
    const field = fixture.nativeElement.querySelector('#hao-cl-transfer-service')?.parentElement as HTMLElement;
    expect(field.textContent).toContain('No transfer services configured.');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  describe('transfer campaigns', () => {
    const CAMPAIGNS = (req: { url: string }) => req.url.includes('getTransferCampaigns');

    /** Like render(), but leaves the campaign lookup pending for the test to answer. */
    function renderWithCampaignsPending() {
      authStore.setSession({ token: 't', user: { userID: 1, agentID: 7, userName: 'agent', status: 'Active' } });
      authStore.setCurrentRole(currentRole('HAO'));
      const fixture = TestBed.createComponent(ClosureStepComponent);
      fixture.detectChanges();
      http.match((req) => req.url.includes('getCallTypesV1')).forEach((req) => req.flush({ data: [] }));
      http.match((req) => req.url.includes('getRegistrationDataV1')).forEach((req) => req.flush({ data: {} }));
      http.match((req) => req.url.includes('getInstituteTypes')).forEach((req) => req.flush({ data: [] }));
      http.match((req) => req.url.includes('getAgentIPAddress')).forEach((req) => req.flush({ data: null }));
      http
        .expectOne((req) => req.url.includes('beneficiary/get/services'))
        .flush({ data: [{ subServiceName: 'Medical Advisory Service' }] });
      fixture.detectChanges();
      return { fixture, component: fixture.componentInstance };
    }

    function campaignField(fixture: { nativeElement: HTMLElement }) {
      const select = fixture.nativeElement.querySelector<HTMLSelectElement>('#hao-cl-transfer-service');
      return {
        select,
        fieldText: select?.parentElement?.textContent ?? '',
        retry: Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Retry'),
        ),
      };
    }

    it('keeps the Transfer Call select disabled with a loading line until the campaigns arrive, even once the services have', () => {
      const { fixture, component } = renderWithCampaignsPending();

      expect(component.servicesLoading()).toBeFalse();
      expect(component.campaignsLoading()).toBeTrue();
      expect(component.form.controls.transferService.disabled).toBeTrue();
      const pending = campaignField(fixture);
      expect(pending.select?.disabled).toBeTrue();
      expect(pending.select?.getAttribute('aria-busy')).toBe('true');
      expect(pending.fieldText).toContain('Loading transfer campaigns');

      http.expectOne(CAMPAIGNS).flush({ data: { campaign: [{ campaign_name: 'MO_CAMPAIGN' }] } });
      fixture.detectChanges();

      expect(component.campaignsLoading()).toBeFalse();
      expect(component.noCampaigns()).toBeFalse();
      expect(component.campaignsError()).toBeNull();
      expect(component.form.controls.transferService.enabled).toBeTrue();
      const done = campaignField(fixture);
      expect(done.select?.disabled).toBeFalse();
      expect(done.select?.getAttribute('aria-busy')).toBeNull();
      expect(done.fieldText).not.toContain('Loading transfer campaigns');
      expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();

      component.form.controls.transferService.setValue('Medical Advisory Service');
      fixture.detectChanges();
      expect(component.selectedCampaign()).toBe('MO_CAMPAIGN');
      http.expectOne((req) => req.url.includes('getCampaignSkills')).flush({ data: [] });
    });

    it('shows an explicit empty state, not an error, on the backend\'s "No Campaigns Available" envelope', () => {
      const { fixture, component } = renderWithCampaignsPending();

      http.expectOne(CAMPAIGNS).flush({ statusCode: 5000, errorMessage: 'No Campaigns Available', status: 'Failure' });
      fixture.detectChanges();

      expect(component.noCampaigns()).toBeTrue();
      expect(component.campaignsError()).toBeNull();
      expect(component.campaignsLoading()).toBeFalse();
      expect(component.campaigns()).toEqual([]);
      expect(component.form.controls.transferService.enabled).toBeTrue();
      const empty = campaignField(fixture);
      expect(empty.fieldText).toContain('No transfer campaigns available.');
      expect(empty.retry).toBeUndefined();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('surfaces a failed campaign lookup inline with Retry, and clears it once the retry succeeds', () => {
      const { fixture, component } = renderWithCampaignsPending();

      http.expectOne(CAMPAIGNS).flush({ statusCode: 5000, errorMessage: 'CTI unavailable', status: 'Failure' });
      fixture.detectChanges();

      expect(component.campaignsError()).toBe('CTI unavailable');
      expect(component.campaignsLoading()).toBeFalse();
      expect(component.campaigns()).toEqual([]);
      expect(component.form.controls.transferService.enabled).toBeTrue();
      const failed = campaignField(fixture);
      expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('CTI unavailable');
      expect(failed.retry).toBeDefined();

      failed.retry?.click();
      fixture.detectChanges();
      expect(component.campaignsLoading()).toBeTrue();
      expect(component.form.controls.transferService.disabled).toBeTrue();
      http.expectOne(CAMPAIGNS).flush({ data: { campaign: [{ campaign_name: 'MO_CAMPAIGN' }] } });
      fixture.detectChanges();

      expect(component.campaignsError()).toBeNull();
      expect(component.campaigns()).toEqual([{ campaign_name: 'MO_CAMPAIGN', campaignName: 'MO_CAMPAIGN' }]);
      expect(component.form.controls.transferService.enabled).toBeTrue();
      expect(campaignField(fixture).retry).toBeUndefined();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('falls back to the translated message when the campaigns request fails without a backend message', () => {
      const { fixture, component } = renderWithCampaignsPending();

      http.expectOne(CAMPAIGNS).flush(null, { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();

      expect(component.campaignsError()).toBe('Could not load the transfer campaigns. Please retry.');
    });
  });

  describe('campaign skills', () => {
    const SKILLS = (req: { url: string }) => req.url.includes('getCampaignSkills');

    function selectMedicalService() {
      authStore.setSession({ token: 't', user: { userID: 1, agentID: 7, userName: 'agent', status: 'Active' } });
      const fixture = render('HAO', {
        campaigns: [{ campaign_name: 'MO_CAMPAIGN' }],
        services: [{ subServiceName: 'Medical Advisory Service' }],
      });
      const component = fixture.componentInstance;
      component.form.controls.transferService.setValue('Medical Advisory Service');
      fixture.detectChanges();
      return { fixture, component };
    }

    function skillField(fixture: { nativeElement: HTMLElement }) {
      const select = fixture.nativeElement.querySelector<HTMLSelectElement>('#hao-cl-skill');
      return {
        select,
        fieldText: select?.parentElement?.textContent ?? '',
        retry: Array.from(fixture.nativeElement.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Retry'),
        ),
      };
    }

    it('shows the Skill field disabled with a loading line while the skills load', () => {
      const { fixture, component } = selectMedicalService();

      expect(component.selectedCampaign()).toBe('MO_CAMPAIGN');
      expect(component.skillsLoading()).toBeTrue();
      expect(component.form.controls.skill.disabled).toBeTrue();
      const pending = skillField(fixture);
      expect(pending.select).not.toBeNull();
      expect(pending.select?.disabled).toBeTrue();
      expect(pending.fieldText).toContain('Loading skills');

      http.expectOne(SKILLS).flush({ data: [{ skillName: 'General' }] });
      fixture.detectChanges();

      expect(component.skillsLoading()).toBeFalse();
      expect(component.form.controls.skill.enabled).toBeTrue();
      const done = skillField(fixture);
      expect(done.select?.disabled).toBeFalse();
      expect(done.select?.options.length).toBe(2);
      expect(done.fieldText).not.toContain('Loading skills');
    });

    it('keeps the Skill field visible with an empty-state line when the campaign has no skills', () => {
      const { fixture, component } = selectMedicalService();

      http.expectOne(SKILLS).flush({ data: [] });
      fixture.detectChanges();

      expect(component.noSkills()).toBeTrue();
      expect(component.skillsError()).toBeNull();
      expect(component.form.controls.skill.enabled).toBeTrue();
      const empty = skillField(fixture);
      expect(empty.select).not.toBeNull();
      expect(empty.select?.options.length).toBe(1);
      expect(empty.fieldText).toContain('No skills configured for this service.');
      expect(empty.retry).toBeUndefined();
    });

    it('shows the empty-state line, not an error, on the backend\'s "No active skill found." envelope', () => {
      const { fixture, component } = selectMedicalService();

      http.expectOne(SKILLS).flush({ statusCode: 5000, errorMessage: 'No active skill found.', status: 'FAILURE' });
      fixture.detectChanges();

      expect(component.noSkills()).toBeTrue();
      expect(component.skillsError()).toBeNull();
      expect(component.skills()).toEqual([]);
      expect(component.form.controls.skill.enabled).toBeTrue();
      const empty = skillField(fixture);
      expect(empty.fieldText).toContain('No skills configured for this service.');
      expect(empty.retry).toBeUndefined();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    });

    it('surfaces a failed skills lookup inline with Retry, and clears it once the retry succeeds', () => {
      const { fixture, component } = selectMedicalService();

      http.expectOne(SKILLS).flush({ statusCode: 5000, errorMessage: 'CTI unavailable' });
      fixture.detectChanges();

      expect(component.skillsError()).toBe('CTI unavailable');
      expect(component.skillsLoading()).toBeFalse();
      expect(component.skills()).toEqual([]);
      expect(component.form.controls.skill.enabled).toBeTrue();
      const failed = skillField(fixture);
      expect(failed.select).not.toBeNull();
      expect(failed.fieldText).toContain('CTI unavailable');
      expect(failed.retry).toBeDefined();

      failed.retry?.click();
      fixture.detectChanges();
      expect(component.skillsLoading()).toBeTrue();
      expect(component.form.controls.skill.disabled).toBeTrue();
      http.expectOne(SKILLS).flush({ data: [{ skillName: 'General' }] });
      fixture.detectChanges();

      expect(component.skillsError()).toBeNull();
      expect(component.skills()).toEqual([{ skillName: 'General' }]);
      expect(component.form.controls.skill.enabled).toBeTrue();
      expect(skillField(fixture).retry).toBeUndefined();
    });

    it('falls back to the translated message when the skills request fails without a backend message', () => {
      const { fixture, component } = selectMedicalService();

      http.expectOne(SKILLS).flush(null, { status: 500, statusText: 'Internal Server Error' });
      fixture.detectChanges();

      expect(component.skillsError()).toBe('Could not load the skills for this service. Please retry.');
    });

    it('clears the skill state and hides the field when the transfer service is cleared mid-load', () => {
      const { fixture, component } = selectMedicalService();

      component.form.controls.transferService.setValue(null);
      fixture.detectChanges();
      http.expectOne(SKILLS).flush({ data: [{ skillName: 'General' }] });
      fixture.detectChanges();

      expect(component.skillsLoading()).toBeFalse();
      expect(component.skills()).toEqual([]);
      expect(component.form.controls.skill.enabled).toBeTrue();
      expect(skillField(fixture).select).toBeNull();
    });
  });

  it('falls back to the translated message when the services request fails without a backend message', () => {
    authStore.setCurrentRole(currentRole('HAO'));
    const fixture = TestBed.createComponent(ClosureStepComponent);
    fixture.detectChanges();
    http.match((req) => req.url.includes('getCallTypesV1')).forEach((req) => req.flush({ data: [] }));
    http.match((req) => req.url.includes('getRegistrationDataV1')).forEach((req) => req.flush({ data: {} }));
    http.match((req) => req.url.includes('getInstituteTypes')).forEach((req) => req.flush({ data: [] }));
    http
      .expectOne((req) => req.url.includes('beneficiary/get/services'))
      .flush(null, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.servicesError()).toBe('Could not load the transfer services. Please retry.');
  });
});
