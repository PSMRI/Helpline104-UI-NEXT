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
import { Observable, map } from 'rxjs';

import { ConfigService } from '../../core/services/config.service';
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
      .post<ApiResponse<AvailableDisease[]>>(
        this.base104 + PATHS.availableDiseases,
        {},
      )
      .pipe(map((res) => res.data ?? []));
  }

  /**
   * Existing case sheet for the active beneficiary, used to pre-fill the form
   * on re-entry. Resolves to `null` when none exists yet.
   */
  getPresentCaseSheet(
    beneficiaryRegID: number,
    benFlowID?: number | null,
  ): Observable<PresentCaseSheet | null> {
    return this.http
      .post<ApiResponse<PresentCaseSheet>>(this.base104 + PATHS.presentCaseSheet, {
        beneficiaryRegID,
        benFlowID: benFlowID ?? null,
      })
      .pipe(map((res) => res.data ?? null));
  }

  /** Persist the Health Advisory case sheet for the active beneficiary. */
  saveCaseSheet(request: CaseSheetRequest): Observable<CaseSheetResponse> {
    return this.http
      .post<ApiResponse<CaseSheetResponse>>(
        this.base104 + PATHS.saveCaseSheet,
        request,
      )
      .pipe(map((res) => res.data ?? {}));
  }

  // --- Closure ------------------------------------------------------------

  /** Mandatory Call Type / Call Sub-Type catalogue for the closure form. */
  getCallTypes(providerServiceMapID: number | null): Observable<CallType[]> {
    return this.http
      .post<ApiResponse<CallType[]>>(this.baseCommon + PATHS.callTypes, {
        providerServiceMapID,
      })
      .pipe(map((res) => res.data ?? []));
  }

  /** Record the call disposition and close the call. */
  closeCall(request: CloseCallRequest): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(this.baseCommon + PATHS.closeCall, request)
      .pipe(map(() => undefined));
  }

  // --- Transfer (CTI) -----------------------------------------------------

  /** Campaigns the active call may be transferred to. */
  getTransferCampaigns(agentID: number): Observable<TransferCampaign[]> {
    return this.http
      .post<ApiResponse<TransferCampaign[]>>(
        this.baseCommon + PATHS.transferCampaigns,
        { agent_id: agentID },
      )
      .pipe(map((res) => res.data ?? []));
  }

  /** Skills available within a chosen transfer campaign (keyed by name). */
  getCampaignSkills(campaignName: string): Observable<CampaignSkill[]> {
    return this.http
      .post<ApiResponse<CampaignSkill[]>>(this.baseCommon + PATHS.campaignSkills, {
        campaign_name: campaignName,
      })
      .pipe(map((res) => res.data ?? []));
  }

  /**
   * Transfer the active call to the chosen campaign (and optional skill). The
   * snake_case body mirrors the legacy `transferToCampaign` contract; `skill`
   * is omitted unless a skill was chosen.
   */
  transferCall(request: TransferCallRequest): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(this.baseCommon + PATHS.transferCall, {
        transfer_from: request.transferFrom,
        transfer_campaign_info: request.transferCampaignInfo,
        skill_transfer_flag: request.skillTransferFlag,
        ...(request.skillTransferFlag && request.skill
          ? { skill: request.skill }
          : {}),
        agentIPAddress: request.agentIPAddress ?? null,
        benCallID: request.benCallID,
      })
      .pipe(map(() => undefined));
  }
}
