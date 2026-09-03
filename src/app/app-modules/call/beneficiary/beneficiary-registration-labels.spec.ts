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
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BeneficiaryRegistrationComponent } from './beneficiary-registration.component';

/**
 * The registration form used on essentially every call had 27 z-form-label
 * elements with zero for/id pairing (audit #94, the primary HIGH finding for
 * this file). This pins that every field control a screen reader needs to
 * announce is actually associated with its label, in both the search and the
 * register views.
 *
 * HTTP calls fired by ngOnInit (master data, states, history) are left
 * unflushed deliberately — this spec only asserts static DOM structure, not
 * loaded data, so there's nothing to verify() against.
 */
describe('BeneficiaryRegistrationComponent field labels', () => {
  function render() {
    TestBed.configureTestingModule({
      imports: [BeneficiaryRegistrationComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(BeneficiaryRegistrationComponent);
    fixture.detectChanges();
    return fixture;
  }

  function expectLabeled(el: HTMLElement, ids: string[]) {
    for (const id of ids) {
      expect(el.querySelector(`label[for="${id}"]`)).withContext(`label[for=${id}]`).not.toBeNull();
      expect(el.querySelector(`#${id}`)).withContext(`#${id}`).not.toBeNull();
    }
  }

  it('associates every search-form field with its label', () => {
    const fixture = render();
    fixture.componentInstance.activeView.set('search');
    fixture.detectChanges();

    expectLabeled(fixture.nativeElement, ['search-firstName', 'search-lastName', 'search-benId', 'search-genderID']);
  });

  it('associates every register-form (page 1) identity field with its label', () => {
    const fixture = render();
    fixture.componentInstance.activeView.set('register');
    fixture.detectChanges();

    expectLabeled(fixture.nativeElement, [
      'titleId',
      'firstName',
      'lastName',
      'genderID',
      'dob',
      'age',
      'ageUnit',
      'communityID',
      'maritalStatusID',
      'fatherName',
      'spouseName',
      'educationID',
      'identityType',
      'govtIdentityNo',
    ]);
  });

  it('associates every register-form (page 2) address/contact field with its label', () => {
    const fixture = render();
    const component = fixture.componentInstance;
    component.activeView.set('register');
    fixture.detectChanges();
    component.page.set(2);
    fixture.detectChanges();

    expectLabeled(fixture.nativeElement, [
      'stateID',
      'districtID',
      'subDistrictID',
      'villageID',
      'houseNumber',
      'pincode',
      'alternateNumber1',
    ]);
  });
});
