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
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/**
 * Disease-summary "contents" modal: shows the selected disease-summary items as
 * removable chips. Removing empties the list; closing returns the (possibly
 * trimmed) list to the parent via {@link closed}. Pure display — input-driven,
 * no HTTP.
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-view-disease-summary-contents',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideX })],
  template: `
    <section class="rounded-lg border border-border bg-card">
      <header class="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 class="text-sm font-semibold text-foreground">
          {{ 'diseaseSummary.contentsTitle' | translate: lang() }}
        </h3>
        <button
          type="button"
          class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          [attr.aria-label]="'diseaseSummary.close' | translate: lang()"
          (click)="close()"
        >
          <ng-icon name="lucideX" size="16" aria-hidden="true" />
        </button>
      </header>

      <div class="p-5">
        @if (items().length === 0) {
          <p class="text-sm text-muted-foreground">{{ 'diseaseSummary.empty' | translate: lang() }}</p>
        } @else {
          <div class="flex flex-wrap gap-2">
            @for (item of items(); track $index; let i = $index) {
              <span class="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-3 py-1 text-sm">
                {{ item }}
                <button
                  type="button"
                  class="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                  [attr.aria-label]="'diseaseSummary.remove' | translate: lang()"
                  (click)="remove(i)"
                >
                  <ng-icon name="lucideX" size="12" aria-hidden="true" />
                </button>
              </span>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class ViewDiseaseSummaryContentsComponent {
  private readonly i18n = inject(I18nService);

  /** The disease-summary items to show as chips. */
  readonly summaryDetails = input<string[]>([]);

  /** Emits the (possibly trimmed) list when the modal is closed. */
  readonly closed = output<string[]>();

  readonly lang = this.i18n.language;

  /** Local editable copy; resets if the input changes. */
  readonly items = linkedSignal(() => this.summaryDetails());

  remove(index: number): void {
    this.items.update((list) => list.filter((_, i) => i !== index));
    // Legacy auto-closes once the last chip is removed.
    if (this.items().length === 0) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit(this.items());
  }
}
