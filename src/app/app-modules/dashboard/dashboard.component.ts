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

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { AuthStore } from '../core/auth/auth.store';

/**
 * Placeholder landing screen after role selection. Confirms the selected role
 * was recorded and is the guarded redirect target of role selection.
 *
 * TODO(P1+): replace with the real role-specific dashboards (legacy
 * MultiRoleScreenComponent child routes — RO/HAO/CO/MO/… screens).
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dash-wrapper">
      <h1 class="dash-title">Dashboard</h1>
      @if (user(); as u) {
        <p>
          Signed in as <strong>{{ u.userName }}</strong>
        </p>
      }
      @if (currentRole(); as role) {
        <p>
          Role: <strong>{{ role.roleName }}</strong>
          @if (role.featureCode) {
            <span>({{ role.featureCode }})</span>
          }
        </p>
      }
      <p class="dash-todo">Role-specific dashboards are coming soon.</p>
    </div>
  `,
  styles: [
    `
      .dash-wrapper {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1.5rem;
        text-align: center;
      }
      .dash-title {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 0.5rem;
      }
      .dash-todo {
        color: hsl(0 0% 45%);
        font-size: 0.875rem;
      }
    `,
  ],
})
export class DashboardComponent {
  private readonly authStore = inject(AuthStore);

  readonly user = this.authStore.user;
  readonly currentRole = this.authStore.currentRole;
}
