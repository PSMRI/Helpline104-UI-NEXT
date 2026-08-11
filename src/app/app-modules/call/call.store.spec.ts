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

import { SessionStorageService } from '../core/services/session-storage.service';
import { CallStore } from './call.store';

/**
 * Rehydration contract for the persisted call state.
 *
 * The beneficiary is persisted so a mid-call reload keeps its patient context, so
 * these specs cover both directions: a real beneficiary must come back intact,
 * and a corrupt key must restore as absent — `beneficiaryGuard` only tests for
 * non-null, so a bogus id would admit a workspace with no valid patient behind it.
 */
describe('CallStore beneficiary persistence', () => {
  /** Build a store that reads whatever is currently in sessionStorage. */
  function freshStore(): CallStore {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    return TestBed.inject(CallStore);
  }

  /** Write through the real service so values are stored exactly as the app stores them. */
  function persist(key: string, value: string): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    TestBed.inject(SessionStorageService).setItem(key, value);
  }

  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('restores a beneficiary, district and demographics across a reload', () => {
    const seeding = freshStore();
    seeding.startCall({ cli: '9876543210', sessionId: '1786467593314' });
    seeding.setBeneficiaryId(5006622, 54);
    seeding.setDemographics({ firstName: 'Test', lastName: null, age: 36, genderId: 1, genderName: 'Male' });

    const reloaded = freshStore();

    expect(reloaded.onCall()).toBeTrue();
    expect(reloaded.beneficiaryId()).toBe(5006622);
    expect(reloaded.districtID()).toBe(54);
    expect(reloaded.demographics()).toEqual({
      firstName: 'Test',
      lastName: null,
      age: 36,
      genderId: 1,
      genderName: 'Male',
    });
  });

  it('clears the persisted beneficiary when it is released ("Back to RO")', () => {
    const seeding = freshStore();
    seeding.startCall({ cli: '9876543210', sessionId: '1' });
    seeding.setBeneficiaryId(5006622, 54);
    seeding.setBeneficiaryId(null);

    const reloaded = freshStore();

    expect(reloaded.beneficiaryId()).toBeNull();
    expect(reloaded.districtID()).toBeNull();
    expect(reloaded.demographics()).toBeNull();
  });

  it("does not let a new caller inherit the previous call's beneficiary", () => {
    const first = freshStore();
    first.startCall({ cli: '9876543210', sessionId: '1' });
    first.setBeneficiaryId(5006622, 54);

    // A second inbound call arrives without an intervening endCall().
    first.startCall({ cli: '9998887777', sessionId: '2' });

    const reloaded = freshStore();

    expect(reloaded.cli()).toBe('9998887777');
    expect(reloaded.beneficiaryId()).toBeNull();
    expect(reloaded.demographics()).toBeNull();
  });

  it('drops every persisted key on endCall', () => {
    const seeding = freshStore();
    seeding.startCall({ cli: '9876543210', sessionId: '1' });
    seeding.setBeneficiaryId(5006622, 54);
    seeding.endCall();

    const reloaded = freshStore();

    expect(reloaded.onCall()).toBeFalse();
    expect(reloaded.beneficiaryId()).toBeNull();
  });

  describe('rejects a corrupt persisted id rather than admitting a bogus patient', () => {
    for (const invalid of ['-1', '0', '1.5', 'abc', '', ' ', '9007199254740993']) {
      it(`ignores beneficiaryId "${invalid}"`, () => {
        persist('callBeneficiaryId', invalid);
        expect(freshStore().beneficiaryId()).toBeNull();
      });
    }
  });

  describe('re-validates every restored demographic field', () => {
    it('discards wrong-typed names and out-of-contract numbers', () => {
      persist(
        'callDemographics',
        JSON.stringify({ firstName: 42, lastName: {}, age: -3, genderId: 0, genderName: [] }),
      );

      expect(freshStore().demographics()).toEqual({
        firstName: null,
        lastName: null,
        age: null,
        genderId: null,
        genderName: null,
      });
    });

    it('keeps age 0 — an infant registered in months reports 0 years', () => {
      persist('callDemographics', JSON.stringify({ age: 0 }));
      expect(freshStore().demographics()?.age).toBe(0);
    });

    it('discards a fractional age', () => {
      persist('callDemographics', JSON.stringify({ age: 1.5 }));
      expect(freshStore().demographics()?.age).toBeNull();
    });

    it('survives a malformed payload without throwing during bootstrap', () => {
      persist('callDemographics', '{not json');
      expect(() => freshStore()).not.toThrow();
      expect(freshStore().demographics()).toBeNull();
    });
  });
});
