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

import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./app-modules/login/login.component').then((m) => m.LoginComponent),
  },
  {
    // TODO(P1): placeholder — the password-reset flow is not built yet.
    // Currently re-uses the login screen so the "Forgot Password?" link resolves.
    path: 'reset-password',
    loadComponent: () =>
      import('./app-modules/login/login.component').then((m) => m.LoginComponent),
  },
  {
    // TODO(P1): protect with an auth guard once one exists.
    path: 'role-selection',
    loadComponent: () =>
      import('./app-modules/role-selection/role-selection.component').then(
        (m) => m.RoleSelectionComponent,
      ),
  },
];
