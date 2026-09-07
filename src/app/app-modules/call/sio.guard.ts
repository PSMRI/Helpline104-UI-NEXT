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

import { AuthStore } from '../core/auth/auth.store';
import { SERVICE_104, SIO_SCREENS, collectServiceScreens } from './role-workspace/role-screens.util';

/** Feature code the role-selection screen assigns to the SIO role. */
const FEATURE_SIO = 'SIO';

/**
 * Guards `/innerpage/sio` on top of {@link inboundGuard}'s active-call check.
 *
 * Route paths are reachable by typing a URL, so an agent whose role grants no
 * SIO screens could open the SIO workspace directly and see another role's
 * shell (a CO agent holding only `Counselling` could reach it). Activation is
 * allowed when the selected role IS the SIO role, or when the agent holds at
 * least one SIO service screen on the 104 service — the same
 * `serviceRoleScreenMappings` the workspace uses to build its tabs. Anyone else
 * is redirected to the CO workspace.
 */
export const sioGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.currentRole()?.featureCode === FEATURE_SIO) {
    return true;
  }

  const screens = collectServiceScreens(authStore.privileges(), SERVICE_104);
  if (screens.some((screen) => SIO_SCREENS.includes(screen))) {
    return true;
  }

  return router.createUrlTree(['/innerpage/co']);
};
