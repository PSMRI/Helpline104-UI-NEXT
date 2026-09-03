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

import { CallUnloadWarningService } from './call-unload-warning.service';
import { CallStore } from './call.store';

/**
 * A genuine `window.dispatchEvent(new Event('beforeunload'))` is caught by
 * Karma's own reload watchdog ("Some of your tests did a full page reload!")
 * even though nothing actually navigates — so this captures the listener
 * `addEventListener` registers and invokes it directly with a fake event,
 * never touching the real `window` event system.
 */
describe('CallUnloadWarningService', () => {
  let callStore: CallStore;
  let handler: (event: BeforeUnloadEvent) => void;

  beforeEach(() => {
    sessionStorage.clear();
    spyOn(window, 'addEventListener').and.callFake((type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'beforeunload') {
        handler = listener as (event: BeforeUnloadEvent) => void;
      }
    });

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    callStore = TestBed.inject(CallStore);
    TestBed.inject(CallUnloadWarningService);
  });

  afterEach(() => sessionStorage.clear());

  function fakeEvent(): jasmine.SpyObj<BeforeUnloadEvent> {
    return jasmine.createSpyObj<BeforeUnloadEvent>('BeforeUnloadEvent', ['preventDefault'], { returnValue: '' });
  }

  it('warns before unload while a call is active', () => {
    callStore.startCall({ cli: '9876543210', sessionId: 'session-1' });

    const event = fakeEvent();
    handler(event);

    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('does not warn when no call is active', () => {
    const event = fakeEvent();
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('stops warning once the call has ended', () => {
    callStore.startCall({ cli: '9876543210', sessionId: 'session-1' });
    callStore.endCall();

    const event = fakeEvent();
    handler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
