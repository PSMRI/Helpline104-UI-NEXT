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
import { CALL_STORAGE_KEYS, CallStore } from './call.store';

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

  const demographicsOf = (firstName: string): Parameters<CallStore['setDemographics']>[0] => ({
    firstName,
    lastName: null,
    age: 36,
    genderId: 1,
    genderName: 'Male',
  });

  it('clears the persisted beneficiary when it is released ("Back to RO")', () => {
    const seeding = freshStore();
    seeding.startCall({ cli: '9876543210', sessionId: '1' });
    seeding.setBeneficiaryId(5006622, 54);
    seeding.setDemographics(demographicsOf('Test'));
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
    first.setDemographics(demographicsOf('Test'));

    // A second inbound call arrives without an intervening endCall().
    first.startCall({ cli: '9998887777', sessionId: '2' });

    const reloaded = freshStore();

    expect(reloaded.cli()).toBe('9998887777');
    expect(reloaded.beneficiaryId()).toBeNull();
    expect(reloaded.districtID()).toBeNull();
    expect(reloaded.demographics()).toBeNull();
  });

  it('drops every persisted key on endCall', () => {
    const seeding = freshStore();
    seeding.startCall({ cli: '9876543210', sessionId: '1' });
    seeding.setCallId('4242');
    seeding.setBeneficiaryId(5006622, 54);
    seeding.setDemographics(demographicsOf('Test'));

    // Every key the store owns is populated before the call ends, so the
    // assertion below cannot pass simply because a key was never written.
    for (const key of Object.values(CALL_STORAGE_KEYS)) {
      expect(sessionStorage.getItem(key)).withContext(`seeded ${key}`).not.toBeNull();
    }

    seeding.endCall();

    // Asserting over the key map rather than a hand-listed subset: a key added
    // to the store but not cleared here fails this test instead of slipping
    // through and leaking one call's context into the next.
    for (const key of Object.values(CALL_STORAGE_KEYS)) {
      expect(sessionStorage.getItem(key)).withContext(`cleared ${key}`).toBeNull();
    }

    const reloaded = freshStore();

    expect(reloaded.onCall()).toBeFalse();
    expect(reloaded.cli()).toBeNull();
    expect(reloaded.beneficiaryId()).toBeNull();
    expect(reloaded.districtID()).toBeNull();
    expect(reloaded.demographics()).toBeNull();
  });

  describe('keeps demographics coupled to the beneficiary they belong to', () => {
    it("drops the previous patient's demographics when the beneficiary changes", () => {
      const store = freshStore();
      store.startCall({ cli: '9876543210', sessionId: '1' });
      store.setBeneficiaryId(5006622, 54);
      store.setDemographics(demographicsOf('Patient A'));

      // Re-identified as someone else — e.g. the caller was passed to a relative.
      store.setBeneficiaryId(433069, 12);

      expect(store.demographics()).toBeNull();
      expect(freshStore().demographics()).toBeNull();
    });

    it('keeps demographics when the same beneficiary is re-set', () => {
      const store = freshStore();
      store.startCall({ cli: '9876543210', sessionId: '1' });
      store.setBeneficiaryId(5006622, 54);
      store.setDemographics(demographicsOf('Patient A'));

      store.setBeneficiaryId(5006622, 54);

      expect(store.demographics()?.firstName).toBe('Patient A');
    });

    it('does not restore demographics or district when the beneficiary id is missing', () => {
      persist('callDemographics', JSON.stringify(demographicsOf('Orphan')));
      persist('callDistrictId', '54');

      const store = freshStore();

      expect(store.beneficiaryId()).toBeNull();
      expect(store.districtID()).toBeNull();
      expect(store.demographics()).toBeNull();
    });

    it('does not restore demographics when the beneficiary id is corrupt', () => {
      persist('callBeneficiaryId', '-1');
      persist('callDemographics', JSON.stringify(demographicsOf('Orphan')));

      expect(freshStore().demographics()).toBeNull();
    });

    it('purges the orphaned keys so a later reload cannot resurrect them', () => {
      persist('callDemographics', JSON.stringify(demographicsOf('Orphan')));
      persist('callDistrictId', '54');

      // First construction finds no beneficiary and clears the orphans...
      freshStore();
      // ...so even a beneficiary appearing afterwards gets no inherited details.
      persist('callBeneficiaryId', '5006622');
      const reloaded = freshStore();

      expect(reloaded.beneficiaryId()).toBe(5006622);
      expect(reloaded.districtID()).toBeNull();
      expect(reloaded.demographics()).toBeNull();
    });
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
    /**
     * Seed demographics against a valid owner. Demographics are beneficiary-scoped,
     * so without a restorable beneficiary id they are dropped wholesale — which
     * would exercise that coupling rule instead of the per-field validation here.
     */
    function persistDemographics(payload: string): void {
      persist('callBeneficiaryId', '5006622');
      persist('callDemographics', payload);
    }

    it('discards wrong-typed names and out-of-contract numbers', () => {
      persistDemographics(JSON.stringify({ firstName: 42, lastName: {}, age: -3, genderId: 0, genderName: [] }));

      expect(freshStore().demographics()).toEqual({
        firstName: null,
        lastName: null,
        age: null,
        genderId: null,
        genderName: null,
      });
    });

    it('keeps age 0 — an infant registered in months reports 0 years', () => {
      persistDemographics(JSON.stringify({ age: 0 }));
      expect(freshStore().demographics()?.age).toBe(0);
    });

    it('discards a fractional age', () => {
      persistDemographics(JSON.stringify({ age: 1.5 }));
      expect(freshStore().demographics()?.age).toBeNull();
    });

    it('survives a malformed payload without throwing during bootstrap', () => {
      persistDemographics('{not json');
      expect(() => freshStore()).not.toThrow();
      expect(freshStore().demographics()).toBeNull();
    });

    // `typeof [] === 'object'`, so an array would slip past a bare object check
    // and restore as a record with every field null — "identified, details
    // unknown" rather than the absent context a corrupt key really means.
    for (const payload of ['[]', '["Test",36]']) {
      it(`discards the array payload ${payload} instead of restoring empty demographics`, () => {
        persistDemographics(payload);
        expect(freshStore().demographics()).toBeNull();
      });
    }
  });

  describe('validates ids handed in at runtime, not just rehydrated ones', () => {
    // beneficiaryGuard admits any non-null beneficiaryId, so an unusable value
    // reaching the signal would open a workspace with no patient behind it for
    // the rest of the session — the reload path already rejects these.
    for (const invalid of [Number.NaN, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 2]) {
      it(`treats beneficiaryId ${invalid} as no beneficiary`, () => {
        const store = freshStore();
        store.startCall({ cli: '9876543210', sessionId: '1' });
        store.setBeneficiaryId(invalid, 54);

        expect(store.beneficiaryId()).toBeNull();
        expect(store.districtID()).toBeNull();
        expect(sessionStorage.getItem(CALL_STORAGE_KEYS.beneficiaryId)).toBeNull();
      });
    }

    it('drops the demographics of the patient it replaces when the new id is invalid', () => {
      const store = freshStore();
      store.startCall({ cli: '9876543210', sessionId: '1' });
      store.setBeneficiaryId(5006622, 54);
      store.setDemographics(demographicsOf('Patient A'));

      store.setBeneficiaryId(Number.NaN);

      expect(store.demographics()).toBeNull();
      expect(freshStore().demographics()).toBeNull();
    });

    it('keeps a valid beneficiary while discarding an unusable district', () => {
      const store = freshStore();
      store.startCall({ cli: '9876543210', sessionId: '1' });
      store.setBeneficiaryId(5006622, -1);

      expect(store.beneficiaryId()).toBe(5006622);
      expect(store.districtID()).toBeNull();
      expect(sessionStorage.getItem(CALL_STORAGE_KEYS.districtId)).toBeNull();
    });
  });
});
