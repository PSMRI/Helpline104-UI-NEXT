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

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideConstruction } from '@ng-icons/lucide';

import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { TranslationKey } from '../core/i18n/locales';

/**
 * Shared "not yet migrated" page for supervisor sections that still live in the
 * legacy app. The section title comes from the route's `data.titleKey`.
 */
@Component({
  selector: 'app-supervisor-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideConstruction })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h2 class="mb-4 text-base font-semibold text-foreground">
        {{ titleKey() | translate: lang() }}
      </h2>
      <div
        class="flex min-h-[16rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-10 text-center"
      >
        <ng-icon
          name="lucideConstruction"
          size="40"
          class="text-muted-foreground"
          aria-hidden="true"
        />
        <p class="text-base font-medium text-foreground">
          {{ 'supervisor.placeholder.title' | translate: lang() }}
        </p>
        <p class="max-w-md text-sm text-muted-foreground">
          {{ 'supervisor.placeholder.body' | translate: lang() }}
        </p>
      </div>
    </section>
  `,
})
export class SupervisorPlaceholderComponent {
  private readonly i18n = inject(I18nService);
  private readonly route = inject(ActivatedRoute);

  readonly lang = this.i18n.language;

  private readonly routeData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });

  /** The section title key supplied via route `data.titleKey`. */
  readonly titleKey = computed(
    () => (this.routeData()['titleKey'] as TranslationKey | undefined) ?? 'supervisor.title',
  );
}
