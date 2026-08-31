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

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideStar, lucideX } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { LOGIN_ROUTE } from '../core/core.constants';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslationKey } from '../core/i18n/locales';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { FeedbackCategory } from './feedback.models';
import { FeedbackService } from './feedback.service';

const MAX_COMMENT_LENGTH = 2000;

/** A star rating option (value 1-5 with its label key). */
interface RatingOption {
  readonly value: number;
  readonly labelKey: TranslationKey;
}

const RATING_OPTIONS: readonly RatingOption[] = [
  { value: 1, labelKey: 'feedback.ratingTerrible' },
  { value: 2, labelKey: 'feedback.ratingBad' },
  { value: 3, labelKey: 'feedback.ratingOkay' },
  { value: 4, labelKey: 'feedback.ratingGood' },
  { value: 5, labelKey: 'feedback.ratingGreat' },
];

/**
 * Post-logout feedback survey, reached from the dashboard logout / footer
 * feedback links (`/feedback?sl=104`). The session has already been cleared, so
 * feedback is anonymous. Submitting or closing returns to login.
 */
@Component({
  selector: 'app-feedback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgIcon, ZardButtonComponent, ZardInputDirective, TranslatePipe],
  viewProviders: [provideIcons({ lucideStar, lucideX })],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <section
        class="relative w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg"
      >
        <button
          z-button
          type="button"
          zType="ghost"
          zSize="icon"
          class="absolute right-2 top-2"
          [attr.aria-label]="'feedback.close' | translate: lang()"
          (click)="close()"
        >
          <ng-icon name="lucideX" size="18" aria-hidden="true" />
        </button>

        <header class="mb-4 text-center">
          <h1 class="text-xl font-semibold">
            {{ 'feedback.loggedOut' | translate: lang() }}
          </h1>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ 'feedback.subtitle' | translate: lang() }}
          </p>
        </header>

        <div
          class="mb-5 flex justify-center gap-3"
          role="radiogroup"
          [attr.aria-label]="'feedback.rateAria' | translate: lang()"
        >
          @for (option of ratings; track option.value) {
            <button
              type="button"
              class="flex w-14 flex-col items-center gap-1 rounded-md py-2 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              role="radio"
              [attr.aria-checked]="rating() === option.value"
              [attr.aria-label]="option.labelKey | translate: lang()"
              [ngClass]="option.value <= rating() ? 'text-warning' : 'text-muted-foreground'"
              (click)="selectRating(option.value)"
            >
              <ng-icon name="lucideStar" size="28" [class.fill-current]="option.value <= rating()" aria-hidden="true" />
              <span class="text-xs">{{ option.labelKey | translate: lang() }}</span>
            </button>
          }
        </div>

        <div class="mb-4">
          <label class="mb-1 block text-sm font-medium" for="feedback-category">
            {{ 'feedback.category' | translate: lang() }}
          </label>
          <select
            id="feedback-category"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            [value]="category()"
            [disabled]="categoriesLoading()"
            (change)="onCategoryChange($event)"
          >
            <option value="" disabled>
              {{ 'feedback.selectCategory' | translate: lang() }}
            </option>
            @for (cat of categories(); track cat.categoryId) {
              <option [value]="cat.slug">{{ cat.label }}</option>
            }
          </select>
          @if (categoriesError()) {
            <p class="mt-1 text-xs text-destructive" role="alert">{{ categoriesError() }}</p>
          }
        </div>

        <div class="mb-4">
          <textarea
            z-input
            rows="4"
            class="w-full resize-none"
            [attr.maxlength]="maxCommentLength"
            [placeholder]="'feedback.commentPlaceholder' | translate: lang()"
            (input)="onCommentInput($event)"
          ></textarea>
          <p class="mt-1 text-right text-xs text-muted-foreground">{{ comment().length }} / {{ maxCommentLength }}</p>
        </div>

        <p class="mb-4 text-xs text-muted-foreground">
          {{ 'feedback.anonymousNote' | translate: lang() }}
        </p>

        @if (submitError()) {
          <p class="mb-3 text-xs text-destructive" role="alert">{{ submitError() }}</p>
        }

        <div class="flex justify-end gap-2">
          <button z-button type="button" zType="outline" (click)="close()">
            {{ 'feedback.close' | translate: lang() }}
          </button>
          <button z-button type="button" [zDisabled]="!canSubmit() || submitting()" (click)="submit()">
            {{ 'feedback.okay' | translate: lang() }}
          </button>
        </div>
      </section>
    </div>
  `,
})
export class FeedbackComponent {
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly feedbackService = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly ratings = RATING_OPTIONS;
  readonly maxCommentLength = MAX_COMMENT_LENGTH;

  readonly rating = signal(0);
  readonly category = signal('');
  readonly comment = signal('');

  readonly categories = signal<FeedbackCategory[]>([]);
  readonly categoriesLoading = signal(false);
  readonly categoriesError = signal('');

  readonly submitting = signal(false);
  readonly submitError = signal('');

  /** Okay is enabled only once a star rating has been chosen. */
  readonly canSubmit = computed(() => this.rating() > 0);

  constructor() {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.categoriesLoading.set(true);
    this.categoriesError.set('');
    this.feedbackService
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          this.categoriesLoading.set(false);
          this.categories.set(categories);
        },
        error: (err: { errorMessage?: string }) => {
          this.categoriesLoading.set(false);
          this.categories.set([]);
          this.categoriesError.set(err.errorMessage || this.i18n.instant('feedback.categoriesError'));
        },
      });
  }

  selectRating(value: number): void {
    this.rating.set(value);
  }

  onCategoryChange(event: Event): void {
    this.category.set((event.target as HTMLSelectElement).value);
  }

  onCommentInput(event: Event): void {
    this.comment.set((event.target as HTMLTextAreaElement).value);
  }

  submit(): void {
    if (!this.canSubmit() || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.submitError.set('');
    this.feedbackService
      .submit(this.rating(), this.category(), this.comment())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigate([LOGIN_ROUTE]);
        },
        error: (err: { errorMessage?: string }) => {
          this.submitting.set(false);
          this.submitError.set(err.errorMessage || this.i18n.instant('feedback.submitError'));
        },
      });
  }

  close(): void {
    void this.router.navigate([LOGIN_ROUTE]);
  }
}
