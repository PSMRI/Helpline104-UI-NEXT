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
import { provideRouter } from '@angular/router';

import { I18nService } from '../core/i18n/i18n.service';
import { AccountRecoveryStore } from './account-recovery.store';
import { SetSecurityQuestionsComponent } from './set-security-questions.component';

describe('SetSecurityQuestionsComponent', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [SetSecurityQuestionsComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AccountRecoveryStore).startSecurityQuestionSetup('someuser', 1);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function render() {
    const fixture = TestBed.createComponent(SetSecurityQuestionsComponent);
    fixture.detectChanges();
    http.expectOne((req) => req.url.includes('user/getsecurityquetions')).flush({ statusCode: 200, data: [] });
    fixture.detectChanges();
    return fixture;
  }

  it('associates every Question/Answer label with its control via for/id', () => {
    const fixture = render();
    const el = fixture.nativeElement as HTMLElement;

    for (const id of ['securityQuestion1', 'securityQuestion2', 'securityQuestion3', 'answer1', 'answer2', 'answer3']) {
      expect(el.querySelector(`label[for="${id}"]`)).withContext(`label[for=${id}]`).not.toBeNull();
      expect(el.querySelector(`#${id}`)).withContext(`#${id}`).not.toBeNull();
    }
  });

  it('renders the heading from a translation key, reactive to a language switch', () => {
    const fixture = render();
    const i18n = TestBed.inject(I18nService);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Set security questions');

    i18n.setLanguage('hi');
    fixture.detectChanges();

    expect(el.textContent).toContain('सुरक्षा प्रश्न सेट करें');
  });

  it('shows a required message under Answer 1 once it is touched and left empty', () => {
    const fixture = render();
    fixture.componentInstance.form.controls.answer1.markAsTouched();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('An answer is required.');
  });

  it('shows a whitespace-only message under Answer 1 when it is spaces only', () => {
    const fixture = render();
    const control = fixture.componentInstance.form.controls.answer1;
    control.setValue('   ');
    control.markAsTouched();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cannot be only spaces.');
  });
});
