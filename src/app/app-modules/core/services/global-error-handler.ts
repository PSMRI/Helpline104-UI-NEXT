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

import { ErrorHandler, Injectable, inject } from '@angular/core';

import { toast } from 'ngx-sonner';

import { I18nService } from '../i18n/i18n.service';

/**
 * App-wide fallback for errors Angular's own change-detection/event-handling
 * cycle throws — `provideBrowserGlobalErrorListeners()` in `app.config.ts`
 * already reports `window.onerror`/`unhandledrejection`, but that never sees
 * an error thrown while a component template or event handler runs (audit
 * §41: no `ErrorHandler` existed, so an agent hitting one saw a silently
 * frozen/broken screen with no indication anything had gone wrong).
 *
 * Angular has no error-boundary primitive to isolate just the failing
 * component's subtree, so this cannot contain a crash the way the audit's
 * "wrap high-risk feature roots" alternative would — it only guarantees the
 * agent is told to retry instead of staring at an unresponsive UI.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly i18n = inject(I18nService);

  handleError(error: unknown): void {
    console.error('Unhandled application error:', error);
    try {
      toast.error(this.i18n.instant('app.unexpectedError'));
    } catch {
      // Error reporting must never itself throw — the console.error above
      // already ran regardless of whether i18n/toast are in a usable state.
    }
  }
}
