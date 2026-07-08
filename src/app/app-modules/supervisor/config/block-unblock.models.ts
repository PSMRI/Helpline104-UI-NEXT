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
 * Types for the block/unblock-number screen, derived from the legacy
 * `BlockUnblockNumberComponent` + `CallServices` + `QualityAuditService`.
 * Endpoints (common API, POST):
 *   - call/getBlacklistNumbers   { providerServiceMapID, phoneNo? }
 *   - call/blockPhoneNumber      { phoneBlockID }
 *   - call/unblockPhoneNumber    { phoneBlockID }
 *   - call/nueisanceCallHistory  { calledServiceID, phoneNo, count }
 *   - call/getFilePathCTI        { agentID, callID } -> { response }
 */

/** Standard AMRIT API envelope. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised error the screen can display. */
export interface BlockUnblockError {
  status: number;
  errorMessage: string;
}

/** One blacklist entry for a phone number. */
export interface BlacklistEntry {
  phoneBlockID?: number;
  phoneNo?: string;
  isBlocked?: boolean;
  noOfNuisanceCall?: number;
  /** Epoch ms the block ends. */
  blockEndDate?: number;
}

/** One nuisance-call recording row. */
export interface RecordingEntry {
  phoneNo?: string;
  benCallID?: number;
  callID?: number;
  agentID?: number;
}

/** Envelope for the audio-path lookup (`call/getFilePathCTI`). */
export interface AudioPathResponse {
  response?: string;
}
