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

import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import { filter, fromEvent, Observable, Subject, takeUntil } from 'rxjs';

import { ZardDialogService } from '@/shared/ui/dialog';

import { ConfirmDialogOptions } from './confirm-dialog.types';

/**
 * Confirmation dialog wrapper around the ZardUI dialog.
 *
 * Replaces the legacy Angular Material `ConfirmationDialogsService.confirm(...)`.
 * Migrated components inject this service and consume the result via `.subscribe()`,
 * exactly as before — only the call signature moves from positional arguments to a
 * single {@link ConfirmDialogOptions} object.
 *
 * @example
 * this.confirmDialog
 *   .confirm({ title: 'Closure', message: 'Confirm closure of this call?' })
 *   .subscribe(ok => { if (ok) { ... } });
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialog = inject(ZardDialogService);
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Opens a confirm/cancel dialog.
   *
   * @returns An `Observable<boolean>` that emits `true` when the user confirms and
   * `false` when they cancel (via the cancel button or the `Escape` key), then
   * completes. The observable always settles exactly once.
   */
  confirm(options: ConfirmDialogOptions): Observable<boolean> {
    const result$ = new Subject<boolean>();

    // Guarantee the observable settles once, regardless of how the dialog closes.
    let settled = false;
    const settle = (value: boolean): void => {
      if (settled) {
        return;
      }
      settled = true;
      result$.next(value);
      result$.complete();
    };

    const dialogRef = this.dialog.create<unknown, unknown>({
      zTitle: options.title,
      zDescription: options.message,
      // Empty/whitespace labels fall back to defaults (truthiness, not `??`),
      // so a stray '' never renders a blank button.
      zOkText: options.okText?.trim() ? options.okText : 'OK',
      zCancelText: options.cancelText?.trim() ? options.cancelText : 'Cancel',
      zOkDestructive: options.destructive ?? false,
      // Mirror the legacy `disableClose: true`: no backdrop dismissal, so the user
      // must make an explicit choice. Note a deliberate parity change — legacy
      // Material `disableClose` also blocked Escape, whereas ZardDialogRef always
      // closes on Escape; we treat that as a cancel (see Escape handler below).
      zMaskClosable: false,
      zOnOk: () => settle(true),
      zOnCancel: () => settle(false),
    });

    // ZardDialogRef closes on Escape via its own keydown handler, which calls
    // close() directly and does NOT fire `zOnCancel`. Listen for Escape here so
    // it resolves as a cancel, and drive the close through our own ref rather
    // than depending on Zard's internal listener — `dialogRef.close()` is
    // idempotent, so the duplicate close is harmless. Torn down once `result$`
    // settles (takeUntil) and skipped on the server (SSR-safe).
    if (isPlatformBrowser(this.platformId)) {
      fromEvent<KeyboardEvent>(document, 'keydown')
        .pipe(
          filter(event => event.key === 'Escape'),
          takeUntil(result$),
        )
        .subscribe(() => {
          settle(false);
          dialogRef.close();
        });
    }

    return result$.asObservable();
  }
}
