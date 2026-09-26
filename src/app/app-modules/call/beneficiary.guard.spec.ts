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
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { beneficiaryGuard } from './beneficiary.guard';
import { CallStore } from './call.store';

describe('beneficiaryGuard', () => {
  let callStore: CallStore;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] });
    callStore = TestBed.inject(CallStore);
    router = TestBed.inject(Router);
  });

  afterEach(() => sessionStorage.clear());

  function activate(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() =>
      beneficiaryGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }

  it('bounces a workspace with no beneficiary to registration', () => {
    callStore.startCall({ cli: '9034862882', sessionId: 's-1' });

    expect(router.serializeUrl(activate() as UrlTree)).toBe('/innerpage/registration');
  });

  it('admits a workspace once the beneficiary is set', () => {
    callStore.startCall({ cli: '9034862882', sessionId: 's-1' });
    callStore.setBeneficiaryId(555);

    expect(activate()).toBeTrue();
  });

  it('admits a workspace while the transferred-call beneficiary lookup is still pending', () => {
    callStore.startCall({ cli: '9034862882', sessionId: 's-1' });
    callStore.setBeneficiaryPending(true);

    expect(activate()).toBeTrue();

    callStore.setBeneficiaryPending(false);
    expect(activate()).toBeInstanceOf(UrlTree);
  });

  it('clears the pending flag once a beneficiary is set, and on a new call', () => {
    callStore.startCall({ cli: '9034862882', sessionId: 's-1' });
    callStore.setBeneficiaryPending(true);
    callStore.setBeneficiaryId(555);
    expect(callStore.beneficiaryPending()).toBeFalse();

    callStore.setBeneficiaryPending(true);
    callStore.startCall({ cli: '9034862882', sessionId: 's-2' });
    expect(callStore.beneficiaryPending()).toBeFalse();
  });
});
