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

import { Injectable, signal } from '@angular/core';

/**
 * Global loading indicator state, driven by the loader HTTP interceptor.
 *
 * Uses a pending-request counter so overlapping requests don't prematurely
 * hide the spinner. A layout component can bind the ZardUI loader to
 * `loading()`.
 */
@Injectable({ providedIn: 'root' })
export class SpinnerService {
  private pending = 0;
  private readonly _loading = signal(false);

  /** Reactive loading flag. */
  readonly loading = this._loading.asReadonly();

  show(): void {
    this.pending++;
    this._loading.set(true);
  }

  hide(): void {
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending === 0) {
      this._loading.set(false);
    }
  }

  /** Force-clear (e.g. on logout / session reset). */
  reset(): void {
    this.pending = 0;
    this._loading.set(false);
  }
}
