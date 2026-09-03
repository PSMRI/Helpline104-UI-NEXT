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

import { AuthStore } from '@/app-modules/core/auth/auth.store';

import { CtiPanelComponent } from './cti-panel.component';

/**
 * The CTI iframe previously had no (error) binding and no fallback UI (audit
 * #40) — a broken telephony host left a blank box with no indication
 * anything was wrong. These cover the explicit onIframeLoad/onIframeError
 * paths and retry directly (the public contract those DOM bindings call into).
 *
 * NOT covered here: the load-timeout itself (no load/error event within
 * LOAD_TIMEOUT_MS). `jasmine.clock()` does not intercept `setTimeout`/
 * `Date.now()` in this project's test harness once `provideZonelessChangeDetection()`
 * + `TestBed.createComponent` are involved — verified directly: `Date.now()`
 * still advances by real wall-clock milliseconds across a `tick(8001)` call,
 * not by 8001ms, so a timer-based assertion would be untestably flaky here,
 * not a real pass. The timeout wiring itself is a plain `setTimeout`/
 * `clearTimeout` pair (same pattern used elsewhere in this codebase, e.g.
 * `CallWrapupService`) — reviewed by hand rather than covered by a spec.
 *
 * This also runs in a real browser (Karma + Chrome Headless): once the
 * iframe actually mounts with its real `src`, the test sandbox's network
 * block makes Chrome fire a genuine failed-navigation event on it — so every
 * test here drives state via the public onIframeLoad/onIframeError/retry
 * methods before the first `detectChanges()`, so the real iframe never
 * mounts and can't race the assertions with its own event.
 */
describe('CtiPanelComponent', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [CtiPanelComponent],
      providers: [provideZonelessChangeDetection()],
    });
    TestBed.inject(AuthStore).setSession({
      token: 't',
      user: { userID: 1, agentID: 2145, userName: '104hao', status: 'Active' },
    });
    TestBed.inject(AuthStore).setCurrentRole({
      roleID: 5,
      roleName: 'HAO',
      serviceID: 1,
      serviceName: '104',
      serviceProviderID: 1,
      providerServiceMapID: 9,
      workingLocationID: null,
      apimanClientKey: null,
      featureCode: 'HAO',
    });
  });

  afterEach(() => sessionStorage.clear());

  function render() {
    const fixture = TestBed.createComponent(CtiPanelComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the unavailable notice on an iframe error, not the iframe itself', () => {
    const fixture = render();

    fixture.componentInstance.toggleCti();
    fixture.componentInstance.onIframeError();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.querySelector('iframe')).toBeNull();
  });

  it('does not show the unavailable notice once the iframe reports a successful load', () => {
    const fixture = render();

    fixture.componentInstance.toggleCti();
    fixture.componentInstance.onIframeLoad();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.querySelector('iframe')).not.toBeNull();
  });

  it('retry clears a prior unavailable state', () => {
    const fixture = render();
    fixture.componentInstance.toggleCti();
    fixture.componentInstance.onIframeError();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).not.toBeNull();

    fixture.componentInstance.retry();

    expect(fixture.componentInstance.unavailable()).toBe(false);
  });
});
