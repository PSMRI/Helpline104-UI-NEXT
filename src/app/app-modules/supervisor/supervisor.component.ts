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
import { RouterLink } from '@angular/router';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';

/**
 * Supervisor Activity Area landing, reached from the dashboard's Activity Area
 * rail entry. The supervisor console (activities, reports, configurations) is a
 * later milestone; this is its routed entry point.
 */
@Component({
  selector: 'app-supervisor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ZardButtonComponent, TranslatePipe],
  template: `
    <div
      class="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground"
    >
      <h1 class="text-2xl font-semibold">
        {{ 'supervisor.title' | translate: lang() }}
      </h1>
      <p class="max-w-md text-sm text-muted-foreground">
        {{ 'supervisor.intro' | translate: lang() }}
      </p>
      <a z-button zType="outline" routerLink="/dashboard">
        {{ 'supervisor.backToDashboard' | translate: lang() }}
      </a>
    </div>
  `,
})
export class SupervisorComponent {
  private readonly i18n = inject(I18nService);
  readonly lang = this.i18n.language;
}
