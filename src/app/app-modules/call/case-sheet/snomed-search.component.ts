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
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
} from 'rxjs';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLoaderCircle, lucideSearch } from '@ng-icons/lucide';

import { ZardInputDirective } from '@common-ui/ui/input';

import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SnomedService } from './snomed.service';
import { SnomedTerm } from './snomed.models';

/** Minimum characters before a search fires (legacy required `length > 2`). */
const MIN_QUERY_LENGTH = 3;
/** Debounce window for keystrokes before hitting the API, in milliseconds. */
const DEBOUNCE_MS = 300;

/** What the dropdown is currently showing. */
type SearchState = 'idle' | 'loading' | 'results' | 'empty' | 'error';

/** Result of a single (post-debounce) search attempt. */
interface SearchOutcome {
  state: Exclude<SearchState, 'loading'>;
  results: SnomedTerm[];
}

/** Process-wide counter for unique element ids across component instances. */
let instanceCounter = 0;

/**
 * Reusable SNOMED CT term search for chief complaints in the case sheet.
 *
 * The agent types a complaint; matching SNOMED CT terms are fetched from the
 * backend (debounced, with stale responses discarded) and shown in a dropdown.
 * Selecting a term emits it to the parent (the HAO case-sheet step) via
 * {@link selected} and leaves the chosen term in the input.
 *
 * Rebuilt from the legacy `cheif-complaint-snomed-search` dialog as an inline,
 * accessible combobox (ARIA listbox + keyboard navigation), OnPush + signals,
 * styled with Tailwind + ZardUI utilities (no custom CSS, no jQuery).
 */
