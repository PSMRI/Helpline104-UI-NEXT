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
 * Models for the supervisor Agent Status screen (`cti/getOnlineAgents`).
 *
 * The endpoint proxies the CZentrix `CTI_ONLINE_AGENTS` transaction, whose
 * payload keys vary across dialer versions (snake_case vs camelCase, `state`
 * vs `status`, the agent list nested under different keys). The normaliser
 * here folds whatever shape arrives into one {@link OnlineAgent} row, so the
 * component never touches raw payloads.
 */

/** Colour bucket for the status badge. */
export type AgentStatusKind = 'available' | 'busy' | 'break' | 'offline';

/** One agent row on the supervisor Agent Status table. */
export interface OnlineAgent {
  /** Dialer agent id (e.g. `2145`). */
  agentId: string;
  /** Agent display name; empty when the dialer does not report one. */
  name: string;
  /** Phone extension / station; empty when not reported. */
  extension: string;
  /** Raw status text as reported by the dialer (e.g. `READY`). */
  status: string;
  /** {@link AgentStatusKind} bucket the raw status maps to. */
  kind: AgentStatusKind;
}

// Candidate payload keys, most-specific first (CZentrix snake_case, then the
// camelCase spellings some Common-API builds re-emit).
const ID_KEYS = ['agent_id', 'agentId', 'agentID', 'agent', 'id', 'username', 'user_name'];
const NAME_KEYS = ['agent_name', 'agentName', 'name', 'full_name', 'fullName', 'display_name'];
const EXTENSION_KEYS = [
  'extension',
  'agent_extension',
  'agentExtension',
  'ext',
  'agent_phone',
  'agentPhone',
  'phone_ext',
  'station',
  'sip_id',
];
const STATUS_KEYS = [
  'state',
  'status',
  'agent_state',
  'agentState',
  'agent_status',
  'agentStatus',
  'mode',
  'stateName',
];

const AVAILABLE_STATES = ['READY', 'AVAILABLE', 'FREE', 'IDLE', 'ONLINE'];
const BUSY_STATES = [
  'BUSY',
  'ONCALL',
  'ON CALL',
  'ON_CALL',
  'CONNECTED',
  'TALKING',
  'DIAL',
  'DIALING',
  'RINGING',
  'ACW',
  'WRAPUP',
  'WRAP-UP',
  'WRAP UP',
  'DISPOSITION',
  'HOLD',
  'CONFERENCE',
  'TRANSFER',
];
const BREAK_STATES = ['BREAK', 'PAUSE', 'PAUSED', 'LUNCH', 'TEA', 'MEETING', 'AWAY', 'AUX'];

/** Map a raw dialer status to its badge colour bucket. */
export function classifyAgentStatus(status: string): AgentStatusKind {
  const value = status.trim().toUpperCase();
  if (!value) {
    return 'offline';
  }
  if (AVAILABLE_STATES.some((s) => value.includes(s))) {
    return 'available';
  }
  if (BUSY_STATES.some((s) => value.includes(s))) {
    return 'busy';
  }
  if (BREAK_STATES.some((s) => value.includes(s))) {
    return 'break';
  }
  return 'offline';
}

/**
 * Normalise the `cti/getOnlineAgents` payload (`data`) into agent rows. The
 * agent list may be the payload itself or nested one level down under any
 * key (`agents`, `agents_online`, `response.agents`, …), so the first array
 * found is taken; rows that carry no agent id and no name are dropped.
 */
export function normalizeOnlineAgents(payload: unknown): OnlineAgent[] {
  const rows = findAgentArray(payload);
  return rows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map(toOnlineAgent)
    .filter((agent) => agent.agentId !== '' || agent.name !== '');
}

function toOnlineAgent(row: Record<string, unknown>): OnlineAgent {
  const status = pickString(row, STATUS_KEYS) || nestedStateName(row);
  return {
    agentId: pickString(row, ID_KEYS),
    name: pickString(row, NAME_KEYS),
    extension: pickString(row, EXTENSION_KEYS),
    status,
    kind: classifyAgentStatus(status),
  };
}

/** `stateObj.stateName`, the nesting `cti/getAgentState` uses. */
function nestedStateName(row: Record<string, unknown>): string {
  const stateObj = row['stateObj'];
  if (stateObj && typeof stateObj === 'object') {
    return pickString(stateObj as Record<string, unknown>, ['stateName', 'state_name']);
  }
  return '';
}

function pickString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
    if (typeof value === 'number') {
      return String(value);
    }
  }
  return '';
}

/** Depth-first search (2 levels) for the first array in the payload. */
function findAgentArray(payload: unknown, depth = 0): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!payload || typeof payload !== 'object' || depth >= 2) {
    return [];
  }
  for (const value of Object.values(payload as Record<string, unknown>)) {
    const found = findAgentArray(value, depth + 1);
    if (found.length > 0) {
      return found;
    }
  }
  return [];
}
