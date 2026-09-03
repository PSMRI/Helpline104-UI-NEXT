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
import { Observable, map, throwError, timeout } from 'rxjs';

import { ConfigService } from '../../core/services/config.service';
import { DiseaseSummaryDetail } from '../case-sheet/disease-summary.models';
import {
  ApiResponse,
  AvailableDisease,
  CallType,
  CampaignSkill,
  CaseSheetRequest,
  CaseSheetResponse,
  CloseCallRequest,
  PresentCaseSheet,
  TransferCallRequest,
  TransferCampaign,
} from './hao.models';

/** Endpoint paths used by the HAO workspace (see audit §4.4–4.6). */
const PATHS = {
  // Case sheet (Health Advisory) — ip104
  availableDiseases: 'diseaseController/getAvailableDiseases',
  diseaseByID: 'diseaseController/getDiseasesByID',
  presentCaseSheet: 'beneficiary/getPresentCaseSheet',
  saveCaseSheet: 'beneficiary/save/benCaseSheet',
  // Closure / call lifecycle — common-api
  callTypes: 'call/getCallTypesV1',
  closeCall: 'call/closeCall',
  // Transfer — CTI (common-api)
  transferCampaigns: 'cti/getTransferCampaigns',
  campaignSkills: 'cti/getCampaignSkills',
  transferCall: 'cti/transferCall',
} as const;

/**
 * Session expiry, owned solely by the error interceptor (which force-logs the
 * agent out). Turning it into a call-action error here as well would stack a
 * second dialog on top of that logout, so it is passed through untouched.
 */
const SESSION_EXPIRED_STATUS = 5002;

/** Applied to every request in this file — none of them had one before. */
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Reject a call-lifecycle response that reports failure inside an HTTP 200.
 *
 * `closeCall` and `transferCall` answer 200 even when the backend discarded the
 * action, signalling it only in the envelope — `statusCode` 5000 with an
 * `errorMessage`, and/or `status` `"FAILURE"` / `"Failed with …"`. Mapping those
 * to success told the agent the call had been transferred/closed while the
 * backend had thrown it away and the workspace tore the call down regardless, so
 * any non-200 envelope becomes an error for the caller's `error:` branch.
 */
function assertCallActionSucceeded(res: ApiResponse<unknown> | null, action: string): void {
  // A body-less answer (HTTP 204, or a JSON `null`) carries no failure to report,
  // and reading through it would throw a TypeError that the caller would surface
  // as a failed transfer/close — the very mis-report this check exists to prevent.
  if (res === null || res === undefined) {
    return;
  }
  const status = res.status?.trim().toUpperCase() ?? '';
  // Covers "FAILURE" and the longer "Failed with <cause> at <timestamp>" form.
  const failed = (res.statusCode !== undefined && res.statusCode !== 200) || status.startsWith('FAIL');
  if (!failed || res.statusCode === SESSION_EXPIRED_STATUS) {
    return;
  }
  const detail = res.errorMessage?.trim() || `statusCode ${res.statusCode ?? 'unknown'}`;
  throw new Error(`${action} failed: ${detail}`);
}

/**
 * API surface for the HAO (Health Assistant Officer) workspace.
 *
 * Covers the two stages of the HAO step flow: providing a service (the Health
 * Advisory case sheet and its disease lookup) and closing the call (call-type
 * catalogue, disposition save, and optional transfer). Ported from the legacy
 * `caseSheet.service`, `callservice.service` and `czentrix.service` calls that
 * the `104-hao` workspace and its `closure` child fired.
 *
 * Every response is unwrapped from the standard {@link ApiResponse} envelope so
 * callers receive the payload directly; the HTTP interceptors attach auth.
 */
