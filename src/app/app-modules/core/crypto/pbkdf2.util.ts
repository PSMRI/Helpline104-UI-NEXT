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

// Imported per primitive rather than through the `crypto-js` barrel. The
// package is CommonJS, so the barrel cannot be tree-shaken: importing it pulls
// every cipher and digest it ships (SHA-3, RIPEMD-160, Triple-DES, Blowfish,
// Rabbit, RC4, all block modes and paddings) into the eager bundle, for the two
// primitives used here. `core` carries the shared `lib`/`enc`/`algo` registries
// that the submodules below extend in place.
import { algo, enc, lib } from 'crypto-js/core';
import PBKDF2 from 'crypto-js/pbkdf2';
// Side-effect import: registers SHA-512 on the `algo` registry above. It has no
// binding of its own to use — `algo.SHA512` is what the hasher option needs.
import 'crypto-js/sha512';

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
export function generateKey(salt: string, passPhrase: string): lib.WordArray {
  return PBKDF2(passPhrase, enc.Hex.parse(salt), {
    hasher: algo.SHA512,
    keySize: KEY_SIZE / 32,
    iterations: ITERATION_COUNT,
  });
}
