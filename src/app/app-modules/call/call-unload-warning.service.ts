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

import { DestroyRef, Injectable, inject } from '@angular/core';

import { CallStore } from './call.store';

/**
 * Warns before an agent closes or reloads the tab mid-call. `sessionStorage`
 * already lets the call and any in-progress registration survive a refresh
 * (see {@link CallStore}), but there was previously no warning at all for a
 * tab close/reload, and refreshing still drops any in-flight form input that
 * hadn't reached a signal yet.
 *
 * Every browser replaces the returned string with its own generic prompt
 * (e.g. "Leave site? Changes you made may not be saved") — `beforeunload`
 * has not allowed a custom message for years — but both `preventDefault()`
 * and setting `returnValue` are still required to trigger that native
 * confirmation at all.
 */
@Injectable({ providedIn: 'root' })
export class CallUnloadWarningService {
  private readonly callStore = inject(CallStore);

  constructor() {
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (!this.callStore.onCall()) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('beforeunload', onBeforeUnload));
  }
}
