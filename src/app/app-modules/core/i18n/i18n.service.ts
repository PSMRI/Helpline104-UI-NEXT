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

import { Injectable, computed, inject, signal } from '@angular/core';

import { SessionStorageService } from '../services/session-storage.service';
import { DEFAULT_LANGUAGE, Language } from './i18n.types';
import { AVAILABLE_LANGUAGES, DICTIONARIES, IMPLEMENTED_LANGUAGES, TranslationKey, loadDictionary } from './locales';

/** Storage key holding the agent's chosen UI language across reloads. */
const LANGUAGE_STORAGE_KEY = 'app_language';

/**
 * Signal-based runtime i18n for the 104 agent desktop. Holds the active
 * {@link Language} as a signal, persists the choice, and resolves
 * {@link TranslationKey}s against the loaded dictionaries.
 *
 * Translation in templates goes through {@link TranslatePipe}, which passes the
 * active language explicitly so a pure pipe re-evaluates under zoneless change
 * detection (see `translate.pipe.ts`).
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly storage = inject(SessionStorageService);

  private readonly _language = signal<Language>(DEFAULT_LANGUAGE);

  /** The active UI language. */
  readonly language = this._language.asReadonly();

  /** Languages offered in the UI selector. */
  readonly availableLanguages = AVAILABLE_LANGUAGES;

  /** Endonym of the active language, e.g. "English" / "हिंदी". */
  readonly currentLanguageLabel = computed(() => {
    const active = this._language();
    return AVAILABLE_LANGUAGES.find((option) => option.code === active)?.label ?? active;
  });

  /** Switch the active language and persist the choice. */
  constructor() {
    const stored = this.readStoredLanguage();
    if (stored !== DEFAULT_LANGUAGE) {
      void this.setLanguage(stored);
    }
  }

  async setLanguage(language: Language): Promise<void> {
    if (!this.isImplemented(language) || language === this._language()) {
      return;
    }
    await loadDictionary(language);
    this._language.set(language);
    this.storage.setItem(LANGUAGE_STORAGE_KEY, language);
  }

  /**
   * Whether a language code has a loaded dictionary (i.e. selecting it actually
   * switches the UI). The header uses this to decide between switching and
   * showing the "coming soon" notice for the not-yet-translated languages.
   */
  isImplemented(code: string): code is Language {
    return (IMPLEMENTED_LANGUAGES as readonly string[]).includes(code);
  }

  /** Translate a key in the currently active language. */
  instant(key: TranslationKey): string {
    return this.instantFor(key, this._language());
  }

  /**
   * Translate a key in an explicit language, falling back to the default
   * locale and finally to the raw key. Used by {@link TranslatePipe} so the
   * passed language drives pure-pipe re-evaluation.
   */
  instantFor(key: TranslationKey, language: Language): string {
    return DICTIONARIES[language]?.[key] ?? DICTIONARIES.en[key] ?? key;
  }

  private readStoredLanguage(): Language {
    const stored = this.storage.getItem(LANGUAGE_STORAGE_KEY);
    return stored && this.isImplemented(stored) ? stored : DEFAULT_LANGUAGE;
  }
}
