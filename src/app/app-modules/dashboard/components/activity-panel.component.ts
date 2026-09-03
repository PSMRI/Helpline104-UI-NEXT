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

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideActivity, lucideBookOpen } from '@ng-icons/lucide';

import { ZardDialogService } from '@common-ui/ui/dialog';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { UserNotification } from '../alerts-notifications.models';
import { AlertsIdentity, AlertsNotificationsService } from '../alerts-notifications.service';
import { KmDocsDialogComponent } from './dialogs/km-docs-dialog.component';

/** The notification type name the KM (Knowledge Management) docs carry. */
const KM_NOTIFICATION_TYPE = 'KM';

/**
 * Activity-for-this-week panel. The Training Resources row shows the unread
 * count of KM (Knowledge Management) notifications and opens the KM Docs
 * modal with the agent's actual documents, ported from the legacy
 * `ActivityThisWeekComponent` (`notification/getNotificationType` filtered to
 * the `KM` type, then that type's notifications).
 */
@Component({
  selector: 'app-activity-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideActivity, lucideBookOpen })],
  template: `
    <section
      class="flex h-full flex-col rounded-lg bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md"
    >
      <header class="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 class="text-lg font-semibold">
          {{ 'dashboard.activity.title' | translate: lang() }}
        </h2>
        <ng-icon name="lucideActivity" size="18" class="text-primary" aria-hidden="true" />
      </header>

      <div class="flex flex-1 flex-col px-4 py-3">
        <button
          type="button"
          class="flex items-center justify-between rounded-md px-1 py-2 text-left hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          (click)="openKmDocs()"
        >
          <span class="flex items-center gap-2 text-sm">
            <ng-icon name="lucideBookOpen" size="18" aria-hidden="true" />
            {{ 'dashboard.activity.trainingResources' | translate: lang() }}
          </span>
          @if (count() > 0) {
            <span
              class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground"
            >
              {{ count() }}
            </span>
          }
        </button>
      </div>
    </section>
  `,
})
export class ActivityPanelComponent implements OnInit {
  private readonly alertsService = inject(AlertsNotificationsService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly dialog = inject(ZardDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;

  /** Unread KM-notification count shown as a badge (0 hides the badge). */
  private readonly count_ = signal(0);
  readonly count = this.count_.asReadonly();

  /** The KM notification type's id once resolved; null until then/if absent. */
  private readonly kmTypeID = signal<number | null>(null);

  ngOnInit(): void {
    this.alertsService
      .getNotificationTypes(this.identity().providerServiceMapID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => {
          this.kmTypeID.set(types.find((t) => t.notificationType === KM_NOTIFICATION_TYPE)?.notificationTypeID ?? null);
        },
        error: () => undefined,
      });
    this.refreshCount();
  }

  /** Refresh the unread badge (legacy `training_resource_count`). */
  refreshCount(): void {
    this.alertsService
      .getCount(this.identity())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (count) => {
          const unread =
            count.userNotificationTypeList?.find((item) => item.notificationType === KM_NOTIFICATION_TYPE)
              ?.notificationTypeUnreadCount ?? 0;
          this.count_.set(unread);
        },
        error: () => undefined,
      });
  }

  /** Open the KM Docs modal with the agent's actual documents (legacy `openTrainingDialog`). */
  openKmDocs(): void {
    const notificationTypeID = this.kmTypeID();
    if (notificationTypeID == null) {
      this.openDialog([]);
      return;
    }
    this.alertsService
      .getNotificationDetails(this.identity(), notificationTypeID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (documents) => this.openDialog(documents.filter((d) => d.notificationState !== 'future')),
        error: () => this.openDialog([]),
      });
  }

  private openDialog(documents: UserNotification[]): void {
    this.dialog.create({
      zTitle: this.i18n.instant('dashboard.activity.kmDocsTitle'),
      zContent: KmDocsDialogComponent,
      zData: { documents },
      zHideFooter: true,
      zWidth: '32rem',
    });
  }

  private identity(): AlertsIdentity {
    return {
      userID: this.authStore.user()?.userID ?? null,
      roleID: this.authStore.currentRole()?.roleID ?? null,
      providerServiceMapID: this.authStore.currentRole()?.providerServiceMapID ?? null,
    };
  }
}
