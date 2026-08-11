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
import { Observable, TimeoutError, catchError, map, of, switchMap, throwError, timeout } from 'rxjs';

import { ConfigService } from '../../core/services/config.service';
import { ApiResponse, EmergencyContact, NotificationError, NotificationType } from './notification.models';

const NOTIFICATION_TYPES_PATH = 'notification/getNotificationType';
const EMERGENCY_CONTACTS_PATH = 'notification/getEmergencyContacts';
const EMERGENCY_CONTACT_TYPE = 'Emergency Contact';

const GENERIC_ERROR = 'Internal issue, please try again later.';
const TIMEOUT_ERROR = 'The request timed out. Please check your connection and try again.';
const NOTIFICATION_TIMEOUT_MS = 20_000;

/**
 * Emergency-contacts API (common base). Resolves the "Emergency Contact"
 * notification type for the service, then fetches its contacts. Failures
 * normalise to a {@link NotificationError}.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /**
   * Emergency contacts for the service: looks up the "Emergency Contact"
   * notification type, then its contacts. Resolves to `[]` when the type is not
   * configured.
   */
  getEmergencyContacts(providerServiceMapID: number | null): Observable<EmergencyContact[]> {
    return this.getNotificationTypes(providerServiceMapID).pipe(
      switchMap((types) => {
        const type = types.find((t) => t.notificationType === EMERGENCY_CONTACT_TYPE);
        if (type?.notificationTypeID == null) {
          return of<EmergencyContact[]>([]);
        }
        return this.post<EmergencyContact[]>(EMERGENCY_CONTACTS_PATH, {
          providerServiceMapID,
          notificationTypeID: type.notificationTypeID,
        });
      }),
    );
  }

  private getNotificationTypes(providerServiceMapID: number | null): Observable<NotificationType[]> {
    return this.post<NotificationType[]>(NOTIFICATION_TYPES_PATH, {
      providerServiceMapID,
    });
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(this.config.getCommonBaseURL() + path, body).pipe(
      timeout(NOTIFICATION_TIMEOUT_MS),
      map((res) => this.readData(res) ?? ([] as unknown as T)),
      catchError((err: unknown) => throwError(() => this.toError(err))),
    );
  }

  private readData<T>(res: ApiResponse<T>): T | undefined {
    if (res.statusCode != null && res.statusCode !== 200) {
      throw this.toError(res);
    }
    return res.data;
  }

  private toError(err: unknown): NotificationError {
    if (err instanceof TimeoutError) {
      return { status: 0, errorMessage: TIMEOUT_ERROR };
    }

    if (
      err &&
      typeof (err as NotificationError).status === 'number' &&
      typeof (err as NotificationError).errorMessage === 'string'
    ) {
      return err as NotificationError;
    }

    const envelope = err as ApiResponse<unknown> | undefined;
    if (envelope && typeof envelope.statusCode === 'number') {
      return {
        status: envelope.statusCode,
        errorMessage: envelope.errorMessage?.trim() || GENERIC_ERROR,
      };
    }

    if (err instanceof HttpErrorResponse) {
      const body = err.error as { errorMessage?: string } | string | null;
      const fromBody =
        body && typeof body === 'object' && typeof body.errorMessage === 'string'
          ? body.errorMessage
          : typeof body === 'string'
            ? body
            : '';
      return { status: err.status, errorMessage: fromBody.trim() || GENERIC_ERROR };
    }

    return { status: 0, errorMessage: GENERIC_ERROR };
  }
}
