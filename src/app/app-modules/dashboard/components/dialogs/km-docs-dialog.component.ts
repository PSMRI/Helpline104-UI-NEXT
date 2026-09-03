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

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Z_MODAL_DATA } from '@common-ui/ui/dialog';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ConfigService } from '../../../core/services/config.service';
import { UserNotification } from '../../alerts-notifications.models';

/** What the dialog is opened with, passed via `zData`. */
export interface KmDocsDialogData {
  readonly documents: UserNotification[];
}

/**
 * Body of the KM Docs (Knowledge Management documents) modal, opened from the
 * Training Resources row of the Activity panel. Ported from the legacy
 * `ActivityThisWeekComponent`'s training dialog: each KM-type notification's
 * description, and (when present) a link to its attached file. Read-only —
 * legacy's version of this dialog had no read/unread/delete controls, unlike
 * the Alerts & Notifications dialog it otherwise resembles.
 */
@Component({
  selector: 'app-km-docs-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    @if (data.documents.length === 0) {
      <p class="py-6 text-center text-sm text-muted-foreground">
        {{ 'dashboard.activity.noKmDocs' | translate: lang() }}
      </p>
    } @else {
      <ul class="max-h-80 divide-y divide-border overflow-y-auto">
        @for (doc of data.documents; track doc.userNotificationMapID) {
          <li class="py-3">
            <p class="text-sm text-foreground">{{ doc.notification?.notificationDesc || '—' }}</p>
            @if (fileUrl(doc); as url) {
              <a
                [href]="url"
                target="_blank"
                rel="noopener noreferrer"
                class="mt-1 inline-block text-sm text-primary hover:underline"
              >
                {{ 'dashboard.activity.viewDocument' | translate: lang() }}
              </a>
            }
          </li>
        }
      </ul>
    }
  `,
})
export class KmDocsDialogComponent {
  private readonly i18n = inject(I18nService);
  private readonly config = inject(ConfigService);
  readonly data = inject<KmDocsDialogData>(Z_MODAL_DATA);

  readonly lang = this.i18n.language;

  /** Download URL for a document's attached file, or null when it has none. */
  fileUrl(doc: UserNotification): string | null {
    const fileUID = doc.notification?.kmFileManager?.fileUID;
    return fileUID ? this.config.getOpenKmBaseURL() + fileUID : null;
  }
}
