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

import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { environment } from '@env/environment';
import { generateKey } from '../../login/password-crypto';

/**
 * Thin wrapper over the browser `sessionStorage` that transparently encrypts
 * values at rest (AES-CBC, key derived via the same PBKDF2 primitive the login
 * flow uses — see `password-crypto.ts`).
 *
 * Exposes the same `getItem/setItem/removeItem/clear` surface used by MMU and
 * Common-UI so call sites stay portable; callers are unaware of the
 * encryption.
 *
 * Stored format: `104enc.v1:` + ivHex(32) + ':' + ciphertextBase64. The
 * plaintext is prefixed with the same marker before encryption so a decrypt
 * can be verified — any value that fails the marker check (legacy plaintext
 * written before this change, tampered data, wrong key) yields `null`, which
 * callers already treat as "absent / re-login".
 *
 * HONEST LIMITATION: the key is derived from constants bundled in the JS (and
 * `environment.encKey` when set). Anyone who can read this code can decrypt
 * the values, so this is obfuscation / defense-in-depth against casual
 * inspection of DevTools > Application > Session Storage — NOT real secrecy.
 * The token is still protected primarily by its server-side expiry.
 */

/** Marker for values written by this service (outer prefix + inner check). */
const ENC_MARKER = '104enc.v1:';

/**
 * Fixed app salt (hex) for PBKDF2. Deliberately constant — the derived key
 * must be deterministic so an in-flight session survives a page reload.
 */
const ENC_SALT_HEX =
  '68656c706c696e6531303475692d73657373696f6e2d73746f726167652d7631';

/** Passphrase for key derivation; `environment.encKey` wins when configured. */
const ENC_FALLBACK_PASSPHRASE = 'Helpline104UI@SessionStore';

/**
 * Key derived lazily ONCE at module level. PBKDF2 (1989 SHA-512 iterations)
 * is too slow to run per call — `getItem` runs repeatedly during store
 * rehydration on every reload.
 */
let cachedKey: CryptoJS.lib.WordArray | null = null;

function storageKey(): CryptoJS.lib.WordArray {
  if (cachedKey === null) {
    cachedKey = generateKey(
      ENC_SALT_HEX,
      environment.encKey || ENC_FALLBACK_PASSPHRASE,
    );
  }
  return cachedKey;
}

/** Encrypt a plaintext value into the `104enc.v1:ivHex:cipherB64` format. */
function encryptValue(plainText: string): string {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(ENC_MARKER + plainText, storageKey(), {
    iv,
  });
  return (
    ENC_MARKER +
    iv.toString(CryptoJS.enc.Hex) +
    ':' +
    encrypted.ciphertext.toString(CryptoJS.enc.Base64)
  );
}

/**
 * Decrypt a stored value; returns `null` (never throws) for anything that is
 * not a valid ciphertext produced by {@link encryptValue}.
 */
function decryptValue(stored: string): string | null {
  if (!stored.startsWith(ENC_MARKER)) {
    // Legacy plaintext from before encryption, or foreign data.
    return null;
  }
  const separator = stored.indexOf(':', ENC_MARKER.length);
  if (separator === -1) {
    return null;
  }
  try {
    const ivHex = stored.slice(ENC_MARKER.length, separator);
    const cipherB64 = stored.slice(separator + 1);
    const decrypted = CryptoJS.AES.decrypt(cipherB64, storageKey(), {
      iv: CryptoJS.enc.Hex.parse(ivHex),
    }).toString(CryptoJS.enc.Utf8);
    // The inner marker proves the decrypt round-tripped; garbage from a
    // tampered payload or wrong key fails this check instead of leaking out.
    if (!decrypted.startsWith(ENC_MARKER)) {
      return null;
    }
    return decrypted.slice(ENC_MARKER.length);
  } catch {
    // Malformed base64/hex or invalid padding — treat as absent.
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class SessionStorageService {
  private get store(): Storage | null {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  }

  setItem(key: string, value: string): void {
    try {
      this.store?.setItem(key, encryptValue(value));
    } catch {
      // Ignore: quota exceeded, private-mode restrictions, or storage disabled.
    }
  }

  getItem(key: string): string | null {
    try {
      const stored = this.store?.getItem(key) ?? null;
      return stored === null ? null : decryptValue(stored);
    } catch {
      return null;
    }
  }

  removeItem(key: string): void {
    try {
      this.store?.removeItem(key);
    } catch {
      // Ignore: storage may be unavailable or access denied.
    }
  }

  clear(): void {
    try {
      this.store?.clear();
    } catch {
      // Ignore: storage may be unavailable or access denied.
    }
  }
}
