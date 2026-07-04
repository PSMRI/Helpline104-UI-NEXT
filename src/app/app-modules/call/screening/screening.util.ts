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

/** Shared helpers for the Diabetic and BP screening tabs. */

/** Shared Tailwind classes for native `<select>` controls (no custom CSS). */
export const SCREENING_SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring';

/** Obesity classification from a BMI calculation. */
export type ObesityResult = 'Yes' | 'No' | 'NA';

/** Normalise a question label: trim, collapse inner whitespace, lowercase. */
export function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Whether a question is the obesity/BMI question (handled via the weight/height
 * block, not a `<select>`). Matched on a whitespace/case-normalised label so it
 * is robust to the legacy label drift ('Obesity,BMI>25' vs 'Obesity, BMI>25').
 */
export function isObesityQuestion(label: string): boolean {
  return label.replace(/\s+/g, '').toLowerCase() === 'obesity,bmi>25';
}

/**
 * Classify obesity from weight (kg) + height (cm): BMI = kg / m², where height
 * is converted from centimetres to metres (÷100). Returns 'Yes' when BMI > 25,
 * 'No' when 0 < BMI < 25, and 'NA' otherwise (incl. exactly 25 or bad input).
 */
export function calculateObesity(
  weight: number | null,
  height: number | null,
): ObesityResult {
  if (weight == null || height == null || height <= 0) {
    return 'NA';
  }
  const metres = height / 100;
  const bmi = weight / (metres * metres);
  return bmi > 25 ? 'Yes' : bmi > 0 && bmi < 25 ? 'No' : 'NA';
}
