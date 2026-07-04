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

import { ConfigService } from '../../core/services/config.service';
import {
  ApiResponse,
  AudioPathResponse,
  BlacklistEntry,
  BlockUnblockError,
  RecordingEntry,
} from './block-unblock.models';

const BLACKLIST_PATH = 'call/getBlacklistNumbers';
const BLOCK_PATH = 'call/blockPhoneNumber';
const UNBLOCK_PATH = 'call/unblockPhoneNumber';
const RECORDINGS_PATH = 'call/nueisanceCallHistory';
const AUDIO_PATH = 'call/getFilePathCTI';

const GENERIC_ERROR = 'Internal issue, please try again later.';
const TIMEOUT_ERROR = 'The request timed out. Please check your connection and try again.';
const BLOCK_TIMEOUT_MS = 20_000;

/** Recordings envelope: the list lives under `workList` (legacy shape). */
interface RecordingData {
  workList?: RecordingEntry[];
}

/**
 * Block/unblock-number API (common base): blacklist lookup, block/unblock
 * toggles, nuisance-call recordings and the CTI audio-path lookup. Failures
 * normalise to a {@link BlockUnblockError}.
 */
@Injectable({ providedIn: 'root' })
export class BlockUnblockService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ConfigService);

  /** Blacklist entries for the service, optionally filtered by phone number. */
  getBlacklist(
    providerServiceMapID: number | null,
    phoneNo?: string | null,
  ): Observable<BlacklistEntry[]> {
    return this.post<BlacklistEntry[]>(BLACKLIST_PATH, {
      providerServiceMapID,
      ...(phoneNo ? { phoneNo } : {}),
    }).pipe(map((data) => data ?? []));
  }

  /** Block a phone number by its blacklist id. */
  block(phoneBlockID: number): Observable<unknown> {
    return this.post<unknown>(BLOCK_PATH, { phoneBlockID });
  }

  /** Unblock a phone number by its blacklist id. */
  unblock(phoneBlockID: number): Observable<unknown> {
    return this.post<unknown>(UNBLOCK_PATH, { phoneBlockID });
  }

  /** Nuisance-call recordings for a number. */
  getRecordings(
    calledServiceID: number | null,
    phoneNo: string,
    count: number,
  ): Observable<RecordingEntry[]> {
    return this.post<RecordingData>(RECORDINGS_PATH, {
      calledServiceID,
      phoneNo,
      count,
    }).pipe(map((data) => data?.workList ?? []));
  }

  /** Resolve the audio file path for an agent/call pairing. */
  getAudio(agentID: number, callID: number): Observable<string> {
    return this.http
      .post<AudioPathResponse>(this.config.getCommonBaseURL() + AUDIO_PATH, {
        agentID,
        callID,
      })
      .pipe(
        timeout(BLOCK_TIMEOUT_MS),
        map((res) => res?.response ?? ''),
        catchError((err: unknown) => throwError(() => this.toError(err))),
      );
  }

  private post<T>(path: string, body: unknown): Observable<T | undefined> {
    return this.http.post<ApiResponse<T>>(this.config.getCommonBaseURL() + path, body).pipe(
      timeout(BLOCK_TIMEOUT_MS),
      map((res) => this.readData(res)),
      catchError((err: unknown) => throwError(() => this.toError(err))),
    );
  }

  private readData<T>(res: ApiResponse<T>): T | undefined {
    if (res.statusCode != null && res.statusCode !== 200) {
      throw this.toError(res);
    }
    return res.data;
  }

  private toError(err: unknown): BlockUnblockError {
    if (err instanceof TimeoutError) {
      return { status: 0, errorMessage: TIMEOUT_ERROR };
    }

    if (
      err &&
      typeof (err as BlockUnblockError).status === 'number' &&
      typeof (err as BlockUnblockError).errorMessage === 'string'
    ) {
      return err as BlockUnblockError;
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
