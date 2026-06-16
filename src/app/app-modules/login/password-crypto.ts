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
 * Password encryption for the 104 login, ported byte-for-byte from the Angular
 * 4 app (login.component.ts). The backend expects the exact wire format
 * `salt + iv + ciphertext` produced here — DO NOT change the algorithm,
 * constants, or concatenation order.
 *
 *  - PBKDF2 (SHA-512, 1989 iterations) derives the AES key from a fixed
 *    passphrase and a per-call random salt.
 *  - AES encrypts the password with a per-call random IV.
 *  - Output = saltHex(64) + ivHex(32) + ciphertextBase64.
 */

const KEY_SIZE = 256;
const IV_SIZE = 128;
const ITERATION_COUNT = 1989;

/** Fixed passphrase (legacy `Key_IV`), used as the PBKDF2 passphrase. */
const PASSPHRASE = 'Piramal12Piramal';

function generateKey(salt: string, passPhrase: string): CryptoJS.lib.WordArray {
  return CryptoJS.PBKDF2(passPhrase, CryptoJS.enc.Hex.parse(salt), {
    hasher: CryptoJS.algo.SHA512,
    keySize: KEY_SIZE / 32,
    iterations: ITERATION_COUNT,
  });
}

function encryptWithIvSalt(
  salt: string,
  iv: string,
  passPhrase: string,
  plainText: string,
): string {
  const key = generateKey(salt, passPhrase);
  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv: CryptoJS.enc.Hex.parse(iv),
  });
  return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
}

/**
 * Encrypt a plaintext password into the legacy `salt + iv + ciphertext` format
 * the 104 backend expects.
 */
export function encryptPassword(plainText: string): string {
  const iv = CryptoJS.lib.WordArray.random(IV_SIZE / 8).toString(
    CryptoJS.enc.Hex,
  );
  const salt = CryptoJS.lib.WordArray.random(KEY_SIZE / 8).toString(
    CryptoJS.enc.Hex,
  );
  const ciphertext = encryptWithIvSalt(salt, iv, PASSPHRASE, plainText);
  return salt + iv + ciphertext;
}
