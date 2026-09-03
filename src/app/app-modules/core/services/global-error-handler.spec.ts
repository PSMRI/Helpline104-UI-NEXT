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

import { toast } from 'ngx-sonner';

import { I18nService } from '../i18n/i18n.service';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), GlobalErrorHandler] });
    handler = TestBed.inject(GlobalErrorHandler);
  });

  afterEach(() => sessionStorage.clear());

  it('logs the error and shows a translated toast', () => {
    const consoleSpy = spyOn(console, 'error');
    const toastSpy = spyOn(toast, 'error');

    handler.handleError(new Error('boom'));

    expect(consoleSpy).toHaveBeenCalledWith('Unhandled application error:', jasmine.any(Error));
    expect(toastSpy).toHaveBeenCalledWith('Something went wrong. Please refresh the page and try again.');
  });

  it('never throws, even if the toast itself fails', () => {
    spyOn(console, 'error');
    spyOn(toast, 'error').and.throwError('toast is broken too');

    expect(() => handler.handleError(new Error('boom'))).not.toThrow();
  });

  it('reads the toast message in the currently active language', () => {
    spyOn(console, 'error');
    const toastSpy = spyOn(toast, 'error');
    TestBed.inject(I18nService).setLanguage('hi');

    handler.handleError(new Error('boom'));

    expect(toastSpy).toHaveBeenCalledWith('कुछ गलत हो गया। कृपया पृष्ठ को रीफ़्रेश करें और पुनः प्रयास करें।');
  });
});
