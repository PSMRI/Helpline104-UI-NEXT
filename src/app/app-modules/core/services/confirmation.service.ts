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

import { firstValueFrom } from 'rxjs';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { TranslationKey } from '../i18n/locales';
import { I18nService } from '../i18n/i18n.service';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

/** Localised dialog title per alert flavour. */
const ALERT_TITLE_KEYS: Record<AlertType, TranslationKey> = {
  success: 'dialog.successTitle',
  error: 'dialog.errorTitle',
  info: 'dialog.infoTitle',
  warning: 'dialog.warningTitle',
};

/**
 * Message-first alert/confirm facade over the ZardUI dialog.
 *
 * Formerly a stub backed by native `window.alert`/`window.confirm`; it now
 * delegates to {@link ConfirmDialogService} (the app-wide ZardUI dialog
 * wrapper) so foundation flows such as the session-idle prompt render the
 * same styled dialog as the rest of the app. Because a rendered dialog cannot
 * block the thread the way `window.confirm` did, both methods are async:
 * `confirm()` resolves to the user's choice and `alert()` resolves once the
 * notice is acknowledged.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly dialog = inject(ConfirmDialogService);
  private readonly i18n = inject(I18nService);
  private readonly platformId = inject(PLATFORM_ID);

  /** Shows a single-button notice; resolves once the user acknowledges it. */
  async alert(message: string, type: AlertType = 'info'): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    await firstValueFrom(
      this.dialog.alert({
        title: this.i18n.instant(ALERT_TITLE_KEYS[type]),
        message,
      }),
      { defaultValue: undefined },
    );
  }

  /** Resolves to the user's choice. Resolves to `false` outside a browser. */
  async confirm(message: string): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return firstValueFrom(
      this.dialog.confirm({
        title: this.i18n.instant('dialog.confirmTitle'),
        message,
      }),
      { defaultValue: false },
    );
  }
}
