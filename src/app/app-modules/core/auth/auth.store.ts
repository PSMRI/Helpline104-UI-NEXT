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

import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStorageService } from '../services/session-storage.service';
import {
  AUTH_STORAGE_KEYS,
  AuthUser,
  CurrentRole,
  Privilege,
} from './auth.models';

/**
 * Signal-based store for the authenticated session: token, user, current role
 * and privileges. Replaces the legacy `AuthService` token helpers.
 *
 * The token and APIMAN key are persisted to (and rehydrated from) storage so
 * they survive a page reload — the HTTP interceptors read the token from here.
 * User/role/privileges live in memory and are repopulated on login.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly storage = inject(SessionStorageService);

  private readonly _token = signal<string | null>(
    this.storage.getItem(AUTH_STORAGE_KEYS.token),
  );
  private readonly _apimanKey = signal<string | null>(
    this.storage.getItem(AUTH_STORAGE_KEYS.apimanKey),
  );
  private readonly _user = signal<AuthUser | null>(null);
  private readonly _currentRole = signal<CurrentRole | null>(null);
  private readonly _privileges = signal<Privilege[]>([]);

  /** Raw auth token sent as the `Authorization` header (no `Bearer` prefix). */
  readonly token = this._token.asReadonly();
  /** APIMAN gateway key appended as `?apikey=` when enabled. */
  readonly apimanKey = this._apimanKey.asReadonly();
  readonly user = this._user.asReadonly();
  readonly currentRole = this._currentRole.asReadonly();
  readonly privileges = this._privileges.asReadonly();

  /** True once a token is present. */
  readonly isAuthenticated = computed(() => !!this._token());

  /**
   * Establish the session from a successful login.
   * `token` is the login response `key`.
   */
  setSession(params: {
    token: string;
    user: AuthUser;
    privileges?: Privilege[];
  }): void {
    this._token.set(params.token);
    this._user.set(params.user);
    this._privileges.set(params.privileges ?? []);

    this.storage.setItem(AUTH_STORAGE_KEYS.token, params.token);
  }

  /** Record the service/role the agent selected; persists the APIMAN key. */
  setCurrentRole(role: CurrentRole): void {
    this._currentRole.set(role);
    if (role.apimanClientKey) {
      this._apimanKey.set(role.apimanClientKey);
      this.storage.setItem(AUTH_STORAGE_KEYS.apimanKey, role.apimanClientKey);
    }
  }

  /** Clear the session (in-memory signals + this store's persisted keys). */
  clear(): void {
    this._token.set(null);
    this._apimanKey.set(null);
    this._user.set(null);
    this._currentRole.set(null);
    this._privileges.set([]);

    this.storage.removeItem(AUTH_STORAGE_KEYS.token);
    this.storage.removeItem(AUTH_STORAGE_KEYS.apimanKey);
  }
}
