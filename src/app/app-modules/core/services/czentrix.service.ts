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
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';

import { SessionStorageService } from './session-storage.service';
import { ConfigService } from './config.service';

/**
 * CZentrix CTI endpoints, proxied by Common-API (never the CZentrix telephony
 * server directly). Ported from the legacy `CzentrixServices` URL fields.
 *
 * Not ported: the legacy helpers that bypassed Common-API and hit the CZentrix
 * `apps/appsHandler.php` GET API directly (hold/unhold, ready/pause,
 * agent-to-agent transfer, conference dial, agent phone number, campaign
 * catalogue) — all CTI traffic in this app must route through Common-API.
 */
const PATHS = {
  getLoginKey: 'cti/getLoginKey',
  doAgentLogin: 'cti/doAgentLogin',
  doAgentLogout: 'cti/doAgentLogout',
  getAgentIPAddress: 'cti/getAgentIPAddress',
  getAgentState: 'cti/getAgentState',
  getAgentCallStats: 'cti/getAgentCallStats',
  getOnlineAgents: 'cti/getOnlineAgents',
  callBeneficiary: 'cti/callBeneficiary',
  disconnectCall: 'cti/disconnectCall',
  switchToInbound: 'cti/switchToInbound',
  switchToOutbound: 'cti/switchToOutbound',
  getTransferCampaigns: 'cti/getTransferCampaigns',
  getCampaignSkills: 'cti/getCampaignSkills',
  transferCall: 'cti/transferCall',
} as const;

/**
 * Storage keys for the CTI session so the handshake survives a page reload
 * (mirrors how AuthStore persists the auth token).
 */
const CTI_STORAGE_KEYS = {
  loginKey: 'ctiLoginKey',
  agentIP: 'ctiAgentIP',
  agentID: 'ctiAgentID',
} as const;

/** Envelope every Common-API CTI response arrives in (`data` is the payload). */
interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** `cti/getLoginKey` payload — the CZentrix bar login key. */
export interface CtiLoginKey {
  login_key?: string;
  [key: string]: unknown;
}

/** `cti/getAgentIPAddress` payload. */
export interface CtiAgentIP {
  agent_ip?: string;
  [key: string]: unknown;
}

/** Loosely-typed CTI payload for pass-through responses. */
export type CtiPayload = Record<string, unknown>;

/**
 * `cti/transferCall` request, mirroring the legacy `transferToCampaign`
 * arguments. `callType`/`callTypeID` ride along only on skill transfers, as in
 * the legacy service.
 */
export interface CtiTransferCallRequest {
  transferFrom: number;
  transferCampaignInfo: string;
  skillTransferFlag?: boolean;
  skill?: string;
  agentIPAddress?: string | null;
  benCallID?: number | string | null;
  callType?: string;
  callTypeID?: number;
}

/**
 * CZentrix CTI API, proxied through Common-API. Ported from the legacy
 * `CzentrixServices`; request bodies keep the exact legacy (snake_case)
 * shapes and responses are unwrapped from the {@link ApiResponse} envelope,
 * as `extractData` did. The auth interceptor attaches the Authorization token.
 *
 * Besides the raw endpoint wrappers, this service owns the CTI *session*: the
 * login key, agent IP and agent id captured by {@link startCtiSession} are
 * kept in signals and persisted to session storage so the softphone state
 * survives a reload, and {@link endCtiSession} releases the agent on logout.
 */
