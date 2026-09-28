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

import { AuthUser, Privilege, Role } from '../core/auth/auth.models';
import { AuthStore } from '../core/auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { CzentrixService } from '../core/services/czentrix.service';
import { SessionStorageService } from '../core/services/session-storage.service';
import { RoleSelectionComponent } from './role-selection.component';

/**
 * This screen's heading and access-denial message were hardcoded English
 * (audit #92/#93 — the component never injected I18nService at all). Its
 * inline Logout button also had the same incomplete-cleanup gap as the
 * dashboard header's (audit #27): only auth keys were cleared, not a full
 * sessionStorage wipe like the forced-logout path does.
 */
describe('RoleSelectionComponent', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [RoleSelectionComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.overrideProvider(CzentrixService, { useValue: { endCtiSession: () => undefined } });
  });

  afterEach(() => sessionStorage.clear());

  function render() {
    const fixture = TestBed.createComponent(RoleSelectionComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the title and access-denial message from translation keys, reactive to a language switch', async () => {
    const fixture = render();
    const i18n = TestBed.inject(I18nService);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Select your role');
    expect(el.textContent).toContain('You are not authorised to access any 104 services.');

    await i18n.setLanguage('hi');
    fixture.detectChanges();

    expect(el.textContent).toContain('अपनी भूमिका चुनें');
    expect(el.textContent).toContain('आपको किसी भी 104 सेवा तक पहुंचने की अनुमति नहीं है।');
  });

  it('logout fully clears sessionStorage, not just auth keys', () => {
    sessionStorage.setItem('someUnrelatedCallStorageKey', 'still-here');

    const fixture = render();
    const authStore = TestBed.inject(AuthStore);
    spyOn(authStore, 'clear');

    fixture.componentInstance.logout();

    expect(authStore.clear).toHaveBeenCalled();
    expect(sessionStorage.getItem('someUnrelatedCallStorageKey')).toBeNull();
  });

  describe('agent id on role selection (legacy service-role-selection)', () => {
    const SERVICE: Privilege = { serviceName: '104', providerServiceMapID: 42 };

    function role(name: string, screenName: string, agentID?: unknown): Role {
      return {
        RoleID: 1,
        RoleName: name,
        agentID: agentID as number | undefined,
        serviceRoleScreenMappings: [{ screen: { screenName } }],
      };
    }

    function signIn(user: Partial<AuthUser>): AuthStore {
      const authStore = TestBed.inject(AuthStore);
      authStore.setSession({
        token: 't',
        user: { userID: 1, agentID: 2145, loginAgentID: 2145, userName: 'multi', status: 'Active', ...user },
      });
      return authStore;
    }

    it("switches to the selected role's own agent id, accepting the string form UAT sends", () => {
      const authStore = signIn({});
      const fixture = render();

      fixture.componentInstance.selectRole(role('MO', 'Medical_Advice', '2545'), SERVICE);

      expect(authStore.user()?.agentID).toBe(2545);
      expect(JSON.parse(TestBed.inject(SessionStorageService).getItem('authUser') ?? '{}').agentID).toBe(2545);
    });

    it('falls back to the login-time agent id when the role carries none', () => {
      const authStore = signIn({});
      const fixture = render();

      fixture.componentInstance.selectRole(role('CO', 'Counselling'), SERVICE);

      expect(authStore.user()?.agentID).toBe(2145);
    });

    it("restores the login-time id on a switch from a role with its own id, not the previous role's", () => {
      const authStore = signIn({});
      const fixture = render();

      fixture.componentInstance.selectRole(role('MO', 'Medical_Advice', 2545), SERVICE);
      fixture.componentInstance.selectRole(role('CO', 'Counselling'), SERVICE);

      expect(authStore.user()?.agentID).toBe(2145);
      expect(authStore.user()?.loginAgentID).toBe(2145);
    });

    it('keeps the stored agent id for a session persisted before loginAgentID existed', () => {
      const authStore = signIn({ agentID: 2508, loginAgentID: undefined });
      const fixture = render();

      fixture.componentInstance.selectRole(role('CO', 'Counselling'), SERVICE);

      expect(authStore.user()?.agentID).toBe(2508);
    });
  });
});
