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

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError, timeout } from 'rxjs';

import { ConfigService } from '../../../core/services/config.service';
import {
  ApiResponse,
  SUPERVISOR_TIMEOUT_MS,
  readSupervisorData,
  toSupervisorError,
} from '../../shared/supervisor-api';
import {
  DesignationRow,
  EmergencyContactCreateRequest,
  EmergencyContactRow,
  NotificationCreateRequest,
  NotificationRow,
  NotificationSearchRequest,
  NotificationType,
  NotificationUpdateRequest,
  OfficeLocation,
  ProviderRole,
  ServiceProviderInfo,
} from './notification.models';

const NOTIFICATION_TYPES_PATH = 'notification/getNotificationType';
const CREATE_NOTIFICATION_PATH = 'notification/createNotification';
const SUPERVISOR_NOTIFICATIONS_PATH = 'notification/getSupervisorNotification';
const UPDATE_NOTIFICATION_PATH = 'notification/updateNotification';
const CREATE_EMERGENCY_CONTACTS_PATH = 'notification/createEmergencyContacts';
const SUPERVISOR_EMERGENCY_CONTACTS_PATH = 'notification/getSupervisorEmergencyContacts';
const UPDATE_EMERGENCY_CONTACTS_PATH = 'notification/updateEmergencyContacts';
const ROLES_PATH = 'user/getRolesByProviderID';
const OFFICES_BY_ROLE_PATH = 'user/getLocationsByProviderID';
const SERVICE_PROVIDER_ID_PATH = 'getServiceProviderid';
const ALL_LOCATIONS_PATH = 'm/location/getAlllocationNew';
const DESIGNATIONS_PATH = 'm/getDesignation';

/**
 * Supervisor notification API (legacy `NotificationService`): notification
 * types, offices, roles, designations, the supervisor notification CRUD used
 * by the location-message / alerts / training-resource screens, and the
 * emergency contacts admin. Failures normalise to a {@link SupervisorError}.
 */
@Injectable({ providedIn: 'root' })
export class SupervisorNotificationService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  getNotificationTypes(providerServiceMapID: number | null): Observable<NotificationType[]> {
    return this.post<NotificationType[]>(
      this.config.getCommonBaseURL() + NOTIFICATION_TYPES_PATH,
      { providerServiceMapID },
    ).pipe(map((data) => data ?? []));
  }

  /** Provider/state/service ids for the service (admin base). */
  getServiceProviderInfo(providerServiceMapID: number | null): Observable<ServiceProviderInfo> {
    return this.post<ServiceProviderInfo>(
      this.config.getAdminBaseURL() + SERVICE_PROVIDER_ID_PATH,
      { providerServiceMapID },
    ).pipe(map((data) => data ?? {}));
  }

  /** All working locations / offices for the service (admin base). */
  getOffices(providerServiceMapID: number | null): Observable<OfficeLocation[]> {
    return this.post<OfficeLocation[]>(this.config.getAdminBaseURL() + ALL_LOCATIONS_PATH, {
      providerServiceMapID,
    }).pipe(map((data) => data ?? []));
  }

  /** Offices where a role is functional; `roleID` omitted means all roles. */
  getOfficesByRole(
    providerServiceMapID: number | null,
    roleID: number | undefined,
  ): Observable<OfficeLocation[]> {
    return this.post<OfficeLocation[]>(this.config.getCommonBaseURL() + OFFICES_BY_ROLE_PATH, {
      providerServiceMapID,
      roleID,
    }).pipe(map((data) => data ?? []));
  }

  /**
   * Roles for the service, filtered to those with a feature mapping — the
   * legacy screens dropped roles whose `featureName` was empty.
   */
  getRoles(providerServiceMapID: number | null): Observable<ProviderRole[]> {
    return this.post<ProviderRole[]>(this.config.getCommonBaseURL() + ROLES_PATH, {
      providerServiceMapID,
    }).pipe(map((data) => (data ?? []).filter((role) => (role.featureName?.length ?? 0) !== 0)));
  }

  /** Designation master (admin base). */
  getDesignations(): Observable<DesignationRow[]> {
    return this.post<DesignationRow[]>(this.config.getAdminBaseURL() + DESIGNATIONS_PATH, {}).pipe(
      map((data) => data ?? []),
    );
  }

  getSupervisorNotifications(body: NotificationSearchRequest): Observable<NotificationRow[]> {
    return this.post<NotificationRow[]>(
      this.config.getCommonBaseURL() + SUPERVISOR_NOTIFICATIONS_PATH,
      body,
    ).pipe(map((data) => data ?? []));
  }

  /** Create notifications — the API takes one element per location/role fan-out. */
  createNotifications(body: NotificationCreateRequest[]): Observable<NotificationRow[]> {
    return this.post<NotificationRow[]>(
      this.config.getCommonBaseURL() + CREATE_NOTIFICATION_PATH,
      body,
    ).pipe(map((data) => data ?? []));
  }

  updateNotification(body: NotificationUpdateRequest): Observable<unknown> {
    return this.post<unknown>(this.config.getCommonBaseURL() + UPDATE_NOTIFICATION_PATH, body);
  }

  getEmergencyContacts(
    providerServiceMapID: number | null,
    notificationTypeID: number | null,
  ): Observable<EmergencyContactRow[]> {
    return this.post<EmergencyContactRow[]>(
      this.config.getCommonBaseURL() + SUPERVISOR_EMERGENCY_CONTACTS_PATH,
      { providerServiceMapID, notificationTypeID },
    ).pipe(map((data) => data ?? []));
  }

  createEmergencyContacts(body: EmergencyContactCreateRequest[]): Observable<unknown> {
    return this.post<unknown>(
      this.config.getCommonBaseURL() + CREATE_EMERGENCY_CONTACTS_PATH,
      body,
    );
  }

  /** Update takes the whole (mutated) row, matching the legacy screen. */
  updateEmergencyContact(body: EmergencyContactRow): Observable<unknown> {
    return this.post<unknown>(
      this.config.getCommonBaseURL() + UPDATE_EMERGENCY_CONTACTS_PATH,
      body,
    );
  }

  private post<T>(url: string, body: unknown): Observable<T | undefined> {
    return this.http.post<ApiResponse<T>>(url, body).pipe(
      timeout(SUPERVISOR_TIMEOUT_MS),
      map((res) => readSupervisorData(res)),
      catchError((err: unknown) => throwError(() => toSupervisorError(err))),
    );
  }
}
