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

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Observable, catchError, map, throwError } from 'rxjs';

import { ConfigService } from '../core/services/config.service';
import {
  AlertsError,
  ApiResponse,
  NotificationCount,
  NotificationTypeOption,
  StatusChangeResult,
  UserNotification,
} from './alerts-notifications.models';

const NOTIFICATION_TYPES_PATH = 'notification/getNotificationType';
const COUNT_PATH = 'notification/getAlertsAndNotificationCount';
const DETAILS_PATH = 'notification/getAlertsAndNotificationDetail';
const CHANGE_STATUS_PATH = 'notification/changeNotificationStatus';
const MARK_DELETE_PATH = 'notification/markDelete';

const GENERIC_ERROR = 'Internal issue, please try again later.';

/** Who the counts/details are fetched for. */
export interface AlertsIdentity {
  userID: number | null;
  roleID: number | null;
  providerServiceMapID: number | null;
}

/**
 * Dashboard alerts & notifications API, ported from the legacy
 * `NotificationService` methods used by `alerts-notifications`: unread counts,
 * per-type message details and the read/unread/delete state changes.
 */
@Injectable({ providedIn: 'root' })
export class AlertsNotificationsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** Notification types configured for the service. */
  getNotificationTypes(providerServiceMapID: number | null): Observable<NotificationTypeOption[]> {
    return this.post<NotificationTypeOption[]>(NOTIFICATION_TYPES_PATH, {
      providerServiceMapID,
    });
  }

  /** Unread counts per notification type for the agent. */
  getCount(identity: AlertsIdentity): Observable<NotificationCount> {
    return this.post<NotificationCount>(COUNT_PATH, identity);
  }

  /** The agent's messages of one notification type. */
  getNotificationDetails(identity: AlertsIdentity, notificationTypeID: number): Observable<UserNotification[]> {
    return this.post<UserNotification[]>(DETAILS_PATH, {
      ...identity,
      notificationTypeID,
    });
  }

  /**
   * Mark messages read or unread. The payload key `notficationStatus` is the
   * legacy API's exact (misspelled) contract — do not "fix" it.
   */
  changeStatus(status: 'read' | 'unread', userNotificationMapIDList: number[]): Observable<StatusChangeResult> {
    return this.post<StatusChangeResult>(CHANGE_STATUS_PATH, {
      notficationStatus: status,
      userNotificationMapIDList,
    });
  }

  /** Delete messages for this agent. */
  delete(userNotificationMapIDList: number[]): Observable<StatusChangeResult> {
    return this.post<StatusChangeResult>(MARK_DELETE_PATH, {
      isDeleted: true,
      userNotificationMapIDList,
    });
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(this.config.getCommonBaseURL() + path, body).pipe(
      map((res) => {
        if (res.statusCode && res.statusCode !== 200) {
          throw this.toError(res);
        }
        return res.data ?? ([] as unknown as T);
      }),
      catchError((err: unknown) => throwError(() => this.toError(err))),
    );
  }

  private toError(err: unknown): AlertsError {
    if (
      err &&
      typeof (err as AlertsError).status === 'number' &&
      typeof (err as AlertsError).errorMessage === 'string'
    ) {
      return err as AlertsError;
    }
    const envelope = err as ApiResponse<unknown> | undefined;
    if (envelope && typeof envelope.statusCode === 'number') {
      return {
        status: envelope.statusCode,
        errorMessage: envelope.errorMessage?.trim() || GENERIC_ERROR,
      };
    }
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { errorMessage?: string } | null;
      const message =
        body && typeof body === 'object' && typeof body.errorMessage === 'string' ? body.errorMessage : '';
      return { status: err.status, errorMessage: message.trim() || GENERIC_ERROR };
    }
    return { status: 0, errorMessage: GENERIC_ERROR };
  }
}
