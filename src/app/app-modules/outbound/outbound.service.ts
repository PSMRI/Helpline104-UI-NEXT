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
import { Observable, TimeoutError, catchError, map, throwError, timeout } from 'rxjs';

import { ConfigService } from '../core/services/config.service';
import {
  AgentUser,
  AllocateRequest,
  ApiResponse,
  FeatureScreen,
  OutboundCallListRequest,
  OutboundCallRecord,
  OutboundError,
  RoleOption,
} from './outbound.models';

const OUTBOUND_CALL_LIST_PATH = 'call/outboundCallList';
const OUTBOUND_ALLOCATION_PATH = 'call/outboundAllocation';
const RESET_OUTBOUND_CALL_PATH = 'call/resetOutboundCall';
const GET_USERS_PATH = 'user/getUsersByProviderID';
const GET_ROLES_PATH = 'user/getRolesByProviderID';
const ROLE_SCREEN_MAPPING_PATH = 'user/getRoleScreenMappingByProviderID';

const GENERIC_ERROR = 'Internal issue, please try again later.';
const TIMEOUT_ERROR = 'The request timed out. Please check your connection and try again.';
const OUTBOUND_TIMEOUT_MS = 20_000;

/**
 * Outbound call-management API (common base). Backs the worklist, search,
 * allocate and reallocate screens. Every call is a POST (matching legacy) and
 * failures normalise to an {@link OutboundError}.
 */
@Injectable({ providedIn: 'root' })
export class OutboundService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** The agent's own assigned outbound worklist. */
  getCallWorklist(
    providerServiceMapID: number | null,
    assignedUserID: number | null,
  ): Observable<OutboundCallRecord[]> {
    return this.post<OutboundCallRecord[]>(OUTBOUND_CALL_LIST_PATH, {
      providerServiceMapID,
      assignedUserID,
    });
  }

  /** Unallocated / per-agent outbound calls, optionally filtered by date. */
  getOutboundCallList(req: OutboundCallListRequest): Observable<OutboundCallRecord[]> {
    return this.post<OutboundCallRecord[]>(OUTBOUND_CALL_LIST_PATH, req);
  }

  /** Feature → role screen mapping used to bucket records into role worklists. */
  getFeatureRoleMapping(providerServiceMapID: number | null): Observable<FeatureScreen[]> {
    return this.post<FeatureScreen[]>(ROLE_SCREEN_MAPPING_PATH, {
      providerServiceMapID,
    });
  }

  /** Agents available for a given role within the service. */
  getAgents(providerServiceMapID: number | null, roleID: number | null): Observable<AgentUser[]> {
    return this.post<AgentUser[]>(GET_USERS_PATH, {
      providerServiceMapID,
      RoleID: roleID,
    });
  }

  /** Roles configured for the service (with their feature screens). */
  getRoles(providerServiceMapID: number | null): Observable<RoleOption[]> {
    return this.post<RoleOption[]>(GET_ROLES_PATH, { providerServiceMapID });
  }

  /** Allocate the selected records across the selected agents. */
  allocateCalls(req: AllocateRequest): Observable<unknown> {
    return this.post<unknown>(OUTBOUND_ALLOCATION_PATH, req);
  }

  /** Move the given records back into the unallocated/reallocation bin. */
  moveToBin(outboundCallReqIDs: number[]): Observable<unknown> {
    return this.post<unknown>(RESET_OUTBOUND_CALL_PATH, { outboundCallReqIDs });
  }

  private post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(this.config.getCommonBaseURL() + path, body).pipe(
      timeout(OUTBOUND_TIMEOUT_MS),
      map((res) => this.readData(res) ?? ([] as unknown as T)),
      catchError((err: unknown) => throwError(() => this.toError(err))),
    );
  }

  private readData<T>(res: ApiResponse<T>): T | undefined {
    if (res.statusCode && res.statusCode !== 200) {
      throw this.toError(res);
    }
    return res.data;
  }

  private toError(err: unknown): OutboundError {
    if (err instanceof TimeoutError) {
      return { status: 0, errorMessage: TIMEOUT_ERROR };
    }

    if (
      err &&
      typeof (err as OutboundError).status === 'number' &&
      typeof (err as OutboundError).errorMessage === 'string'
    ) {
      return err as OutboundError;
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
