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

import * as CryptoJS from 'crypto-js';

/**
 * Shared PBKDF2 primitive (SHA-512, 1989 iterations, 256-bit key), ported
 * byte-for-byte from the legacy Angular 4 login. Lives in core so both the
 * lazy login feature (password wire format) and core services (session
 * storage encryption) import it from here — never the other way round.
 *
 * The constants are part of the backend's expected password wire format —
 * DO NOT change them.
 */

const KEY_SIZE = 256;
const ITERATION_COUNT = 1989;

/** PBKDF2 key derivation. `salt` is a hex string. */
export function generateKey(salt: string, passPhrase: string): CryptoJS.lib.WordArray {
  return CryptoJS.PBKDF2(passPhrase, CryptoJS.enc.Hex.parse(salt), {
    hasher: CryptoJS.algo.SHA512,
    keySize: KEY_SIZE / 32,
    iterations: ITERATION_COUNT,
  });
}
