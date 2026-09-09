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

import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import { filter, map } from 'rxjs';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePhone } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { I18nService } from '@/app-modules/core/i18n/i18n.service';
import { TranslatePipe } from '@/app-modules/core/i18n/translate.pipe';

import { CtiPanelStore } from './cti-panel.store';

/**
 * Route prefixes whose own footer docks the CZentrix toggle button itself
 * (see `DashboardFooterComponent` / `InnerpageFooterComponent`) — every route
 * `showCzentrix()` can ever be true on except `/outbound/*`, which has no
 * shared shell/footer of its own, so the floating toggle still covers that one.
 */
const FOOTER_ROUTE_PREFIXES = ['/dashboard', '/innerpage'] as const;

/**
 * How long to wait for the CTI iframe to load before treating it as
 * unavailable. The telephony host is a separate, unmonitored server — a
 * hang there previously left a blank/broken box with no indication or
 * retry affordance (audit §40).
 */
const LOAD_TIMEOUT_MS = 8_000;

/**
 * Floating CZentrix CTI (telephony soft-phone) panel, rendered once at the app
 * root — outside the router outlet — so the soft-phone iframe persists across
 * *every* route (dashboard, `/innerpage/*`, outbound, …) and is never torn
 * down by navigation while the agent is on a call. Open/visibility state
 * lives in the shared `CtiPanelStore`, not here.
 *
 * The toggle *button* is docked into the dashboard's and the on-call
 * workspace's own footers instead (next to Feedback/Version, or just Version
 * on `/innerpage/*` — see `InnerpageFooterComponent`) — both to match legacy
 * (footer + CZentrix in its corner on every screen) and because a `fixed`
 * floating toggle would otherwise sit on top of whatever a given screen
 * happens to render in its own bottom-right corner (registration's own
 * "Next"/"Register beneficiary" button, for instance). `/outbound/*` has no
 * shared shell/footer of its own, so this still renders the floating toggle
 * there — the one place it's still needed.
 *
 * Positioned `bottom-12`/`bottom-28` for that floating fallback: clears the
 * "Simulate inbound call (dev)" button without needing to clear a footer,
 * since every route with a footer already docks the toggle instead.
 */
@Component({
  selector: 'app-cti-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ZardButtonComponent, NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucidePhone })],
  template: `
    @if (store.showCzentrix()) {
      @if (!hasFooter()) {
        <button
          z-button
          type="button"
          zSize="lg"
          class="fixed bottom-12 right-4 z-50 h-12 gap-2 px-5 text-base font-semibold shadow-xl"
          (click)="store.toggleCti()"
        >
          <ng-icon name="lucidePhone" size="20" aria-hidden="true" />
          {{ store.czentrixLabel }}
        </button>
      }

      @if (store.ctiUrl(); as src) {
        <!--
          Mounted once the agent is eligible and stays mounted for the rest of
          the session — [hidden] toggles visibility, nothing here ever tears
          the iframe down while collapsed. It used to be gated on ctiOpen()
          too, destroying and recreating the iframe on every collapse/expand;
          once the inbound-postMessage origin fix let real CZentrix messages
          through (they were previously all silently dropped by a mismatched
          origin check), a message CZentrix fires when its own iframe
          unmounts started being read as a genuine "CustDisconnect" — the
          caller had not actually hung up.
        -->
        <div
          class="fixed bottom-28 right-4 z-50 flex w-[178px] flex-col overflow-hidden rounded-md border border-border bg-card shadow-lg"
          [hidden]="!store.ctiOpen()"
        >
          <div class="flex shrink-0 items-center justify-between bg-primary px-2 py-1 text-primary-foreground">
            <span class="text-xs font-semibold">{{ store.czentrixLabel }}</span>
            <button
              type="button"
              class="rounded px-1 text-xs leading-none text-primary-foreground/90 hover:bg-white/20 hover:text-primary-foreground"
              aria-label="Close CZentrix panel"
              (click)="store.toggleCti()"
            >
              &times;
            </button>
          </div>
          <div class="relative h-[285px] w-full overflow-hidden">
            @if (unavailable()) {
              <div class="absolute inset-0 flex flex-col items-start bg-card p-3" role="alert">
                <p class="text-xs text-muted-foreground">{{ 'cti.unavailable' | translate: lang() }}</p>
                <button z-button type="button" zSize="xs" class="mt-2" (click)="retry()">
                  {{ 'cti.retry' | translate: lang() }}
                </button>
              </div>
            }
            <!--
              CZentrix's own bar page is a legacy, non-responsive layout (fixed
              ~230x380 content) — shrinking the iframe's own box just clips it
              instead of shrinking its padding/buttons/font. A CSS scale
              transform shrinks the whole rendered page proportionally instead;
              the wrapper is sized to the post-scale footprint and clips any
              sub-pixel overhang. The iframe stays rendered (just covered by
              the panel above) even while unavailable, rather than being
              swapped out via @if/@else — same "never torn down" reasoning as
              the outer panel.
            -->
            <iframe
              [src]="src"
              [title]="store.czentrixLabel"
              (load)="onIframeLoad()"
              (error)="onIframeError()"
              class="h-[380px] w-[230px] origin-top-left scale-75 border-0"
            ></iframe>
          </div>
        </div>
      }
    }
  `,
})
export class CtiPanelComponent {
  readonly store = inject(CtiPanelStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  readonly lang = this.i18n.language;

  /** Current URL, used only to withhold the floating toggle on the dashboard route. */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      takeUntilDestroyed(),
    ),
    { initialValue: this.router.url },
  );

  readonly hasFooter = computed(() => FOOTER_ROUTE_PREFIXES.some((prefix) => this.url().startsWith(prefix)));

  /**
   * `'loading'` while a load-timeout is pending, `'error'` once it fires or
   * the iframe reports one. A `load` event only proves *some* content
   * arrived, not that it's a working soft-phone bar — cross-origin content
   * can't be inspected, so this is best-effort, not a content oracle.
   */
  private readonly loadState = signal<'loading' | 'loaded' | 'error'>('loading');
  readonly unavailable = computed(() => this.loadState() === 'error');

  private loadTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Starts/clears the load watch on every open/close, regardless of
    // whether the floating button or the footer-docked one triggered it.
    effect(() => {
      if (this.store.ctiOpen()) {
        this.startLoadWatch();
      } else {
        this.clearLoadTimeout();
      }
    });
    inject(DestroyRef).onDestroy(() => this.clearLoadTimeout());
  }

  /** Reload the iframe with a fresh URL and restart the load watch. */
  retry(): void {
    this.store.bumpRetry();
    this.startLoadWatch();
  }

  onIframeLoad(): void {
    this.clearLoadTimeout();
    this.loadState.set('loaded');
  }

  onIframeError(): void {
    this.clearLoadTimeout();
    this.loadState.set('error');
  }

  private startLoadWatch(): void {
    this.loadState.set('loading');
    this.clearLoadTimeout();
    this.loadTimeoutId = setTimeout(() => {
      if (this.loadState() === 'loading') {
        this.loadState.set('error');
      }
    }, LOAD_TIMEOUT_MS);
  }

  private clearLoadTimeout(): void {
    if (this.loadTimeoutId !== null) {
      clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }
  }
}
