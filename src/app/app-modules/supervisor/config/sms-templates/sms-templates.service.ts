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

const GET_TEMPLATES_PATH = 'sms/getSMSTemplates';
const GET_FULL_TEMPLATE_PATH = 'sms/getFullSMSTemplate';
const GET_TYPES_PATH = 'sms/getSMSTypes';
const GET_PARAMETERS_PATH = 'sms/getSMSParameters';
const SAVE_TEMPLATE_PATH = 'sms/saveSMSTemplate';
const UPDATE_TEMPLATE_PATH = 'sms/updateSMSTemplate';

/** One SMS type (`sms/getSMSTypes`). */
export interface SmsType {
  smsTypeID: number;
  smsType: string;
  [key: string]: unknown;
}

/** One parameter → value mapping of a template. */
export interface SmsParameterMap {
  smsParameterID?: number | null;
  /** The `$$TOKEN$$` name extracted from the template text. */
  smsParameterName?: string | null;
  smsParameterType?: string | null;
  smsParameterValue?: string | null;
  createdBy?: string | null;
  modifiedBy?: string | null;
  [key: string]: unknown;
}

/** One selectable value inside a parameter group. */
export interface SmsParameterValue {
  smsParameterID: number;
  smsParameterName: string;
  [key: string]: unknown;
}

/** One parameter group (`sms/getSMSParameters`): a type with its values. */
export interface SmsParameterGroup {
  smsParameterType: string;
  smsParameters?: SmsParameterValue[];
  [key: string]: unknown;
}

/** One SMS template row (`sms/getSMSTemplates` / `sms/getFullSMSTemplate`). */
export interface SmsTemplateRow {
  smsTemplateID: number;
  smsTemplateName?: string;
  smsTemplate?: string;
  smsTypeID?: number;
  smsType?: SmsType;
  providerServiceMapID?: number;
  smsParameterMaps?: SmsParameterMap[];
  deleted?: boolean;
  modifiedBy?: string | null;
  [key: string]: unknown;
}

/** Body of `sms/saveSMSTemplate` (legacy `saveSMStemplate` request). */
export interface SmsTemplateSaveRequest {
  createdBy: string | null;
  providerServiceMapID: number | null;
  smsParameterMaps: SmsParameterMap[];
  smsTemplate: string | null;
  smsTemplateName: string | null;
  smsTypeID: number | null;
}

/**
 * SMS templates API (legacy `SmsTemplateService`, common base): list the
 * service's templates, fetch one with its parameter maps, list SMS types and
 * parameter groups, save a new template, and activate/deactivate an existing
 * one. Failures normalise to a {@link SupervisorError}.
 *
 * UAT currently returns an empty array from `getSMSTemplates`; list endpoints
 * therefore guard with `Array.isArray` (the `getCallTypes` /
 * `getCampaignSkills` pattern) so a null payload renders the intentional
 * empty state and a malformed non-array payload can never be iterated.
 */
@Injectable({ providedIn: 'root' })
export class SmsTemplatesService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  getSMSTemplates(providerServiceMapID: number | null): Observable<SmsTemplateRow[]> {
    return this.post<SmsTemplateRow[]>(GET_TEMPLATES_PATH, { providerServiceMapID }).pipe(
      map((data) => (Array.isArray(data) ? data : [])),
    );
  }

  getFullSMSTemplate(
    providerServiceMapID: number | null,
    smsTemplateID: number,
  ): Observable<SmsTemplateRow | undefined> {
    return this.post<SmsTemplateRow>(GET_FULL_TEMPLATE_PATH, {
      providerServiceMapID,
      smsTemplateID,
    });
  }

  getSMSTypes(serviceID: number | null): Observable<SmsType[]> {
    return this.post<SmsType[]>(GET_TYPES_PATH, { serviceID }).pipe(
      map((data) => (Array.isArray(data) ? data : [])),
    );
  }

  getSMSParameters(serviceID: number | null): Observable<SmsParameterGroup[]> {
    return this.post<SmsParameterGroup[]>(GET_PARAMETERS_PATH, { serviceID }).pipe(
      map((data) => (Array.isArray(data) ? data : [])),
    );
  }

  saveSMSTemplate(body: SmsTemplateSaveRequest): Observable<unknown> {
    return this.post<unknown>(SAVE_TEMPLATE_PATH, body);
  }

  /** Activate/deactivate: POSTs the row back with `deleted` + `modifiedBy` set. */
  updateSMSTemplate(body: SmsTemplateRow): Observable<unknown> {
    return this.post<unknown>(UPDATE_TEMPLATE_PATH, body);
  }

  private post<T>(path: string, body: unknown): Observable<T | undefined> {
    return this.http.post<ApiResponse<T>>(this.config.getCommonBaseURL() + path, body).pipe(
      timeout(SUPERVISOR_TIMEOUT_MS),
      map((res) => readSupervisorData(res)),
      catchError((err: unknown) => throwError(() => toSupervisorError(err))),
    );
  }
}
