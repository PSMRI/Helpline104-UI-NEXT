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

import { ChangeDetectionStrategy, Component } from '@angular/core';

import { RoleWorkspaceComponent } from './role-workspace.component';

/**
 * Counselling Officer (CO) on-call workspace (route `/innerpage/co`).
 *
 * Ported from the legacy `104-co`: a counselling case-sheet → closure wizard.
 * (The legacy CO also exposed Blood-request / Directory service tabs; those
 * remain the shared service tabs and are wired separately.)
 */
@Component({
  selector: 'app-co-workspace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RoleWorkspaceComponent],
  template: `
    <app-role-workspace
      titleKey="roleWorkspace.co.title"
      subtitleKey="roleWorkspace.co.subtitle"
    />
  `,
})
export class CoWorkspaceComponent {}
