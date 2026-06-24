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

import { Language, LanguageOption } from '../i18n.types';
import { as } from './as';
import { en, TranslationKey } from './en';
import { hi } from './hi';

/** Loaded locale dictionaries, keyed by implemented language code. */
export const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = {
  en,
  hi,
  as,
};

/**
 * Every language offered in the header selector, in display order (endonyms).
 * Only English, Hindi and Assamese have dictionaries and actually switch the
 * UI; the rest are advertised but surface a "coming soon" notice on selection.
 */
export const AVAILABLE_LANGUAGES: readonly LanguageOption[] = [
  { code: 'as', label: 'Assamese', implemented: true },
  { code: 'bn', label: 'Bengali', implemented: false },
  { code: 'brx', label: 'Bodo', implemented: false },
  { code: 'doi', label: 'Dogri', implemented: false },
  { code: 'en', label: 'English', implemented: true },
  { code: 'gu', label: 'Gujarati', implemented: false },
  { code: 'hi', label: 'Hindi', implemented: true },
  { code: 'kn', label: 'Kannada', implemented: false },
  { code: 'ks', label: 'Kashmiri', implemented: false },
  { code: 'kok', label: 'Konkani', implemented: false },
  { code: 'mai', label: 'Maithili', implemented: false },
  { code: 'ml', label: 'Malayalam', implemented: false },
  { code: 'mni', label: 'Manipuri', implemented: false },
  { code: 'mr', label: 'Marathi', implemented: false },
  { code: 'ne', label: 'Nepali', implemented: false },
  { code: 'nce', label: 'North East', implemented: false },
  { code: 'or', label: 'Odia', implemented: false },
  { code: 'pa', label: 'Punjabi', implemented: false },
  { code: 'sa', label: 'Sanskrit', implemented: false },
  { code: 'sat', label: 'Santali', implemented: false },
  { code: 'sd', label: 'Sindhi', implemented: false },
  { code: 'ta', label: 'Tamil', implemented: false },
  { code: 'te', label: 'Telugu', implemented: false },
  { code: 'ur', label: 'Urdu', implemented: false },
];

export type { TranslationKey };
