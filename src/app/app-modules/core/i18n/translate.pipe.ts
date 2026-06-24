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

import { Pipe, PipeTransform, inject } from '@angular/core';

import { I18nService } from './i18n.service';
import { Language } from './i18n.types';
import { TranslationKey } from './locales';

/**
 * Resolves a {@link TranslationKey} to its localized string, e.g.
 * `{{ 'dashboard.callStatistics.title' | translate: lang() }}`.
 *
 * The app runs with zoneless change detection, so a pure pipe only re-runs when
 * one of its arguments changes by reference. Callers pass the active language
 * signal value (`lang()`) as the second argument: reading the signal in the
 * template registers the dependency, and the changed value busts the pipe's
 * cache on switch — keeping the pipe pure (no per-cycle re-evaluation).
 */
@Pipe({ name: 'translate', standalone: true })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: TranslationKey, language: Language): string {
    return this.i18n.instantFor(key, language);
  }
}
