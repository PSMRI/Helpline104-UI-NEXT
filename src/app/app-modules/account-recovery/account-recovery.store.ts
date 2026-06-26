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

import { Injectable, signal } from '@angular/core';

/**
 * In-memory handoff state for the account-recovery flows. Deliberately NOT
 * persisted to storage (legacy parity — the old app kept these on the
 * `dataService` instance): a page reload drops the context and the guarded
 * screens (set-password, set-security-questions) bounce back to login.
 *
 *  - Forgot-password flow: `reset-password` records `userName`, then on a
 *    validated answer records `transactionId`; `set-password` reads both.
 *  - First-login flow: `login` records `userName` + `userId`;
 *    `set-security-questions` reads both.
 */
@Injectable({ providedIn: 'root' })
export class AccountRecoveryStore {
  private readonly _userName = signal<string | null>(null);
  private readonly _userId = signal<number | null>(null);
  private readonly _transactionId = signal<string | null>(null);

  readonly userName = this._userName.asReadonly();
  readonly userId = this._userId.asReadonly();
  readonly transactionId = this._transactionId.asReadonly();

  /** Start the forgot-password flow for a username (clears any stale state). */
  startReset(userName: string): void {
    this.clear();
    this._userName.set(userName);
  }

  /** Record the transaction id returned after answers are validated. */
  setTransactionId(transactionId: string): void {
    this._transactionId.set(transactionId);
  }

  /** Seed the first-login security-question setup from the login response. */
  startSecurityQuestionSetup(userName: string, userId: number): void {
    this.clear();
    this._userName.set(userName);
    this._userId.set(userId);
  }

  /** Drop all recovery state (on completion, cancel, or guard failure). */
  clear(): void {
    this._userName.set(null);
    this._userId.set(null);
    this._transactionId.set(null);
  }
}
