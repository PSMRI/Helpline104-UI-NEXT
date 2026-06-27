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

import { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Rejects whitespace-only values (e.g. `"   "`). Pair with
 * `Validators.required`: a genuinely empty control passes here so the failure
 * still reads as `required`, while a value that is non-empty but blank once
 * trimmed fails with `{ whitespace: true }`. This stops users from satisfying a
 * required field with spaces alone.
 */
export function noWhitespace(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  return value.trim().length === 0 ? { whitespace: true } : null;
}
