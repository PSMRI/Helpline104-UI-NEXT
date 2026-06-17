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
 * Placeholder landing screen after login. Confirms the session was established
 * and is the redirect target wired into the login flow.
 *
 * TODO(P1): replace with the real service/role selection (legacy
 * MultiRoleScreenComponent) — list 104 services/roles and call
 * AuthStore.setCurrentRole() on selection.
 */
@Component({
  selector: 'app-role-selection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rs-wrapper">
      <h1 class="rs-title">Role selection</h1>
      @if (user(); as u) {
        <p>
          Signed in as <strong>{{ u.userName }}</strong
          >.
        </p>
      }
      <p>{{ privileges().length }} service privilege(s) available.</p>
      <p class="rs-todo">Service/role selection is coming soon.</p>
    </div>
  `,
  styles: [
    `
      .rs-wrapper {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1.5rem;
        text-align: center;
      }
      .rs-title {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 0.5rem;
      }
      .rs-todo {
        color: hsl(0 0% 45%);
        font-size: 0.875rem;
      }
    `,
  ],
})
export class RoleSelectionComponent {
  private readonly authStore = inject(AuthStore);

  readonly user = this.authStore.user;
  readonly privileges = this.authStore.privileges;
}
