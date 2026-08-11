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
 * Shared Tailwind class strings for native `<select>` / `<textarea>` controls
 * across the supervisor configuration screens, identical to the classes used
 * by the SIO service tabs and the registration form so all form screens look
 * the same. ZardUI has no native select/textarea component, so raw controls
 * are styled consistently through these constants.
 */
export const SUP_SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

export const SUP_TEXTAREA_CLASS = SUP_SELECT_CLASS + ' min-h-[4.5rem]';

/**
 * Serialise a local Date the way the legacy screens did before POSTing:
 * subtract the timezone offset so the local wall-clock time is emitted as the
 * UTC portion of the ISO string (`updateTimeOffset` in the Angular 4 app).
 */
export function toOffsetIsoString(date: Date): string {
  return new Date(date.valueOf() - date.getTimezoneOffset() * 60 * 1000).toISOString();
}

/** Format a Date as `YYYY-MM-DD` for a native date input. */
export function toDateInputValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Parse a `YYYY-MM-DD` date-input value as LOCAL midnight (new Date('YYYY-MM-DD')
 * would parse as UTC and shift the calendar day for IST users). Returns `null`
 * for a malformed or impossible calendar date.
 */
export function fromDateInputValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    return null;
  }
  return parsed;
}
