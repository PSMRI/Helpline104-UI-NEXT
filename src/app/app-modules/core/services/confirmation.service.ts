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

export type AlertType = 'success' | 'error' | 'info' | 'warning';

/**
 * Minimal alert/confirm dialog service.
 *
 * STUB: currently backed by native `window.alert`/`window.confirm` so the
 * foundation (interceptors + session timeout) is functional now.
 *
 * TODO(P1): replace with a ZardUI-based dialog (shared/ui/dialog) mirroring
 * MMU's `ConfirmationService` + `CommonDialogComponent`, keeping this method
 * surface so call sites don't change.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  alert(message: string, _type: AlertType = 'info'): void {
    if (typeof window !== 'undefined') {
      window.alert(message);
    }
  }

  /** Returns the user's choice. Resolves to `false` outside a browser. */
  confirm(message: string): boolean {
    return typeof window !== 'undefined' ? window.confirm(message) : false;
  }
}