@Injectable({ providedIn: 'root' })
export class HaoService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  private get base104(): string {
    return this.config.get104BaseURL();
  }

  private get baseCommon(): string {
    return this.config.getOpenCommonBaseURL();
  }

  // --- Case sheet (Health Advisory) ---------------------------------------

  /** Diagnosis catalogue for the provisional-diagnosis selector. */
  getAvailableDiseases(): Observable<AvailableDisease[]> {
    return this.http
      .post<ApiResponse<AvailableDisease[]>>(this.base104 + PATHS.availableDiseases, {})
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        map((res) => res.data ?? []),
      );
  }

  /**
   * Full disease-summary detail for one catalogue entry (legacy
   * `diseaseController/getDiseasesByID`, keyed by the summary object). Feeds the
   * disease-summary detail modal opened from the case sheet.
   */
  getDiseaseSummaryDetail(disease: AvailableDisease): Observable<DiseaseSummaryDetail> {
    return this.http
      .post<ApiResponse<DiseaseSummaryDetail>>(this.base104 + PATHS.diseaseByID, disease)
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        map((res) => res.data ?? {}),
      );
  }

  /**
   * Existing case sheet for the active beneficiary, used to pre-fill the form
   * on re-entry. Resolves to `null` when none exists yet.
   */
  getPresentCaseSheet(beneficiaryRegID: number, benFlowID?: number | null): Observable<PresentCaseSheet | null> {
    return this.http
      .post<ApiResponse<PresentCaseSheet>>(this.base104 + PATHS.presentCaseSheet, {
        beneficiaryRegID,
        benFlowID: benFlowID ?? null,
      })
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        map((res) => res.data ?? null),
      );
  }

  /** Persist the Health Advisory case sheet for the active beneficiary. */
  saveCaseSheet(request: CaseSheetRequest): Observable<CaseSheetResponse> {
    return this.http
      .post<ApiResponse<CaseSheetResponse>>(this.base104 + PATHS.saveCaseSheet, request)
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        map((res) => res.data ?? {}),
      );
  }

  // --- Closure ------------------------------------------------------------

  /**
   * Mandatory Call Type catalogue for the closure form.
   *
   * Mirrors the legacy `closure` request body exactly: the backend keys the
   * list off the selected service id sent in the (legacy-named)
   * `providerServiceMapID` field — the Angular 4 app populated it with
   * `current_service.serviceID` — together with the inbound/outbound flag.
   * Passing the resolved `providerServiceMapID` here (as the old code did) or
   * omitting the flag returns an empty list.
   *
   * A null `serviceID` cannot key any catalogue — the backend would silently
   * return `[]`, stranding the agent with no way to close the call and no
   * indication why. Reject it up front so the caller's error path runs instead.
   */
  getCallTypes(serviceID: number | null, isInbound: boolean): Observable<CallType[]> {
    if (serviceID === null) {
      return throwError(() => new Error('getCallTypes: serviceID is required'));
    }
    return this.http
      .post<ApiResponse<CallType[]>>(this.baseCommon + PATHS.callTypes, {
        providerServiceMapID: serviceID,
        ...(isInbound ? { isInbound: true } : { isOutbound: true }),
      })
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        // Call types are mandatory for closure: an absent payload (null /
        // undefined) is a legitimate empty catalogue, but any other non-array
        // shape is malformed and must hit the caller's error path (visible to
        // the agent), not render an empty dropdown that strands the call.
        map((res) => {
          if (res.data == null) return [];
          if (!Array.isArray(res.data)) {
            throw new Error('getCallTypes: expected array, got ' + typeof res.data);
          }
          return res.data;
        }),
      );
  }

  /**
   * Record the call disposition and close the call.
   *
   * A rejected close is reported inside a 200 envelope, so the response is
   * checked before the caller treats it as done — see
   * {@link assertCallActionSucceeded}.
   */
  closeCall(request: CloseCallRequest): Observable<void> {
    return this.http.post<ApiResponse<unknown>>(this.baseCommon + PATHS.closeCall, request).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      map((res) => assertCallActionSucceeded(res, 'closeCall')),
    );
  }

  // --- Transfer (CTI) -----------------------------------------------------

  /**
   * Campaigns the active call may be transferred to.
   *
   * The CTI backend nests the list at `data.campaign` (snake_case
   * `campaign_name` keys); older responses put the array directly on `data`.
   * Both shapes are accepted, anything else is treated as "no campaigns".
   */
  getTransferCampaigns(agentID: number): Observable<TransferCampaign[]> {
    return this.http
      .post<ApiResponse<TransferCampaign[] | { campaign?: TransferCampaign[] }>>(
        this.baseCommon + PATHS.transferCampaigns,
        { agent_id: agentID },
      )
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        map((res) => {
          const arr = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.campaign) ? res.data.campaign : [];
          return arr
            .filter((c: any) => c != null)
            .map((c: any) => ({
              ...c,
              campaignName: c.campaignName ?? c.campaign_name ?? '',
            }));
        }),
      );
  }

  /** Skills available within a chosen transfer campaign (keyed by name). */
  getCampaignSkills(campaignName: string): Observable<CampaignSkill[]> {
    return this.http
      .post<ApiResponse<CampaignSkill[]>>(this.baseCommon + PATHS.campaignSkills, {
        campaign_name: campaignName,
      })
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        map((res) => (Array.isArray(res.data) ? res.data : [])),
      );
  }

  /**
   * Transfer the active call to the chosen campaign (and optional skill). The
   * snake_case body mirrors the legacy `transferToCampaign` contract; `skill`
   * is omitted unless a skill was chosen, but `callType`/`callTypeID` are
   * always sent.
   *
   * A rejected transfer is reported inside a 200 envelope, so the response is
   * checked before the caller hands the call off — see
   * {@link assertCallActionSucceeded}.
   */
  transferCall(request: TransferCallRequest): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(this.baseCommon + PATHS.transferCall, {
        transfer_from: request.transferFrom,
        transfer_campaign_info: request.transferCampaignInfo,
        skill_transfer_flag: request.skillTransferFlag,
        ...(request.skillTransferFlag && request.skill ? { skill: request.skill } : {}),
        agentIPAddress: request.agentIPAddress ?? null,
        benCallID: request.benCallID,
        callType: request.callType,
        callTypeID: request.callTypeID,
      })
      .pipe(
        timeout(REQUEST_TIMEOUT_MS),
        map((res) => assertCallActionSucceeded(res, 'transferCall')),
      );
  }
}
