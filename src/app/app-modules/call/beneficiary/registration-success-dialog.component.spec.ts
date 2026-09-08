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

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Z_MODAL_DATA, ZardDialogRef } from '@common-ui/ui/dialog';

import {
  RegistrationSuccessDialogComponent,
  RegistrationSuccessDialogResult,
} from './registration-success-dialog.component';

describe('RegistrationSuccessDialogComponent', () => {
  let closeSpy: jasmine.Spy;

  function render() {
    closeSpy = jasmine.createSpy('close');
    TestBed.configureTestingModule({
      imports: [RegistrationSuccessDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Z_MODAL_DATA, useValue: { registrationId: '364107678949' } },
        { provide: ZardDialogRef, useValue: { close: closeSpy } },
      ],
    });
    const fixture = TestBed.createComponent(RegistrationSuccessDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  function lastResult(): RegistrationSuccessDialogResult {
    return closeSpy.calls.mostRecent().args[0] as RegistrationSuccessDialogResult;
  }

  it('shows the generated registration id', () => {
    const fixture = render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('364107678949');
  });

  it('Close skips SMS entirely, regardless of the alternate-number field', () => {
    const fixture = render();
    fixture.componentInstance.close();
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(lastResult()).toEqual({ sendSms: false });
  });

  it('Send SMS with the alternate-number checkbox off closes with no alternate number', () => {
    const fixture = render();
    fixture.componentInstance.sendSms();
    expect(lastResult()).toEqual({ sendSms: true, alternateNumber: null });
  });

  it('Send SMS is blocked while the alternate number is checked but invalid', () => {
    const fixture = render();
    fixture.componentInstance.toggleAlternate();
    fixture.componentInstance.alternateNumber.setValue('123');
    fixture.componentInstance.sendSms();
    expect(closeSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.alternateNumber.touched).toBeTrue();
  });

  it('Send SMS with a valid alternate number closes with that number', () => {
    const fixture = render();
    fixture.componentInstance.toggleAlternate();
    fixture.componentInstance.alternateNumber.setValue('9876543210');
    fixture.componentInstance.sendSms();
    expect(lastResult()).toEqual({ sendSms: true, alternateNumber: '9876543210' });
  });

  it('unchecking the alternate-number checkbox clears the field', () => {
    const fixture = render();
    fixture.componentInstance.toggleAlternate();
    fixture.componentInstance.alternateNumber.setValue('9876543210');
    fixture.componentInstance.toggleAlternate();
    expect(fixture.componentInstance.showAlternate()).toBeFalse();
    expect(fixture.componentInstance.alternateNumber.value).toBe('');
  });
});
