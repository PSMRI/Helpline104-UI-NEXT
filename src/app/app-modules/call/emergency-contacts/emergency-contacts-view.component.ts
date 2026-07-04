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
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { EmergencyContact, NotificationError } from './notification.models';
import { NotificationService } from './notification.service';

/**
 * Emergency-contacts view modal: shows the configured emergency contacts for the
 * agent's service so they can be relayed to the caller. Ported from the legacy
 * `EmergencyContactsViewModalComponent`. Loads on init from
 * {@link NotificationService}; emits {@link closed}.
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-emergency-contacts-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideX })],
  template: `
    <section class="rounded-lg border border-border bg-card">
      <header class="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 class="text-sm font-semibold text-foreground">
          {{ 'emergencyContacts.title' | translate: lang() }}
        </h3>
        <button
          type="button"
          class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          [attr.aria-label]="'emergencyContacts.close' | translate: lang()"
          (click)="closed.emit()"
        >
          <ng-icon name="lucideX" size="16" aria-hidden="true" />
        </button>
      </header>

      <div class="p-5">
        @if (errorMessage()) {
          <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
        }
        @if (loading()) {
          <p class="py-6 text-center text-sm text-muted-foreground">
            {{ 'emergencyContacts.loading' | translate: lang() }}
          </p>
        } @else if (contacts().length === 0) {
          <p
            class="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground"
          >
            {{ 'emergencyContacts.empty' | translate: lang() }}
          </p>
        } @else {
          <div class="overflow-x-auto rounded-md border border-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'emergencyContacts.name' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'emergencyContacts.designation' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'emergencyContacts.location' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'emergencyContacts.number' | translate: lang() }}
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (contact of contacts(); track $index) {
                  <tr class="border-t border-border align-top">
                    <td class="px-3 py-2">{{ contact.emergContactName || '—' }}</td>
                    <td class="px-3 py-2">{{ contact.designation?.designationName || '—' }}</td>
                    <td class="px-3 py-2">{{ contact.location || '—' }}</td>
                    <td class="px-3 py-2">{{ contact.emergContactNo || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
  `,
})
export class EmergencyContactsViewComponent implements OnInit {
  private readonly notification = inject(NotificationService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly closed = output<void>();

  readonly lang = this.i18n.language;
  readonly contacts = signal<EmergencyContact[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;
    this.loading.set(true);
    this.errorMessage.set('');
    this.notification
      .getEmergencyContacts(providerServiceMapID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (contacts) => {
          this.loading.set(false);
          this.contacts.set(contacts);
        },
        error: (err: NotificationError) => {
          this.loading.set(false);
          this.contacts.set([]);
          this.errorMessage.set(
            err.errorMessage || this.i18n.instant('emergencyContacts.loadError'),
          );
        },
      });
  }
}
