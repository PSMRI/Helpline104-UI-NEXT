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
 * Types for the emergency-contacts view modal, derived from the legacy
 * `EmergencyContactsViewModalComponent` + `NotificationService`. Endpoints
 * (common API, POST):
 *   - notification/getNotificationType   { providerServiceMapID }
 *   - notification/getEmergencyContacts  { providerServiceMapID, notificationTypeID }
 */

/** Standard AMRIT API envelope. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised error the modal can display. */
export interface NotificationError {
  status: number;
  errorMessage: string;
}

/** One notification type (used to resolve the "Emergency Contact" type id). */
export interface NotificationType {
  notificationType?: string;
  notificationTypeID?: number;
}

/** One emergency contact shown to the caller. */
export interface EmergencyContact {
  emergContactName?: string;
  designation?: { designationName?: string };
  location?: string;
  emergContactNo?: string;
}
