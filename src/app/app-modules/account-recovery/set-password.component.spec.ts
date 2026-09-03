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

import { I18nService } from '../core/i18n/i18n.service';
import { AccountRecoveryStore } from './account-recovery.store';
import { SetPasswordComponent } from './set-password.component';

/**
 * This screen (and the rest of the account-recovery module) was entirely
 * hardcoded English with no label/input association (audit #92/#94) — this
 * pins that the heading is translation-reactive and the password fields are
 * properly labeled.
 */
describe('SetPasswordComponent', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [SetPasswordComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const store = TestBed.inject(AccountRecoveryStore);
    store.startReset('someuser');
    store.setTransactionId('tx-1');
  });

  afterEach(() => sessionStorage.clear());

  function render() {
    const fixture = TestBed.createComponent(SetPasswordComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('associates the New Password and Confirm Password labels with their inputs via for/id', () => {
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('label[for="newPassword"]')).not.toBeNull();
    expect(el.querySelector('#newPassword')).not.toBeNull();
    expect(el.querySelector('label[for="confirmPassword"]')).not.toBeNull();
    expect(el.querySelector('#confirmPassword')).not.toBeNull();
  });

  it('renders the heading from a translation key, reactive to a language switch', () => {
    const fixture = render();
    const i18n = TestBed.inject(I18nService);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Set a new password');

    i18n.setLanguage('hi');
    fixture.detectChanges();

    expect(el.textContent).toContain('नया पासवर्ड सेट करें');
  });
});
