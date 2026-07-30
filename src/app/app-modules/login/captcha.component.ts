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

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  output,
  viewChild,
} from '@angular/core';

import { environment } from '@env/environment';

import { CaptchaService } from './captcha.service';

/**
 * Cloudflare Turnstile captcha widget, ported from the legacy 104
 * `CaptchaComponent`. Lazily loads the challenge script on first render, then
 * mounts a Turnstile widget with `environment.siteKey` and emits each solved
 * token via {@link tokenResolved}.
 *
 * Beyond the legacy port, an empty token is emitted when the challenge
 * expires or errors (Turnstile tokens are short-lived and single-use), so the
 * host form re-disables submission instead of sending a stale token.
 */
@Component({
  selector: 'app-captcha',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div #captchaContainer class="flex justify-center"></div>`,
})
export class CaptchaComponent implements AfterViewInit, OnDestroy {
  private readonly captchaService = inject(CaptchaService);

  /** Emits the solved challenge token; empty string when it expires/resets. */
  readonly tokenResolved = output<string>();

  private readonly captchaRef =
    viewChild.required<ElementRef<HTMLElement>>('captchaContainer');

  private widgetId: string | null = null;
  private destroyed = false;

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.captchaService.loadScript();
      const turnstile = this.captchaService.api();
      if (!turnstile || this.destroyed || this.widgetId !== null) {
        return;
      }
      this.widgetId =
        turnstile.render(this.captchaRef().nativeElement, {
          sitekey: environment.siteKey,
          theme: 'light',
          callback: (token: string) => this.tokenResolved.emit(token),
          'expired-callback': () => this.tokenResolved.emit(''),
          'error-callback': () => this.tokenResolved.emit(''),
        }) ?? null;
    } catch (error) {
      console.error('Failed to initialize CAPTCHA:', error);
    }
  }

  /**
   * Clears the widget for a fresh challenge. Called by the login form after
   * every authentication attempt, since a Turnstile token is single-use.
   */
  reset(): void {
    const turnstile = this.captchaService.api();
    if (this.widgetId !== null && turnstile) {
      turnstile.reset(this.widgetId);
      this.tokenResolved.emit('');
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    const turnstile = this.captchaService.api();
    if (this.widgetId !== null && turnstile) {
      turnstile.remove(this.widgetId);
      this.widgetId = null;
    }
  }
}
