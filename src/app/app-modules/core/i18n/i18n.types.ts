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
 * Languages with a complete loaded dictionary — these actually switch the UI.
 * The selector offers many more (see {@link AVAILABLE_LANGUAGES}), but only
 * these are implemented; the rest show a "coming soon" notice.
 */
export type Language = 'en' | 'hi' | 'as';

/** The default/fallback language used before a choice is made or on a miss. */
export const DEFAULT_LANGUAGE: Language = 'en';

/**
 * A selectable language in the header dropdown. `implemented` marks whether a
 * dictionary exists; unimplemented options notify the agent and do not switch.
 */
export interface LanguageOption {
  readonly code: string;
  readonly label: string;
  readonly implemented: boolean;
}
