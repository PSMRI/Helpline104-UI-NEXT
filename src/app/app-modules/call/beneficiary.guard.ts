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

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { CallStore } from './call.store';

/**
 * Guards the role service workspaces (`/innerpage/hao`, `/mo`, `/co`, …) on top
 * of {@link inboundGuard}'s active-call check.
 *
 * Those workspaces are built around an identified caller: without a beneficiary
 * they render a dead end — no patient context, every save refused ("no active
 * call / beneficiary") — and offer no route back to identify one. The call
 * itself is persisted, so a mid-call reload used to land exactly there.
 * `CallStore` now persists the beneficiary too, and this guard covers what
 * persistence cannot: storage cleared or tampered with, a workspace URL typed
 * before the caller was identified, or browser-Back into a workspace after
 * "Back to RO" deliberately released the beneficiary.
 *
 * Sends the agent to the registration screen to (re-)identify the caller rather
 * than to the dashboard, which would abandon a live call.
 */
export const beneficiaryGuard: CanActivateFn = () => {
  const callStore = inject(CallStore);
  const router = inject(Router);

  if (callStore.beneficiaryId() !== null) {
    return true;
  }

  return router.createUrlTree(['/innerpage/registration']);
};
