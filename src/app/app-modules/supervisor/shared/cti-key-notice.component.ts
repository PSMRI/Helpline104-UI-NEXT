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

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { CzentrixService } from '../../core/services/czentrix.service';

/**
 * Shown by the supervisor screens that embed CZentrix's console when no login
 * key was captured at portal login. Explains the missing key and offers a
 * Retry that re-requests it through {@link CzentrixService.refreshLoginKey};
 * the host screen's `screenUrl` recomputes from the service's `loginKey`
 * signal, so a successful retry swaps this notice for the iframe on its own.
 */
@Component({
  selector: 'app-cti-key-notice',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, ZardButtonComponent],
  template: `
    <div class="flex flex-col items-center gap-3 py-8 text-center" role="alert">
      <p class="text-sm text-muted-foreground">{{ 'supervisor.ctiKey.missing' | translate: lang() }}</p>
      @if (retryFailed()) {
        <p class="text-sm font-medium text-destructive">{{ 'supervisor.ctiKey.retryFailed' | translate: lang() }}</p>
      }
      <button z-button type="button" zType="outline" [zLoading]="retrying()" [zDisabled]="retrying()" (click)="retry()">
        {{ 'supervisor.ctiKey.retry' | translate: lang() }}
      </button>
    </div>
  `,
})
export class CtiKeyNoticeComponent {
  private readonly czentrix = inject(CzentrixService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly retrying = signal(false);
  readonly retryFailed = signal(false);

  retry(): void {
    if (this.retrying()) {
      return;
    }
    this.retrying.set(true);
    this.retryFailed.set(false);
    this.czentrix
      .refreshLoginKey()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => {
        this.retrying.set(false);
        this.retryFailed.set(status !== 'ok');
      });
  }
}