@Injectable({ providedIn: 'root' })
export class CzentrixService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);
  private readonly storage = inject(SessionStorageService);

  private get baseCommon(): string {
    return this.config.getOpenCommonBaseURL();
  }

  private readonly _loginKey = signal<string | null>(
    this.storage.getItem(CTI_STORAGE_KEYS.loginKey),
  );
  private readonly _agentIP = signal<string | null>(
    this.storage.getItem(CTI_STORAGE_KEYS.agentIP),
  );
  private readonly _agentID = signal<number | null>(
    toNumberOrNull(this.storage.getItem(CTI_STORAGE_KEYS.agentID)),
  );

  /** CZentrix bar login key from `cti/getLoginKey` (legacy `loginKey`). */
  readonly loginKey = this._loginKey.asReadonly();
  /** The agent's CTI IP address from `cti/getAgentIPAddress`. */
  readonly agentIP = this._agentIP.asReadonly();
  /** Agent id the CTI handshake was completed for; null when logged out. */
  readonly agentID = this._agentID.asReadonly();

  // --- Login handshake ------------------------------------------------------

  /**
   * CZentrix login key for the agent. The legacy app sent the portal username
   * and the *encrypted* login password (`getCTILoginToken`).
   */
  getLoginKey(username: string, password: string): Observable<CtiLoginKey> {
    return this.http
      .post<ApiResponse<CtiLoginKey>>(this.baseCommon + PATHS.getLoginKey, {
        username,
        password,
      })
      .pipe(map((res) => res.data ?? {}));
  }

  /**
   * Register the agent on the CZentrix dialer. The legacy body carries only
   * `agent_id` — the IP captured via {@link getAgentIPAddress} is accepted for
   * call-site parity but resolved server-side, so it is not sent.
   */
  doAgentLogin(agentID: number, agentIP?: string | null): Observable<CtiPayload> {
    void agentIP;
    return this.http
      .post<ApiResponse<CtiPayload>>(this.baseCommon + PATHS.doAgentLogin, {
        agent_id: agentID,
      })
      .pipe(map((res) => res.data ?? {}));
  }

  /** Release the agent from the CZentrix dialer. */
  doAgentLogout(agentID: number): Observable<CtiPayload> {
    return this.http
      .post<ApiResponse<CtiPayload>>(this.baseCommon + PATHS.doAgentLogout, {
        agent_id: agentID,
      })
      .pipe(map((res) => res.data ?? {}));
  }

  /** The agent's CTI IP address (`data.agent_ip`); null when absent. */
  getAgentIPAddress(agentID: number): Observable<string | null> {
    return this.http
      .post<ApiResponse<CtiAgentIP>>(this.baseCommon + PATHS.getAgentIPAddress, {
        agent_id: agentID,
      })
      .pipe(map((res) => res.data?.agent_ip ?? null));
  }

  /**
   * Complete the CTI login handshake after a successful portal login:
   * `getLoginKey` → `getAgentIPAddress` → `doAgentLogin`, storing each result.
   *
   * Emits `true` when the agent landed on the dialer, `false` on any failure —
   * it never errors, because the legacy app also let the portal login proceed
   * when CTI was unreachable (the softphone simply stays dark).
   */
  startCtiSession(
    username: string,
    encryptedPassword: string,
    agentID: number,
  ): Observable<boolean> {
    return this.getLoginKey(username, encryptedPassword).pipe(
      tap((key) => this.setLoginKey(key.login_key ?? null)),
      switchMap(() => this.getAgentIPAddress(agentID)),
      tap((ip) => this.setAgentIP(ip)),
      switchMap((ip) => this.doAgentLogin(agentID, ip)),
      tap(() => this.setAgentID(agentID)),
      map(() => true),
      catchError(() => of(false)),
    );
  }

  /**
   * Best-effort CTI logout for the agent recorded by {@link startCtiSession}.
   * Clears the stored CTI session immediately and fires `doAgentLogout`
   * without waiting on (or surfacing) the response, matching the legacy
   * fire-and-forget `agentLogout` call sites.
   */
  endCtiSession(): void {
    const agentID = this._agentID();
    this.clearCtiSession();
    if (agentID === null) {
      return;
    }
    this.doAgentLogout(agentID).subscribe({
      error: () => {
        // Ignore: the portal logout must not be blocked by CTI failures.
      },
    });
  }

  // --- Agent state & calls --------------------------------------------------

  /** The agent's live telephony state (`cti/getAgentState`). */
  getAgentState(agentID: number): Observable<CtiPayload> {
    return this.http
      .post<ApiResponse<CtiPayload>>(this.baseCommon + PATHS.getAgentState, {
        agent_id: agentID,
      })
      .pipe(map((res) => res.data ?? {}));
  }

  /** Today's call statistics for the agent (`cti/getAgentCallStats`). */
  getAgentCallStats(agentID: number): Observable<CtiPayload> {
    return this.http
      .post<ApiResponse<CtiPayload>>(this.baseCommon + PATHS.getAgentCallStats, {
        agent_id: agentID,
      })
      .pipe(map((res) => res.data ?? {}));
  }

  /** Agents currently online on the dialer (`cti/getOnlineAgents`). */
  getOnlineAgents(agentID: number): Observable<CtiPayload> {
    return this.http
      .post<ApiResponse<CtiPayload>>(this.baseCommon + PATHS.getOnlineAgents, {
        agent_id: agentID,
      })
      .pipe(map((res) => res.data ?? {}));
  }

  /** Manual outbound dial (legacy `manualDialaNumber`). */
  callBeneficiary(agentID: number, phoneNum: string): Observable<CtiPayload> {
    return this.http
      .post<ApiResponse<CtiPayload>>(this.baseCommon + PATHS.callBeneficiary, {
        agent_id: agentID,
        phone_num: phoneNum,
      })
      .pipe(map((res) => res.data ?? {}));
  }

  /** Disconnect the agent's active call. */
  disconnectCall(agentID: number): Observable<CtiPayload> {
    return this.http
      .post<ApiResponse<CtiPayload>>(this.baseCommon + PATHS.disconnectCall, {
        agent_id: agentID,
      })
      .pipe(map((res) => res.data ?? {}));
  }

  /** Move the agent onto the inbound campaign. */
  switchToInbound(agentID: number): Observable<CtiPayload> {
    return this.http
      .post<ApiResponse<CtiPayload>>(this.baseCommon + PATHS.switchToInbound, {
        agent_id: agentID,
      })
      .pipe(map((res) => res.data ?? {}));
  }

  /** Move the agent onto the outbound campaign. */
  switchToOutbound(agentID: number): Observable<CtiPayload> {
    return this.http
      .post<ApiResponse<CtiPayload>>(this.baseCommon + PATHS.switchToOutbound, {
        agent_id: agentID,
      })
      .pipe(map((res) => res.data ?? {}));
  }

  // --- Transfer -------------------------------------------------------------

  /** Campaigns the active call may be transferred to. */
  getTransferCampaigns(agentID: number): Observable<CtiPayload> {
    return this.http
      .post<ApiResponse<CtiPayload>>(this.baseCommon + PATHS.getTransferCampaigns, {
        agent_id: agentID,
      })
      .pipe(map((res) => res.data ?? {}));
  }

  /** Skills available within a transfer campaign (keyed by name). */
  getCampaignSkills(campaignName: string): Observable<CtiPayload> {
    return this.http
      .post<ApiResponse<CtiPayload>>(this.baseCommon + PATHS.getCampaignSkills, {
        campaign_name: campaignName,
      })
      .pipe(map((res) => res.data ?? {}));
  }

  /**
   * Transfer the active call to a campaign (legacy `transferToCampaign`). The
   * skill (and the `callType`/`callTypeID` riders) are sent only on a skill
   * transfer with a non-empty skill, exactly as the legacy body was built.
   */
  transferCall(request: CtiTransferCallRequest): Observable<CtiPayload> {
    const isSkillTransfer =
      request.skillTransferFlag !== undefined && request.skill !== undefined;
    const body: Record<string, unknown> = {
      transfer_from: request.transferFrom,
      transfer_campaign_info: request.transferCampaignInfo,
      skill_transfer_flag: request.skillTransferFlag,
      agentIPAddress: request.agentIPAddress,
      benCallID: request.benCallID,
      ...(isSkillTransfer
        ? {
            ...(request.skill !== '' ? { skill: request.skill } : {}),
            callType: request.callType,
            callTypeID: request.callTypeID,
          }
        : {}),
    };
    return this.http
      .post<ApiResponse<CtiPayload>>(this.baseCommon + PATHS.transferCall, body)
      .pipe(map((res) => res.data ?? {}));
  }

  // --- CTI session state ----------------------------------------------------

  private setLoginKey(key: string | null): void {
    this._loginKey.set(key);
    this.persist(CTI_STORAGE_KEYS.loginKey, key);
  }

  private setAgentIP(ip: string | null): void {
    this._agentIP.set(ip);
    this.persist(CTI_STORAGE_KEYS.agentIP, ip);
  }

  private setAgentID(agentID: number | null): void {
    this._agentID.set(agentID);
    this.persist(
      CTI_STORAGE_KEYS.agentID,
      agentID === null ? null : String(agentID),
    );
  }

  private clearCtiSession(): void {
    this.setLoginKey(null);
    this.setAgentIP(null);
    this.setAgentID(null);
  }

  private persist(key: string, value: string | null): void {
    if (value === null) {
      this.storage.removeItem(key);
    } else {
      this.storage.setItem(key, value);
    }
  }
}

/** Parse a persisted agent id; storage only ever holds numeric strings. */
function toNumberOrNull(value: string | null): number | null {
  if (value === null || value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
