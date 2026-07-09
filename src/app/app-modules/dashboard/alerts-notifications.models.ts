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

/**
 * Types for the dashboard Alerts & Notifications panel, ported from the legacy
 * `alerts-notifications` component and `NotificationService`.
 *
 * Endpoints (common base, all POST):
 *   - notification/getNotificationType             — types configured for the service
 *   - notification/getAlertsAndNotificationCount   — unread counts per type
 *   - notification/getAlertsAndNotificationDetail  — the agent's messages of a type
 *   - notification/changeNotificationStatus        — mark read / unread
 *   - notification/markDelete                      — delete messages
 */

/** Standard AMRIT API envelope. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised notifications error the components can display. */
export interface AlertsError {
  status: number;
  errorMessage: string;
}

/** A notification type configured for the service. */
export interface NotificationTypeOption {
  notificationTypeID?: number;
  notificationType?: string;
}

/** Per-type unread counts (`getAlertsAndNotificationCount`). */
export interface NotificationCount {
  userNotificationTypeList?: {
    notificationType?: string;
    notificationTypeUnreadCount?: number;
  }[];
}

/** The notification content nested on a user-notification map entry. */
export interface NotificationContent {
  notificationID?: number;
  notification?: string;
  notificationDesc?: string;
  validFrom?: string;
  validTill?: string;
  kmFileManager?: { fileName?: string };
}

/** One of the agent's messages (`getAlertsAndNotificationDetail`). */
export interface UserNotification {
  userNotificationMapID?: number;
  notificationState?: 'read' | 'unread' | 'future' | string;
  createdDate?: string;
  notification?: NotificationContent;
}

/** Result of a read/unread/delete state change. */
export interface StatusChangeResult {
  status?: string;
}

/** The three dashboard categories and the type name each maps to. */
export const ALERT_CATEGORY_TYPES = {
  alerts: 'Alert',
  officeBulletin: 'Location Message',
  notifications: 'Notification',
} as const;

export type AlertCategory = keyof typeof ALERT_CATEGORY_TYPES;
