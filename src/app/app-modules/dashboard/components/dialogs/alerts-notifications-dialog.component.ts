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

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideRotateCcw, lucideTrash2 } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { Z_MODAL_DATA } from '@common-ui/ui/dialog';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { AlertsError, UserNotification } from '../../alerts-notifications.models';
import { AlertsIdentity, AlertsNotificationsService } from '../../alerts-notifications.service';

/** What the dialog is opened with, passed via `zData`. */
export interface AlertsNotificationsDialogData {
  readonly identity: AlertsIdentity;
  readonly notificationTypeID: number;
  readonly messages: UserNotification[];
  /** Invoked after any read/unread/delete change so the panel counts refresh. */
  readonly onChanged: () => void;
}

/**
 * Body of the per-category messages modal, opened from a row of the Alerts &
 * Notifications panel. Ported from the legacy `AlertsNotificationsDialog`:
 * each message can be marked read/unread or deleted, with read-all/unread-all
 * bulk actions; unread messages render bold. Every change re-fetches the list
 * (legacy `reInitialize`) and notifies the panel to refresh its badges.
 */
@Component({
  selector: 'app-alerts-notifications-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, NgIcon, ZardButtonComponent, TranslatePipe],
  viewProviders: [provideIcons({ lucideCheck, lucideRotateCcw, lucideTrash2 })],
  template: `
    @if (errorMessage()) {
      <p class="mb-3 text-sm font-medium text-destructive" role="alert">
        {{ errorMessage() }}
      </p>
    }

    @if (messages().length === 0) {
      <p class="py-6 text-center text-sm text-muted-foreground">
        {{ 'dashboard.alertsDialog.empty' | translate: lang() }}
      </p>
    } @else {
      <ul class="max-h-80 divide-y divide-border overflow-y-auto">
        @for (message of messages(); track message.userNotificationMapID) {
          <li class="flex items-start justify-between gap-3 py-3">
            <div class="min-w-0">
              <p
                class="text-sm"
                [class]="
                  message.notificationState === 'unread'
                    ? 'font-semibold text-foreground'
                    : 'text-foreground'
                "
              >
                {{ message.notification?.notification || '—' }}
              </p>
              <p class="mt-0.5 text-sm text-muted-foreground">
                {{ message.notification?.notificationDesc || '—' }}
              </p>
              @if (message.createdDate) {
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ message.createdDate | date: 'dd/MM/yyyy HH:mm' }}
                </p>
              }
            </div>
            <div class="flex shrink-0 items-center gap-1">
              @if (message.notificationState === 'unread') {
                <button
                  type="button"
                  class="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  [attr.aria-label]="'dashboard.alertsDialog.markRead' | translate: lang()"
                  [disabled]="busy()"
                  (click)="changeStatus('read', message)"
                >
                  <ng-icon name="lucideCheck" size="16" aria-hidden="true" />
                </button>
              } @else {
                <button
                  type="button"
                  class="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  [attr.aria-label]="'dashboard.alertsDialog.markUnread' | translate: lang()"
                  [disabled]="busy()"
                  (click)="changeStatus('unread', message)"
                >
                  <ng-icon name="lucideRotateCcw" size="16" aria-hidden="true" />
                </button>
              }
              <button
                type="button"
                class="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-destructive focus:outline-none focus:ring-2 focus:ring-ring"
                [attr.aria-label]="'dashboard.alertsDialog.delete' | translate: lang()"
                [disabled]="busy()"
                (click)="deleteMessage(message)"
              >
                <ng-icon name="lucideTrash2" size="16" aria-hidden="true" />
              </button>
            </div>
          </li>
        }
      </ul>

      <div class="mt-4 flex justify-end gap-2 border-t border-border pt-3">
        <button
          z-button
          type="button"
          zType="outline"
          zSize="sm"
          [zDisabled]="busy()"
          (click)="changeStatusAll('unread')"
        >
          {{ 'dashboard.alertsDialog.unreadAll' | translate: lang() }}
        </button>
        <button
          z-button
          type="button"
          zType="default"
          zSize="sm"
          [zDisabled]="busy()"
          (click)="changeStatusAll('read')"
        >
          {{ 'dashboard.alertsDialog.readAll' | translate: lang() }}
        </button>
      </div>
    }
  `,
})
export class AlertsNotificationsDialogComponent {
  private readonly alertsService = inject(AlertsNotificationsService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly data = inject<AlertsNotificationsDialogData>(Z_MODAL_DATA);

  readonly lang = this.i18n.language;

  readonly messages = signal<UserNotification[]>(this.data.messages);
  readonly busy = signal(false);
  readonly errorMessage = signal('');

  /** Mark one message read or unread. */
  changeStatus(status: 'read' | 'unread', message: UserNotification): void {
    if (message.userNotificationMapID == null) {
      return;
    }
    this.applyChange(this.alertsService.changeStatus(status, [message.userNotificationMapID]));
  }

  /** Mark every listed message read or unread (legacy readAll/unreadAll). */
  changeStatusAll(status: 'read' | 'unread'): void {
    const ids = this.messages()
      .map((m) => m.userNotificationMapID)
      .filter((id): id is number => id != null);
    if (ids.length === 0) {
      return;
    }
    this.applyChange(this.alertsService.changeStatus(status, ids));
  }

  /** Delete one message after confirmation. */
  deleteMessage(message: UserNotification): void {
    if (message.userNotificationMapID == null) {
      return;
    }
    this.confirmDialog
      .confirm({
        title: this.i18n.instant('dashboard.alertsDialog.deleteTitle'),
        message: this.i18n.instant('dashboard.alertsDialog.deleteConfirm'),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
        destructive: true,
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.applyChange(this.alertsService.delete([message.userNotificationMapID!]));
        }
      });
  }

  /** Run a state change, then re-fetch the list and notify the panel. */
  private applyChange(change$: ReturnType<AlertsNotificationsService['delete']>): void {
    this.busy.set(true);
    this.errorMessage.set('');
    change$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.reload(),
      error: (err: AlertsError) => {
        this.busy.set(false);
        this.errorMessage.set(
          err.errorMessage || this.i18n.instant('dashboard.alertsDialog.error'),
        );
      },
    });
  }

  /** Re-fetch the messages of this category (legacy `reInitialize`). */
  private reload(): void {
    this.alertsService
      .getNotificationDetails(this.data.identity, this.data.notificationTypeID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (messages) => {
          this.busy.set(false);
          this.messages.set(messages.filter((m) => m.notificationState !== 'future'));
          this.data.onChanged();
        },
        error: (err: AlertsError) => {
          this.busy.set(false);
          this.errorMessage.set(
            err.errorMessage || this.i18n.instant('dashboard.alertsDialog.error'),
          );
          this.data.onChanged();
        },
      });
  }
}
