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
 * The call-screen accents legacy uses, sampled from screenshots of the running
 * legacy 104 app rather than guessed: the primary-action green (#018c4f, its
 * Save / Save & Send / Prescription / History buttons) and the chrome blue
 * (#0070c1, its dialog title bars, Ok buttons and Closure button).
 *
 * These are deliberately literal rather than theme tokens: the app theme's
 * closest equivalents are a different colour (`--success` #198754,
 * `--info` #0dcaf0), and agents compare these screens against legacy
 * side by side, so the accents have to match exactly. Passed to
 * `z-button`'s `class` input, which tailwind-merge applies over the variant.
 */
export const LEGACY_GREEN_BUTTON = 'border-transparent bg-[#018c4f] text-white hover:bg-[#016b3d]';

/** Legacy's blue action (Closure, dialog Ok). See {@link LEGACY_GREEN_BUTTON}. */
export const LEGACY_BLUE_BUTTON = 'border-transparent bg-[#0070c1] text-white hover:bg-[#005a9b]';

/**
 * Legacy's modal chrome: a full-bleed blue title bar with white text and a
 * white close X, and a body that scrolls inside a fixed-height dialog instead
 * of growing past the viewport (which put the footer's Save out of reach).
 *
 * Applied through `zCustomClasses`, so the descendant variants reach the
 * dialog's own header and close button.
 */
export const LEGACY_DIALOG_CHROME = [
  'max-h-[92vh]',
  '[&>header]:-mx-6 [&>header]:-mt-6 [&>header]:mb-0 [&>header]:rounded-t-lg [&>header]:bg-[#0070c1]',
  '[&>header]:px-6 [&>header]:py-3 [&>header]:text-white',
  '[&_[data-testid=z-close-header-button]]:text-white',
  '[&_[data-testid=z-close-header-button]]:hover:bg-white/20',
].join(' ');
