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

import { NEVER } from 'rxjs';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { CallStore } from '../call.store';
import { CoWorkspaceComponent } from './co-workspace.component';

describe('CoWorkspaceComponent consent', () => {
  let callStore: CallStore;
  let confirm: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CoWorkspaceComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    callStore = TestBed.inject(CallStore);
    confirm = spyOn(TestBed.inject(ConfirmDialogService), 'confirm').and.returnValue(NEVER);
    callStore.startCall({ cli: '9876543210', sessionId: 'session-1' });
  });

  afterEach(() => sessionStorage.clear());

  function consentPrompts(): number {
    return confirm.calls.allArgs().filter(([options]) => options.title === 'Beneficiary Consent').length;
  }

  function render() {
    const fixture = TestBed.createComponent(CoWorkspaceComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('does not ask for consent while the transferred beneficiary is still being looked up', () => {
    callStore.setBeneficiaryPending(true);

    render();

    expect(consentPrompts()).toBe(0);
  });

  it('asks once, as soon as the lookup resolves a beneficiary', () => {
    callStore.setBeneficiaryPending(true);
    const fixture = render();

    callStore.setBeneficiaryId(5006622, 41);
    callStore.setBeneficiaryPending(false);
    fixture.detectChanges();

    expect(consentPrompts()).toBe(1);
  });

  it('never asks when the lookup settles without a beneficiary, so nothing is left over registration', () => {
    callStore.setBeneficiaryPending(true);
    const fixture = render();

    callStore.setBeneficiaryPending(false);
    fixture.detectChanges();

    expect(consentPrompts()).toBe(0);
  });

  it('asks exactly once across a transfer that detours through registration', () => {
    callStore.setBeneficiaryPending(true);
    const pendingLanding = render();
    callStore.setBeneficiaryPending(false);
    pendingLanding.detectChanges();
    pendingLanding.destroy();

    callStore.setBeneficiaryId(5006622, 41);
    render();

    expect(consentPrompts()).toBe(1);
  });

  it('asks once on landing with an identified beneficiary, and not again as call state changes', () => {
    callStore.setBeneficiaryId(5006622, 41);
    const fixture = render();

    expect(consentPrompts()).toBe(1);

    callStore.setCallId('14311862');
    callStore.setBeneficiaryId(5006623, 41);
    fixture.detectChanges();

    expect(consentPrompts()).toBe(1);
  });
});
