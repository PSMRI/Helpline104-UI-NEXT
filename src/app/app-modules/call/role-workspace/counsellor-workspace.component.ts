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
 * Counsellor on-call workspace (route `/innerpage/counsellor`).
 *
 * Ported from the legacy `104-counsellor`: a counselling case-sheet → closure
 * wizard, with the second "Detailed HIHL CO case sheet" tab (legacy
 * `<app-104-counsellor>`) now wired in via {@link RoleWorkspaceComponent}'s
 * `showHihlTab`.
 */
@Component({
  selector: 'app-counsellor-workspace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RoleWorkspaceComponent],
  template: `
    <app-role-workspace
      titleKey="roleWorkspace.counsellor.title"
      subtitleKey="roleWorkspace.counsellor.subtitle"
      [requireConsent]="true"
      [showHihlTab]="true"
    />
  `,
})
export class CounsellorWorkspaceComponent {}
