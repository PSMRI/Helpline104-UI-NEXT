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

import { AuthStore } from '../../core/auth/auth.store';
import { CurrentRole } from '../../core/auth/auth.models';
import { CallStore } from '../call.store';
import { ScheduleAppointmentComponent } from './schedule-appointment.component';

const FACILITIES = (req: { url: string }) => req.url.includes('uptsu/get/facilityMaster');

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

describe('ScheduleAppointmentComponent', () => {
  let authStore: AuthStore;
  let callStore: CallStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ScheduleAppointmentComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    authStore = TestBed.inject(AuthStore);
    callStore = TestBed.inject(CallStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    callStore.setBeneficiaryId(null, null);
    sessionStorage.clear();
  });

  /** Render with one block loaded and that block selected, leaving the facility lookup pending. */
  function selectBlock() {
    authStore.setCurrentRole(currentRole('HAO'));
    callStore.setBeneficiaryId(123, 5);
    const fixture = TestBed.createComponent(ScheduleAppointmentComponent);
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.includes('location/taluks/5'))
      .flush({ data: [{ blockID: 1, blockName: 'Block A' }] });
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.form.controls.subDistrict.setValue('Block A');
    component.onBlockChange();
    fixture.detectChanges();
    return { fixture, component };
  }

  function facilityField(fixture: ComponentFixture<ScheduleAppointmentComponent>) {
    const root: HTMLElement = fixture.nativeElement;
    const select = root.querySelector<HTMLSelectElement>('#appt-facility');
    return {
      select,
      fieldText: select?.parentElement?.textContent ?? '',
      retry: Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes('Retry')),
    };
  }

  it('disables the facility select and shows a loading line while the facility lookup is in flight', () => {
    const { fixture, component } = selectBlock();

    expect(component.facilitiesLoading()).toBeTrue();
    expect(component.form.controls.facilityName.disabled).toBeTrue();
    expect(component.canSubmit()).toBeFalse();
    const pending = facilityField(fixture);
    expect(pending.select?.disabled).toBeTrue();
    expect(pending.select?.getAttribute('aria-busy')).toBe('true');
    expect(pending.fieldText).toContain('Loading facilities');
    expect(pending.retry).toBeUndefined();

    http.expectOne(FACILITIES).flush({ data: [{ facilityName: 'PHC One', facilityCode: 'P1' }] });
    fixture.detectChanges();

    expect(component.facilitiesLoading()).toBeFalse();
    expect(component.noFacilities()).toBeFalse();
    expect(component.form.controls.facilityName.enabled).toBeTrue();
    const done = facilityField(fixture);
    expect(done.select?.disabled).toBeFalse();
    expect(done.select?.options.length).toBe(2);
    expect(done.fieldText).not.toContain('Loading facilities');
  });

  it('reports a block with no facilities as an explicit empty state, not an error', () => {
    const { fixture, component } = selectBlock();

    http.expectOne(FACILITIES).flush({ data: [] });
    fixture.detectChanges();

    expect(component.noFacilities()).toBeTrue();
    expect(component.facilitiesError()).toBeNull();
    expect(component.facilitiesLoading()).toBeFalse();
    expect(component.errorMessage()).toBe('');
    const empty = facilityField(fixture);
    expect(empty.select?.disabled).toBeFalse();
    expect(empty.select?.options.length).toBe(1);
    expect(empty.fieldText).toContain('No facilities found for this block.');
    expect(empty.retry).toBeUndefined();
  });

  it('surfaces a failed facility lookup under the field with Retry, and clears it once the retry succeeds', () => {
    const { fixture, component } = selectBlock();

    http.expectOne(FACILITIES).flush({ statusCode: 5000, errorMessage: 'Facility master unavailable' });
    fixture.detectChanges();

    expect(component.facilitiesError()).toBe('Facility master unavailable');
    expect(component.facilitiesLoading()).toBeFalse();
    expect(component.noFacilities()).toBeFalse();
    expect(component.errorMessage()).toBe('');
    expect(component.form.controls.facilityName.enabled).toBeTrue();
    const failed = facilityField(fixture);
    expect(failed.fieldText).toContain('Facility master unavailable');
    expect(failed.retry).toBeDefined();

    failed.retry?.click();
    fixture.detectChanges();
    expect(component.facilitiesLoading()).toBeTrue();
    expect(component.form.controls.facilityName.disabled).toBeTrue();
    http.expectOne(FACILITIES).flush({ data: [{ facilityName: 'PHC One', facilityCode: 'P1' }] });
    fixture.detectChanges();

    expect(component.facilitiesError()).toBeNull();
    expect(component.facilities()).toEqual([{ facilityName: 'PHC One', facilityCode: 'P1' }]);
    expect(component.form.controls.facilityName.enabled).toBeTrue();
    expect(facilityField(fixture).retry).toBeUndefined();
  });

  it('shows the normalised service message when the facility request fails without a backend message', () => {
    const { fixture, component } = selectBlock();

    http.expectOne(FACILITIES).flush(null, { status: 500, statusText: 'Internal Server Error' });
    fixture.detectChanges();

    expect(component.facilitiesError()).toBe('Internal issue, please try again later.');
    expect(facilityField(fixture).retry).toBeDefined();
  });

  it('ignores a facility response for a block the agent has since moved away from', () => {
    const { fixture, component } = selectBlock();

    component.form.controls.subDistrict.setValue(null);
    component.onBlockChange();
    fixture.detectChanges();
    expect(component.facilitiesLoading()).toBeFalse();
    expect(component.form.controls.facilityName.enabled).toBeTrue();

    http.expectOne(FACILITIES).flush({ data: [{ facilityName: 'PHC One', facilityCode: 'P1' }] });
    fixture.detectChanges();

    expect(component.facilities()).toEqual([]);
    expect(component.facilitiesLoading()).toBeFalse();
  });
});
