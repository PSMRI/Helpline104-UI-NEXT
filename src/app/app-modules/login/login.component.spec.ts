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
import { LoginComponent } from './login.component';

/**
 * The login screen was entirely hardcoded English (audit #92/#94) — this
 * pins that the title/labels/validation messages now come from translation
 * keys (reactive to a language switch) and that the User Name/Password
 * inputs are properly associated with their labels for screen readers.
 */
describe('LoginComponent', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => sessionStorage.clear());

  function render() {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('associates the User Name and Password labels with their inputs via for/id', () => {
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;

    const userLabel = el.querySelector('label[for="userID"]');
    const passwordLabel = el.querySelector('label[for="password"]');
    expect(userLabel).not.toBeNull();
    expect(passwordLabel).not.toBeNull();
    expect(el.querySelector('#userID')).not.toBeNull();
    expect(el.querySelector('#password')).not.toBeNull();
  });

  it('renders the title and submit button from translation keys, reactive to a language switch', () => {
    const fixture = render();
    const i18n = TestBed.inject(I18nService);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('AMRIT 104 Helpline');
    expect(el.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Login');

    i18n.setLanguage('hi');
    fixture.detectChanges();

    expect(el.textContent).toContain('AMRIT 104 हेल्पलाइन');
    expect(el.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('लॉगिन');
  });

  it('shows the translated required message once a field is touched and left empty', () => {
    const fixture = render();
    const component = fixture.componentInstance;

    component.form.controls.userID.markAsTouched();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('User name is required.');
  });
});
