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

import { NgTemplateOutlet } from '@angular/common';
import { CdkStepper } from '@angular/cdk/stepper';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  signal,
  viewChildren,
} from '@angular/core';

/**
 * Custom Angular CDK stepper for the HAO workspace.
 *
 * Replaces the legacy `104-hao` Bootstrap carousel-as-wizard: the `#myCarousel`
 * slides, the `bs-wizard` dot strip, and the 74 imperative jQuery
 * `.carousel()` / `active-tab` toggles. The progress strip below is driven by
 * the stepper's own `steps` / `selectedIndex` state instead of hand-toggled DOM
 * classes, and the selected step's content is rendered through `ngTemplateOutlet`
 * rather than carousel transitions.
 *
 * The CDK's built-in `FocusKeyManager` only manages headers carrying the
 * `cdkStepHeader` directive, which it collects via a `ContentChildren` query —
 * incompatible with a stepper that renders its dots in its own view template
 * (the same trade-off as the official CDK custom-stepper example). So this
 * component implements the WAI-ARIA roving-focus keyboard contract directly:
 * roving `tabindex`, Arrow/Home/End focus movement across the selectable steps,
 * and native Enter/Space activation via the underlying `<button>`.
 *
 * Used declaratively:
 * ```html
 * <hao-stepper [linear]="true" (selectionChange)="onStep($event)">
 *   <cdk-step [label]="..."> ...content... </cdk-step>
 *   <cdk-step [label]="..." [completed]="..."> ...content... </cdk-step>
 * </hao-stepper>
 * ```
 */
@Component({
  selector: 'hao-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  // Lets nested <cdk-step> elements register with this component as their stepper.
  providers: [{ provide: CdkStepper, useExisting: HaoStepperComponent }],
  template: `
    <nav
      class="flex items-center justify-center gap-2 px-2 py-4 sm:gap-4"
      role="tablist"
      aria-label="Workspace steps"
    >
      @for (step of steps; track step; let i = $index; let last = $last) {
        <button
          #header
          type="button"
          role="tab"
          class="group flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          [class.cursor-pointer]="isStepSelectable(i)"
          [class.cursor-not-allowed]="!isStepSelectable(i)"
          [class.text-primary]="i === selectedIndex"
          [class.text-muted-foreground]="i !== selectedIndex"
          [disabled]="!isStepSelectable(i)"
          [attr.tabindex]="i === focusedIndex() ? 0 : -1"
          [attr.aria-selected]="i === selectedIndex"
          [attr.aria-current]="i === selectedIndex ? 'step' : null"
          (click)="onHeaderClick(i)"
          (keydown)="onHeaderKeydown($event, i)"
        >
          <span
            class="flex h-7 w-7 items-center justify-center rounded-full border text-xs"
            [class.border-primary]="i <= selectedIndex"
            [class.bg-primary]="i < selectedIndex"
            [class.text-primary-foreground]="i < selectedIndex"
            [class.border-border]="i > selectedIndex"
          >
            {{ i + 1 }}
          </span>
          <span class="hidden sm:inline">{{ step.label }}</span>
        </button>

        @if (!last) {
          <span
            class="h-px w-8 sm:w-16"
            [class.bg-primary]="i < selectedIndex"
            [class.bg-border]="i >= selectedIndex"
            aria-hidden="true"
          ></span>
        }
      }
    </nav>

    <div [ngTemplateOutlet]="selected ? selected.content : null"></div>
  `,
})
export class HaoStepperComponent extends CdkStepper {
  private readonly headerButtons =
    viewChildren<ElementRef<HTMLButtonElement>>('header');

  /** Header that currently holds the roving tabindex (focus target). */
  readonly focusedIndex = signal(0);

  /** Select a step directly from its header (the wizard dot). */
  onHeaderClick(index: number): void {
    if (this.isStepSelectable(index)) {
      this.selectedIndex = index;
      this.focusedIndex.set(index);
    }
  }

  /** WAI-ARIA roving-focus keyboard navigation across the step headers. */
  onHeaderKeydown(event: KeyboardEvent, index: number): void {
    let target: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        target = this.nextSelectable(index, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        target = this.nextSelectable(index, -1);
        break;
      case 'Home':
        target = this.nextSelectable(-1, 1);
        break;
      case 'End':
        target = this.nextSelectable(this.steps.length, -1);
        break;
      default:
        return;
    }
    if (target !== null) {
      event.preventDefault();
      this.focusedIndex.set(target);
      this.headerButtons()[target]?.nativeElement.focus();
    }
  }

  /**
   * Whether a header may be clicked/focused. In linear mode the agent may
   * revisit the current and earlier steps but cannot skip ahead to an unreached
   * step (matching the legacy "Provide Service → Closure" gating).
   */
  isStepSelectable(index: number): boolean {
    return !this.linear || index <= this.selectedIndex;
  }

  /** First selectable header index from `from`, moving in `step` direction. */
  private nextSelectable(from: number, step: number): number | null {
    for (let i = from + step; i >= 0 && i < this.steps.length; i += step) {
      if (this.isStepSelectable(i)) {
        return i;
      }
    }
    return null;
  }
}
