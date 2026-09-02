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
import { resolveDispatchPath } from './role-workspace/role-screens.util';

/**
 * Guards the `hao`/`mo`/`co`/`counsellor`/`surveyor`/`pd` children of
 * `/innerpage` on top of {@link inboundGuard}'s active-call check, the same
 * way {@link sioGuard} already guards `sio`.
 *
 * Legacy never needed this: `104.component.html` renders every role
 * workspace behind a single `*ngIf="current_role === '…'"` switch on one
 * route, so there is no URL a CO agent could type to land on the HAO shell.
 * This app gives each workspace its own route, which reopens that gap —
 * activation is allowed only when {@link resolveDispatchPath} (the same
 * function `RoleDispatcherComponent` uses to route an identified caller,
 * including the hybrid RO+HAO case) resolves to the path being requested;
 * anyone else is redirected there instead of rendering another role's shell.
 */
export const roleWorkspaceGuard: CanActivateFn = (route) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const requestedPath = route.routeConfig?.path ?? null;
  const allowedPath = resolveDispatchPath(authStore.currentRole()?.featureCode, authStore.privileges());

  if (requestedPath !== null && requestedPath === allowedPath) {
    return true;
  }

  return router.createUrlTree([allowedPath !== null ? `/innerpage/${allowedPath}` : '/innerpage']);
};
