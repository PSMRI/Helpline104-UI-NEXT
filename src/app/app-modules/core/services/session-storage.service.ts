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

import { Injectable } from '@angular/core';

/**
 * Thin wrapper over the browser `sessionStorage`.
 *
 * Exposes the same `getItem/setItem/removeItem/clear` surface used by MMU and
 * Common-UI so call sites stay portable. Values are currently stored in plain
 * text — the legacy 104 app also kept the auth token unencrypted.
 *
 * TODO(P1): swap the plain backing for the encrypted Common-UI
 * `SessionStorageService` (or crypto-js with `environment.encKey`) once the
 * Common-UI submodule is wired into this app.
 */
@Injectable({ providedIn: 'root' })
export class SessionStorageService {
  private get store(): Storage | null {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  }

  setItem(key: string, value: string): void {
    this.store?.setItem(key, value);
  }

  getItem(key: string): string | null {
    return this.store?.getItem(key) ?? null;
  }

  removeItem(key: string): void {
    this.store?.removeItem(key);
  }

  clear(): void {
    this.store?.clear();
  }
}
