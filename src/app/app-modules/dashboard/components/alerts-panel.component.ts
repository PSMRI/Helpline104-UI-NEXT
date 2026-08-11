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
import { lucideBell } from '@ng-icons/lucide';

import { ZardDialogService } from '@common-ui/ui/dialog';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { TranslationKey } from '../../core/i18n/locales';
import { ALERT_CATEGORY_TYPES, AlertCategory, UserNotification } from '../alerts-notifications.models';
import { AlertsIdentity, AlertsNotificationsService } from '../alerts-notifications.service';
import { AlertsNotificationsDialogComponent } from './dialogs/alerts-notifications-dialog.component';

/** One alert category row: its labels and which notification type it shows. */
interface AlertRow {
  readonly category: AlertCategory;
  readonly labelKey: TranslationKey;
  readonly emptyKey: TranslationKey;
}

const ALERT_ROWS: readonly AlertRow[] = [
  {
    category: 'alerts',
    labelKey: 'dashboard.alerts.alerts',
    emptyKey: 'dashboard.alerts.noAlerts',
  },
  {
    category: 'officeBulletin',
    labelKey: 'dashboard.alerts.officeBulletin',
    emptyKey: 'dashboard.alerts.noOfficeBulletin',
  },
  {
    category: 'notifications',
    labelKey: 'dashboard.alerts.notifications',
    emptyKey: 'dashboard.alerts.noNotifications',
  },
];

/**
 * Alerts & Notifications panel, ported from the legacy `alerts-notifications`.
 * Each category row shows its unread count (`getAlertsAndNotificationCount`);
 * clicking a bell fetches the category's messages and opens
 * {@link AlertsNotificationsDialogComponent} to read/unread/delete them, or an
 * info notice when the category is empty. The panel-header bell is decorative.
 */
@Component({
  selector: 'app-alerts-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideBell })],
  template: `
    <section
      class="flex h-full flex-col rounded-lg bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md"
    >
      <header class="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 class="text-lg font-semibold">
          {{ 'dashboard.alerts.title' | translate: lang() }}
        </h2>
        <ng-icon name="lucideBell" size="18" class="text-primary" aria-hidden="true" />
      </header>

      <ul class="divide-y divide-border">
        @for (row of rows; track row.labelKey) {
          <li class="flex items-center justify-between px-4 py-3">
            <span class="text-sm">{{ row.labelKey | translate: lang() }}</span>
            <button
              type="button"
              class="relative rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              [attr.aria-label]="row.labelKey | translate: lang()"
              (click)="openCategory(row)"
            >
              <ng-icon name="lucideBell" size="18" aria-hidden="true" />
              @if (countOf(row.category) > 0) {
                <span
                  class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white"
                >
                  {{ countOf(row.category) }}
                </span>
              }
            </button>
          </li>
        }
      </ul>
    </section>
  `,
})
export class AlertsPanelComponent implements OnInit {
  private readonly alertsService = inject(AlertsNotificationsService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly dialog = inject(ZardDialogService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly rows = ALERT_ROWS;

  /** Unread counts per category (badge on each bell). */
  private readonly counts = signal<Record<AlertCategory, number>>({
    alerts: 0,
    officeBulletin: 0,
    notifications: 0,
  });

  /** First configured notification type per category. */
  private readonly typeIds = signal<Partial<Record<AlertCategory, number>>>({});

  countOf(category: AlertCategory): number {
    return this.counts()[category];
  }

  ngOnInit(): void {
    this.alertsService
      .getNotificationTypes(this.identity().providerServiceMapID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => {
          const ids: Partial<Record<AlertCategory, number>> = {};
          for (const row of ALERT_ROWS) {
            ids[row.category] = types.find(
              (t) => t.notificationType === ALERT_CATEGORY_TYPES[row.category],
            )?.notificationTypeID;
          }
          this.typeIds.set(ids);
        },
        error: () => undefined,
      });
    this.refreshCounts();
  }

  /** Refresh the unread badges (legacy `getCount`). */
  refreshCounts(): void {
    this.alertsService
      .getCount(this.identity())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (count) => {
          const list = count.userNotificationTypeList ?? [];
          const unreadOf = (typeName: string): number =>
            list.find((item) => item.notificationType === typeName)?.notificationTypeUnreadCount ?? 0;
          this.counts.set({
            alerts: unreadOf(ALERT_CATEGORY_TYPES.alerts),
            officeBulletin: unreadOf(ALERT_CATEGORY_TYPES.officeBulletin),
            notifications: unreadOf(ALERT_CATEGORY_TYPES.notifications),
          });
        },
        error: () => undefined,
      });
  }

  /** Open a category: its messages dialog, or the empty notice. */
  openCategory(row: AlertRow): void {
    const notificationTypeID = this.typeIds()[row.category];
    if (notificationTypeID == null) {
      this.showEmpty(row.emptyKey);
      return;
    }
    this.alertsService
      .getNotificationDetails(this.identity(), notificationTypeID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (messages) => {
          const current = messages.filter((m: UserNotification) => m.notificationState !== 'future');
          if (current.length === 0) {
            this.showEmpty(row.emptyKey);
            return;
          }
          this.dialog.create({
            zTitle: this.i18n.instant(row.labelKey),
            zContent: AlertsNotificationsDialogComponent,
            zData: {
              identity: this.identity(),
              notificationTypeID,
              messages: current,
              onChanged: () => this.refreshCounts(),
            },
            zHideFooter: true,
            zWidth: '40rem',
          });
        },
        error: () => this.showEmpty(row.emptyKey),
      });
  }

  private identity(): AlertsIdentity {
    return {
      userID: this.authStore.user()?.userID ?? null,
      roleID: this.authStore.currentRole()?.roleID ?? null,
      providerServiceMapID: this.authStore.currentRole()?.providerServiceMapID ?? null,
    };
  }

  private showEmpty(emptyKey: TranslationKey): void {
    this.confirmDialog
      .alert({
        title: this.i18n.instant('dashboard.dialog.info'),
        message: this.i18n.instant(emptyKey),
        okText: this.i18n.instant('dashboard.dialog.ok'),
      })
      .subscribe();
  }
}
