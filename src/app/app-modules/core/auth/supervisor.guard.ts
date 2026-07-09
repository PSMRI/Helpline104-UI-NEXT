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

import { AuthStore } from './auth.store';

/** Feature code the role-selection screen assigns to the Supervising role. */
const SUPERVISOR_FEATURE_CODE = 'Supervisor';

/**
 * Restricts the supervisor area to agents who selected the Supervisor role.
 *
 * The supervisor screens expose sensitive/destructive actions (e.g.
 * force-logout, grievance forwarding); the backend does not yet gate these by
 * role, so this is the client-side authorization boundary. Runs after
 * {@link authGuard}. Fail-closed: any non-supervisor role — or a null role
 * (e.g. after a reload drops the in-memory role, requiring re-selection) — is
 * redirected to the dashboard.
 */
export const supervisorGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.currentRole()?.featureCode === SUPERVISOR_FEATURE_CODE) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
