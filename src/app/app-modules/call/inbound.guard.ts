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
 * Guards the on-call workspace (`/innerpage`). The workspace only makes sense
 * while a call is connected, so activation is allowed only when {@link CallStore}
 * reports an active call; otherwise the agent is sent back to the dashboard.
 *
 * Replaces the legacy `AuthGuard2`, which read `sessionStorage.onCall === "yes"`
 * directly.
 */
export const inboundGuard: CanActivateFn = () => {
  const callStore = inject(CallStore);
  const router = inject(Router);

  if (callStore.onCall()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
