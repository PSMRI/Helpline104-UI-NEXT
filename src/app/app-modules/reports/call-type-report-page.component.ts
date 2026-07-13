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

import { CallTypeReportComponent } from './call-type-report.component';

/**
 * Routed page for the agent Call Type report (`/reports/call-type`, opened
 * from the dashboard Reports panel). Hosts {@link CallTypeReportComponent}
 * with the back-to-dashboard action that the embedded (surveyor workspace)
 * variant hides.
 */
@Component({
  selector: 'app-call-type-report-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CallTypeReportComponent],
  template: `
    <main class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <app-call-type-report [showBack]="true" />
    </main>
  `,
})
export class CallTypeReportPageComponent {}
