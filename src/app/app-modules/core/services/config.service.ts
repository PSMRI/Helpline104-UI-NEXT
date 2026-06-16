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

import { Injectable } from '@angular/core';
import { environment } from '@env/environment';

/**
 * Central access point for environment-derived configuration.
 *
 * Ported from the Angular 4 app's `services/config/config.service.ts`, keeping
 * the same getter surface so call sites read the same way. Reads exclusively
 * from `environment` (swapped per build via angular.json fileReplacements).
 */
@Injectable({ providedIn: 'root' })
export class ConfigService {
  // --- API base URLs -------------------------------------------------------
  getCommonBaseURL(): string {
    return environment.commonAPI;
  }

  /** Licensing calls historically share the common API host. */
  getCommonBaseURLLicense(): string {
    return environment.commonAPI;
  }

  /** Open (unauthenticated) endpoints share the common API host. */
  getOpenCommonBaseURL(): string {
    return environment.commonAPI;
  }

  get104BaseURL(): string {
    return environment.ip104;
  }

  get1097BaseURL(): string {
    return environment.ip1097;
  }

  getAdminBaseURL(): string {
    return environment.adminAPI;
  }

  /** MMU shared the admin host in the legacy config. */
  getMMUBaseURL(): string {
    return environment.mmuAPI;
  }

  getTMBaseURL(): string {
    return environment.tmAPI;
  }

  getFHIRBaseURL(): string {
    return environment.fhirAPI;
  }

  getTelephonyServerURL(): string {
    return environment.telephoneServer;
  }

  // --- Behaviour flags -----------------------------------------------------
  /**
   * Whether to append `?apikey=<apiman_key>` to outbound requests (APIMAN
   * gateway). 104 uses this; the key is captured at service/role selection.
   */
  useApimanKey(): boolean {
    return environment.useApimanKey;
  }

  /** Idle session timeout in minutes (27, matching MMU). */
  getSessionTimeoutMinutes(): number {
    return environment.sessionTimeoutMinutes;
  }

  // --- CAPTCHA -------------------------------------------------------------
  getSiteKey(): string {
    return environment.siteKey;
  }

  getCaptchaChallengeURL(): string {
    return environment.captchaChallengeURL;
  }

  isCaptchaEnabled(): boolean {
    return environment.enableCaptcha;
  }
}