@Component({
  selector: 'app-snomed-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe, ZardInputDirective],
  viewProviders: [provideIcons({ lucideSearch, lucideLoaderCircle })],
  host: {
    class: 'relative block',
    '(document:click)': 'onDocumentClick($event)',
  },
  template: `
    <div class="relative">
      <ng-icon
        name="lucideSearch"
        size="16"
        class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        z-input
        type="text"
        role="combobox"
        class="pl-9"
        autocomplete="off"
        [value]="query()"
        [disabled]="disabled()"
        [placeholder]="effectivePlaceholder()"
        [attr.aria-label]="'snomed.search.ariaLabel' | translate: lang()"
        [attr.aria-expanded]="isOpen()"
        aria-autocomplete="list"
        [attr.aria-controls]="isOpen() ? listboxId : null"
        [attr.aria-activedescendant]="activeDescendant()"
        (input)="onInput($event)"
        (focus)="onFocus()"
        (keydown)="onKeydown($event)"
      />
    </div>

    @if (isOpen()) {
      <div
        [id]="listboxId"
        role="listbox"
        [attr.aria-label]="'snomed.search.ariaLabel' | translate: lang()"
        class="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
      >
        @switch (state()) {
          @case ('loading') {
            <div
              class="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground"
            >
              <ng-icon
                name="lucideLoaderCircle"
                size="16"
                class="animate-spin"
                aria-hidden="true"
              />
              {{ 'snomed.search.loading' | translate: lang() }}
            </div>
          }
          @case ('results') {
            @for (item of results(); track item.conceptID; let i = $index) {
              <button
                type="button"
                role="option"
                tabindex="-1"
                [id]="optionId(i)"
                [attr.aria-selected]="i === activeIndex()"
                class="flex w-full flex-col items-start gap-0.5 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                [class.bg-accent]="i === activeIndex()"
                [class.text-accent-foreground]="i === activeIndex()"
                (mouseenter)="activeIndex.set(i)"
                (click)="select(item)"
              >
                <span class="font-medium">{{ item.term }}</span>
                <span class="font-mono text-xs text-muted-foreground">
                  {{ 'snomed.search.conceptId' | translate: lang() }}:
                  {{ item.conceptID }}
                </span>
              </button>
            }
          }
          @case ('empty') {
            <div class="px-3 py-2 text-sm text-muted-foreground">
              {{ 'snomed.search.empty' | translate: lang() }}
            </div>
          }
          @case ('error') {
            <div class="px-3 py-2 text-sm text-destructive" role="alert">
              {{ 'snomed.search.error' | translate: lang() }}
            </div>
          }
          @default {
            <div class="px-3 py-2 text-sm text-muted-foreground">
              {{ 'snomed.search.hint' | translate: lang() }}
            </div>
          }
        }
      </div>
    }
  `,
})
export class SnomedSearchComponent {
  private readonly i18n = inject(I18nService);
  private readonly snomed = inject(SnomedService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Disable the input (e.g. while the parent form is submitting). */
  readonly disabled = input(false);
  /** Optional placeholder override; falls back to the localized default. */
  readonly placeholder = input('');

  /** Emits the SNOMED CT term the agent selects. */
  readonly selected = output<SnomedTerm>();

  readonly lang = this.i18n.language;

  private readonly uid = instanceCounter++;
  readonly listboxId = `snomed-listbox-${this.uid}`;

  /** The text in the input (drives display; the API sees the trimmed value). */
  readonly query = signal('');
  readonly results = signal<SnomedTerm[]>([]);
  readonly state = signal<SearchState>('idle');
  readonly isOpen = signal(false);
  /** Index of the keyboard-highlighted option, or -1 when none. */
  readonly activeIndex = signal(-1);

  readonly effectivePlaceholder = computed(
    () => this.placeholder() || this.i18n.instant('snomed.search.placeholder'),
  );

  /** id of the active option for `aria-activedescendant` (null when none). */
  readonly activeDescendant = computed(() => {
    const i = this.activeIndex();
    return this.state() === 'results' && i >= 0 ? this.optionId(i) : null;
  });

  /** Pushes each (trimmed) keystroke into the debounced search pipeline. */
  private readonly queries = new Subject<string>();

  constructor() {
    this.queries
      .pipe(
        debounceTime(DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((term) => {
          if (term.length < MIN_QUERY_LENGTH) {
            return of<SearchOutcome>({ state: 'idle', results: [] });
          }
          this.state.set('loading');
          return this.snomed.search(term).pipe(
            map(
              (results): SearchOutcome => ({
                state: results.length > 0 ? 'results' : 'empty',
                results,
              }),
            ),
            // A failed search shows the error row rather than tearing down the
            // stream, so later keystrokes still search.
            catchError(() => of<SearchOutcome>({ state: 'error', results: [] })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((outcome) => this.applyOutcome(outcome));
  }

  onFocus(): void {
    // Re-open only when there is something to show; after a selection the list
    // is cleared, so focusing the (now-populated) input does not re-surface a
    // stale result set.
    if (this.results().length > 0) {
      this.isOpen.set(true);
    }
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.isOpen.set(true);
    this.activeIndex.set(-1);
    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      // Too short to search: show the hint and cancel any pending results.
      this.results.set([]);
      this.state.set('idle');
    }
    this.queries.next(trimmed);
  }

  onKeydown(event: KeyboardEvent): void {
    const options = this.state() === 'results' ? this.results() : [];
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.isOpen.set(true);
        if (options.length > 0) {
          this.activeIndex.update((i) => (i + 1) % options.length);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (options.length > 0) {
          this.activeIndex.update((i) => (i <= 0 ? options.length - 1 : i - 1));
        }
        break;
      case 'Enter': {
        const i = this.activeIndex();
        if (this.isOpen() && i >= 0 && i < options.length) {
          event.preventDefault();
          this.select(options[i]);
        }
        break;
      }
      case 'Escape':
        this.close();
        break;
      default:
        break;
    }
  }

  select(item: SnomedTerm): void {
    this.query.set(item.term);
    this.selected.emit(item);
    this.close();
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  optionId(index: number): string {
    return `snomed-opt-${this.uid}-${index}`;
  }

  private applyOutcome(outcome: SearchOutcome): void {
    this.results.set(outcome.results);
    this.state.set(outcome.state);
    this.activeIndex.set(-1);
  }

  private close(): void {
    this.isOpen.set(false);
    this.activeIndex.set(-1);
    this.results.set([]);
    this.state.set('idle');
  }
}
