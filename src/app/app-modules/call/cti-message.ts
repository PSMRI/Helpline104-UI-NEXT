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
 * Parser for the pipe-delimited CTI events the CZentrix soft-phone iframe posts
 * to the host window via `window.postMessage`.
 *
 * The inbound payload shape (from the legacy `testEvent()` sample) is:
 *   `Accept|<CLI>|<sessionId>|INBOUND`
 * e.g. `Accept|9034862882|1539175449.1040000000|INBOUND`.
 */

/** The action prefix of an inbound-call CTI event. */
const ACCEPT_ACTION = 'Accept';
/** The campaign tag identifying an inbound (vs outbound) event. */
const INBOUND_DIRECTION = 'INBOUND';
/** Field count of a well-formed inbound payload. */
const INBOUND_FIELD_COUNT = 4;

/** A parsed inbound-call CTI event. */
export interface InboundCtiMessage {
  readonly cli: string;
  readonly sessionId: string;
}

/**
 * Parse a raw `postMessage` payload into an {@link InboundCtiMessage}.
 *
 * Returns `null` for anything that is not a well-formed inbound `Accept` event
 * (wrong type, wrong action, wrong direction, or empty CLI/session id) so the
 * caller can ignore unrelated cross-origin messages safely.
 */
export function parseInboundCtiMessage(data: unknown): InboundCtiMessage | null {
  if (typeof data !== 'string') {
    return null;
  }

  const parts = data.split('|');
  if (parts.length !== INBOUND_FIELD_COUNT) {
    return null;
  }

  const [action, cli, sessionId, direction] = parts.map((part) => part.trim());

  if (action !== ACCEPT_ACTION || direction !== INBOUND_DIRECTION) {
    return null;
  }
  if (!cli || !sessionId) {
    return null;
  }

  return { cli, sessionId };
}
