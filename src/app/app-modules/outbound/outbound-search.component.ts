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

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSearch } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { AuthStore } from '../core/auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { OutboundAllocateComponent } from './outbound-allocate.component';
import { OutboundCallRecord, OutboundError } from './outbound.models';
import { OutboundService } from './outbound.service';
import { RoleBucket, bucketRecords, dayRangeIso } from './outbound.util';

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring';

/** Today's *local* date as `yyyy-MM-dd` for the date-range defaults/max. */
function today(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Search and allocate unallocated outbound records (supervisor screen).
 *
 * Ported from the legacy `OutboundSearchRecordsComponent`: the supervisor picks
 * a date range, the unallocated calls are fetched (`call/outboundCallList`) and
 * bucketed by role (via the provider feature→role screen mapping). Choosing a
 * bucket opens the embedded {@link OutboundAllocateComponent} to distribute that
 * bucket's records to the role's agents.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-outbound-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, OutboundAllocateComponent],
  viewProviders: [provideIcons({ lucideSearch })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        {{ 'outbound.search.title' | translate: lang() }}
      </h1>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      <form [formGroup]="form" class="flex flex-wrap items-end gap-4" (ngSubmit)="search()">
        <div>
          <label for="search-start" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'outbound.search.startDate' | translate: lang() }}
          </label>
          <input id="search-start" type="date" [class]="selectClass" formControlName="startDate" [max]="maxDate" />
        </div>
        <div>
          <label for="search-end" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'outbound.search.endDate' | translate: lang() }}
          </label>
          <input id="search-end" type="date" [class]="selectClass" formControlName="endDate" [max]="maxDate" />
        </div>
        <button z-button type="submit" zType="default" [zLoading]="loading()">
          <ng-icon name="lucideSearch" size="16" aria-hidden="true" />
          {{ 'outbound.search.search' | translate: lang() }}
        </button>
      </form>

      @if (searched()) {
        <p class="mt-4 text-sm text-muted-foreground">
          {{ 'outbound.search.total' | translate: lang() }}:
          <strong class="text-foreground">{{ total() }}</strong>
        </p>

        <div class="mt-4 flex flex-col gap-6">
          @for (bucket of buckets(); track bucket.key) {
            <div>
              <div class="mb-2 flex items-center justify-between gap-3">
                <h2 class="text-sm font-semibold text-foreground">
                  {{ bucket.labelKey | translate: lang() }}
                  <span class="font-normal text-muted-foreground">({{ bucket.records.length }})</span>
                </h2>
                <button
                  z-button
                  type="button"
                  zType="outline"
                  zSize="sm"
                  [zDisabled]="bucket.records.length === 0 || bucket.roleID === null"
                  (click)="selectBucket(bucket)"
                >
                  {{ 'outbound.search.allocate' | translate: lang() }}
                </button>
              </div>

              <div class="overflow-x-auto rounded-md border border-border">
                <table class="w-full text-left text-sm">
                  <thead class="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" class="px-3 py-2 font-medium">
                        {{ 'outbound.col.sno' | translate: lang() }}
                      </th>
                      <th scope="col" class="px-3 py-2 font-medium">
                        {{ 'outbound.col.phone' | translate: lang() }}
                      </th>
                      <th scope="col" class="px-3 py-2 font-medium">
                        {{ 'outbound.col.benName' | translate: lang() }}
                      </th>
                      <th scope="col" class="px-3 py-2 font-medium">
                        {{ 'outbound.col.preferredDate' | translate: lang() }}
                      </th>
                      <th scope="col" class="px-3 py-2 font-medium">
                        {{ 'outbound.col.service' | translate: lang() }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of bucket.records; track row.outboundCallReqID; let i = $index) {
                      <tr class="border-t border-border align-top">
                        <td class="px-3 py-2">{{ i + 1 }}</td>
                        <td class="px-3 py-2">{{ phoneOf(row) || '—' }}</td>
                        <td class="px-3 py-2">{{ nameOf(row) || '—' }}</td>
                        <td class="px-3 py-2">
                          {{ (row.prefferedDateTime | date: 'dd/MM/yyyy') || '—' }}
                        </td>
                        <td class="px-3 py-2">{{ row.requestedFeature || '—' }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5" class="px-3 py-6 text-center text-muted-foreground">
                          {{ 'outbound.search.emptyBucket' | translate: lang() }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (selectedKey() === bucket.key) {
                <div class="mt-3">
                  <app-outbound-allocate
                    [records]="bucket.records"
                    [roleID]="bucket.roleID"
                    (allocated)="onAllocated()"
                  />
                </div>
              }
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class OutboundSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly outbound = inject(OutboundService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly selectClass = SELECT_CLASS;
  readonly maxDate = today();

  readonly form = this.fb.group({
    startDate: this.fb.control<string>(today(), { nonNullable: true }),
    endDate: this.fb.control<string>(today(), { nonNullable: true }),
  });

  readonly buckets = signal<RoleBucket[]>([]);
  readonly loading = signal(false);
  readonly searched = signal(false);
  readonly errorMessage = signal('');
  readonly selectedKey = signal<string | null>(null);

  readonly total = computed(() => this.buckets().reduce((sum, b) => sum + b.records.length, 0));

  ngOnInit(): void {
    this.search();
  }

  phoneOf(row: OutboundCallRecord): string {
    return row.beneficiary?.benPhoneMaps?.[0]?.phoneNo ?? '';
  }

  nameOf(row: OutboundCallRecord): string {
    return [row.beneficiary?.firstName, row.beneficiary?.lastName].filter((p) => !!p && p.trim().length > 0).join(' ');
  }

  selectBucket(bucket: RoleBucket): void {
    this.selectedKey.set(this.selectedKey() === bucket.key ? null : bucket.key);
  }

  onAllocated(): void {
    this.selectedKey.set(null);
    this.search();
  }

  search(): void {
    const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;
    const { startDate, endDate } = this.form.getRawValue();
    this.loading.set(true);
    this.errorMessage.set('');
    forkJoin({
      records: this.outbound.getOutboundCallList({
        providerServiceMapID,
        ...dayRangeIso(startDate, endDate),
      }),
      mapping: this.outbound.getFeatureRoleMapping(providerServiceMapID),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ records, mapping }) => {
          this.loading.set(false);
          this.searched.set(true);
          this.buckets.set(bucketRecords(records, mapping));
        },
        error: (err: OutboundError) => {
          this.loading.set(false);
          this.searched.set(true);
          this.buckets.set([]);
          this.errorMessage.set(err.errorMessage || this.i18n.instant('outbound.loadError'));
        },
      });
  }
}
