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
 * Types for the supervisor communication screens (location messages, alerts &
 * notifications, emergency contacts, training resources), derived from the
 * legacy `NotificationService`. Endpoints (POST unless noted):
 *   common base:
 *   - notification/getNotificationType            { providerServiceMapID }
 *   - notification/createNotification             NotificationCreateRequest[]
 *   - notification/getSupervisorNotification      { providerServiceMapID, notificationTypeID,
 *                                                   workingLocationIDs? | roleIDs?,
 *                                                   validStartDate, validEndDate }
 *   - notification/updateNotification             NotificationUpdateRequest
 *   - notification/createEmergencyContacts        EmergencyContactCreateRequest[]
 *   - notification/getSupervisorEmergencyContacts { providerServiceMapID, notificationTypeID }
 *   - notification/updateEmergencyContacts        EmergencyContactRow (mutated row)
 *   - user/getRolesByProviderID                   { providerServiceMapID }
 *   - user/getLocationsByProviderID               { providerServiceMapID, roleID }
 *   admin base:
 *   - getServiceProviderid                        { providerServiceMapID }
 *   - m/location/getAlllocationNew                { providerServiceMapID }
 *   - m/getDesignation                            {}
 */

/** One notification type (`notification/getNotificationType`). */
export interface NotificationType {
  notificationTypeID: number;
  notificationType: string;
}

/** Provider/state/service triple (`getServiceProviderid`). */
export interface ServiceProviderInfo {
  serviceProviderID?: number;
  serviceID?: number;
  stateID?: number;
}

/** One working location / office (`m/location/getAlllocationNew`). */
export interface OfficeLocation {
  pSAddMapID: number;
  locationName: string;
}

/**
 * One role for the service (`user/getRolesByProviderID`, lowercase fields).
 * The legacy screens keep only roles whose `featureName` is non-empty.
 */
export interface ProviderRole {
  roleID: number;
  roleName: string;
  featureName?: string | unknown[];
}

/** One designation row (`m/getDesignation`). */
export interface DesignationRow {
  designationID: number;
  designationName: string;
}

/** KM file attachment descriptor on a notification (training resources). */
export interface KmFileManager {
  fileName?: string;
  fileExtension?: string;
  providerServiceMapID?: number | null;
  userID?: number | null;
  validFrom?: string;
  validUpto?: string;
  /** Base64 content (data-URI payload without the prefix). */
  fileContent?: string;
  createdBy?: string | null;
}

/** One notification row (`notification/getSupervisorNotification`). */
export interface NotificationRow {
  notificationID: number;
  notificationTypeID: number;
  notificationType?: NotificationType;
  notification?: string;
  notificationDesc?: string;
  /** ISO string (the API serialises dates). */
  validFrom?: string;
  validTill?: string;
  deleted?: boolean;
  roleID?: number;
  /** Legacy rows expose the role name capitalised (`role.RoleName`). */
  role?: { RoleName?: string };
  workingLocation?: { locationName?: string };
  kmFileManagerID?: number;
  kmFileManager?: { fileName?: string };
  kmFilePath?: string;
}

/** Body element for `notification/createNotification` (one per location/role). */
export interface NotificationCreateRequest {
  providerServiceMapID: number | null;
  notificationTypeID: number | null;
  createdBy: string | null;
  notification: string | null;
  notificationDesc: string | null;
  /** Offset-adjusted ISO strings (legacy `updateTimeOffset`). */
  validFrom: string;
  validTill: string;
  workingLocationID?: number;
  roleID?: number;
  kmFileManager?: KmFileManager;
}

/** Body for `notification/updateNotification`. */
export interface NotificationUpdateRequest {
  providerServiceMapID: number | null;
  notificationTypeID: number;
  notificationID: number;
  roleID?: number;
  notification: string | null;
  notificationDesc: string | null;
  validFrom: string;
  validTill: string;
  deleted?: boolean;
  modifiedBy: string | null;
  kmFileManager?: KmFileManager;
}

/** Search body for `notification/getSupervisorNotification`. */
export interface NotificationSearchRequest {
  providerServiceMapID: number | null;
  notificationTypeID: number | null;
  workingLocationIDs?: number[];
  roleIDs?: number[];
  validStartDate: string;
  validEndDate: string;
}

/** One emergency contact row (`notification/getSupervisorEmergencyContacts`). */
export interface EmergencyContactRow {
  emergContactID?: number;
  providerServiceMapID?: number | null;
  notificationTypeID?: number | null;
  designationID?: number;
  designation?: { designationID?: number; designationName?: string };
  emergContactName?: string;
  emergContactNo?: string;
  location?: string;
  deleted?: boolean;
  modifiedBy?: string | null;
  [key: string]: unknown;
}

/** Body element for `notification/createEmergencyContacts` (buffered row). */
export interface EmergencyContactCreateRequest {
  providerServiceMapID: number | null;
  notificationTypeID: number | null;
  createdBy: string | null;
  designationID: number | null;
  emergContactName: string | null;
  location: string | null;
  emergContactNo: string | null;
  /** Display-only in the buffer table; the legacy screen sent it along. */
  designationName: string | null;
}
