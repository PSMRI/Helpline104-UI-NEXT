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
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFileText } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CallStore } from '../../call.store';
import { SioError } from '../shared/sio-api';
import { SchemeService } from './scheme.service';
import { Scheme, SchemeSearchRow } from './scheme.models';

/**
 * Health Scheme lookup service tab. Unlike the other SIO tabs this has no
 * data-entry form: it lists the configured health schemes with a reference
 * document link. Opening a scheme's document records a search-history entry
 * (the beneficiary "avails" the scheme) and marks the call service-availed;
 * prior lookups for the beneficiary are listed below.
 *
 * Ported (inbound-focused) from the legacy scheme lookup flow. Standalone,
 * OnPush + signals, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-sio-scheme',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideFileText })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon name="lucideFileText" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-foreground">{{ 'sio.scheme.title' | translate: lang() }}</h3>
      </header>

      @if (!hasContext()) {
        <p class="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          {{ 'sio.common.noContext' | translate: lang() }}
        </p>
      } @else {
        @if (errorMessage()) {
          <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
        }

        @if (schemes().length === 0) {
          <p class="text-sm text-muted-foreground">{{ 'sio.scheme.noSchemes' | translate: lang() }}</p>
        } @else {
          <div class="overflow-x-auto rounded-md border border-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th class="px-3 py-2 font-medium">{{ 'sio.scheme.name' | translate: lang() }}</th>
                  <th class="px-3 py-2 font-medium">{{ 'sio.common.description' | translate: lang() }}</th>
                  <th class="px-3 py-2 font-medium">{{ 'sio.scheme.document' | translate: lang() }}</th>
                </tr>
              </thead>
              <tbody>
                @for (scheme of schemes(); track scheme.schemeID) {
                  <tr class="border-t border-border align-top">
                    <td class="px-3 py-2">{{ scheme.schemeName || '—' }}</td>
                    <td class="px-3 py-2">{{ scheme.schemeDesc || '—' }}</td>
                    <td class="px-3 py-2">
                      @if (scheme.kmFilePath) {
                        <a
                          [href]="scheme.kmFilePath"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="font-medium text-primary underline"
                          (click)="markAvailed(scheme)"
                        >
                          {{ scheme.kmFileManager?.fileName || ('sio.scheme.view' | translate: lang()) }}
                        </a>
                      } @else {
                        —
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <div class="mt-6">
          <h4 class="mb-2 text-sm font-medium text-foreground">{{ 'sio.common.history' | translate: lang() }}</h4>
          @if (history().length === 0) {
            <p class="text-sm text-muted-foreground">{{ 'sio.common.noHistory' | translate: lang() }}</p>
          } @else {
            <div class="overflow-x-auto rounded-md border border-border">
              <table class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th class="px-3 py-2 font-medium">{{ 'sio.scheme.name' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.scheme.availedDate' | translate: lang() }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of history(); track $index) {
                    <tr class="border-t border-border align-top">
                      <td class="px-3 py-2">{{ row.scheme?.schemeName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.createdDate || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class SchemeServiceComponent implements OnInit {
  private readonly scheme = inject(SchemeService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted after a scheme is availed (marks the call service-availed). */
  readonly serviceProvided = output<void>();

  readonly lang = this.i18n.language;

  readonly schemes = signal<Scheme[]>([]);
  readonly history = signal<SchemeSearchRow[]>([]);
  readonly errorMessage = signal('');

  readonly hasContext = computed(() => this.callStore.beneficiaryId() !== null);

  ngOnInit(): void {
    if (!this.hasContext()) {
      return;
    }
    const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;

    this.scheme
      .getSchemes(providerServiceMapID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.schemes.set(list),
        error: (err: SioError) => this.setError(err),
      });

    this.loadHistory();
  }

  /** Records the lookup for the scheme's document; the link still opens on its own. */
  markAvailed(scheme: Scheme): void {
    this.scheme
      .saveSearch({
        beneficiaryRegID: this.callStore.beneficiaryId(),
        benCallID: this.callStore.callId(),
        schemeID: scheme.schemeID,
        providerServiceMapID: this.authStore.currentRole()?.providerServiceMapID ?? null,
        createdBy: this.authStore.user()?.userName ?? '',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          toast.success(this.i18n.instant('sio.common.saved'));
          this.serviceProvided.emit();
          this.loadHistory();
        },
        error: (err: SioError) => {
          const msg = err.errorMessage || this.i18n.instant('sio.common.saveError');
          this.errorMessage.set(msg);
          toast.error(msg);
        },
      });
  }

  private loadHistory(): void {
    this.scheme
      .getHistory(this.callStore.beneficiaryId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (rows) => this.history.set(rows), error: () => this.history.set([]) });
  }

  private setError(err: SioError): void {
    this.errorMessage.set(err.errorMessage || this.i18n.instant('sio.common.loadError'));
  }
}
