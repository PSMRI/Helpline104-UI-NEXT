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
 * Parameters accepted by `turnstile.render()`. Only the subset the app uses;
 * see https://developers.cloudflare.com/turnstile/ for the full surface.
 */
export interface TurnstileRenderParams {
  sitekey: string;
  theme?: 'light' | 'dark' | 'auto';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
}

/** The global API exposed by the Cloudflare Turnstile challenge script. */
export interface TurnstileApi {
  render(element: HTMLElement, params: TurnstileRenderParams): string | undefined;
  reset(widgetId?: string): void;
  remove(widgetId: string): void;
}

/** Give the challenge script this long to load before treating it as failed. */
const SCRIPT_LOAD_TIMEOUT_MS = 15_000;

/**
 * Whether captcha is fully configured for this deployment. All three values
 * must be present together: the flag, the site key the widget renders with,
 * and the challenge-script URL {@link CaptchaService.loadScript} injects —
 * guarding on only a subset could enable the widget with nothing to load.
 */
export function isCaptchaConfigured(): boolean {
  return (
    environment.enableCaptcha && !!environment.siteKey && !!environment.captchaChallengeURL
  );
}

/**
 * Lazy loader for the Cloudflare Turnstile challenge script — the captcha
 * system the legacy 104 login used (`turnstile.render` against
 * `environment.captchaChallengeURL`, ported from its `CaptchaService`).
 *
 * The script is injected only when {@link loadScript} is first called (i.e.
 * only when a captcha widget actually renders), so deployments with captcha
 * disabled never make a request to the challenge host. The in-flight promise
 * is cached so concurrent callers share one `<script>` tag; a load failure
 * clears the cache so a later attempt can retry.
 */
@Injectable({ providedIn: 'root' })
export class CaptchaService {
  private scriptPromise: Promise<void> | null = null;

  /** Injects the Turnstile script once and resolves when it is ready. */
  loadScript(): Promise<void> {
    if (this.scriptPromise) {
      return this.scriptPromise;
    }
    this.scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      // Failure clears the cached promise so a later call can retry, and
      // removes the dead tag so retries never accumulate <script> elements.
      const fail = (message: string) => {
        clearTimeout(timer);
        script.remove();
        this.scriptPromise = null;
        reject(new Error(message));
      };
      // Some load failures (blocked challenge host, privacy extensions) fire
      // no event at all, so a hang has to count as a failure too.
      const timer = setTimeout(
        () =>
          fail(`Timed out loading CAPTCHA script from ${environment.captchaChallengeURL}`),
        SCRIPT_LOAD_TIMEOUT_MS,
      );
      script.src = environment.captchaChallengeURL;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      script.onerror = () =>
        fail(`Failed to load CAPTCHA script from ${environment.captchaChallengeURL}`);
      document.head.appendChild(script);
    });
    return this.scriptPromise;
  }

  /** The Turnstile global, or `null` when the script has not loaded. */
  api(): TurnstileApi | null {
    const candidate = (globalThis as { turnstile?: TurnstileApi }).turnstile;
    return candidate ?? null;
  }
}
