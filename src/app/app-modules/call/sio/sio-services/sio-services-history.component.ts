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

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHistory } from '@ng-icons/lucide';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { CallStore } from '../../call.store';
import { SioError } from '../shared/sio-api';
import { SioServicesHistoryService } from './sio-services.service';
import {
  BloodRequestHistoryRow,
  EpidemicHistoryRow,
  FoodSafetyHistoryRow,
  OrganDonationHistoryRow,
  SioHistoryData,
} from './sio-services.models';

/**
 * Consolidated, read-only SIO service history for the active beneficiary — the
 * beneficiary's prior blood / epidemic / food-safety / organ-donation records,
 * one table per service. Ported from the legacy `SioServicesHistoryComponent`
 * (its accordion of four tables) into a flat, signal-driven view.
 *
 * Standalone, OnPush + signals, ZardUI + Tailwind only. Read-only: no forms.
 */
@Component({
  selector: 'app-sio-services-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIcon, TranslatePipe],
  viewProviders: [provideIcons({ lucideHistory })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon name="lucideHistory" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-foreground">{{ 'sio.services.historyTitle' | translate: lang() }}</h3>
      </header>

      @if (!hasContext()) {
        <p class="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          {{ 'sio.common.noContext' | translate: lang() }}
        </p>
      } @else {
        @if (errorMessage()) {
          <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
        }

        @if (isEmpty()) {
          <p class="text-sm text-muted-foreground">{{ 'sio.common.noHistory' | translate: lang() }}</p>
        }

        <!-- Blood requests -->
        @if (bloodRequests().length > 0) {
          <div class="mb-6">
            <h4 class="mb-2 text-sm font-medium text-foreground">
              {{ 'sio.services.bloodRequests' | translate: lang() }}
            </h4>
            <div class="overflow-x-auto rounded-md border border-border">
              <table class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th class="px-3 py-2 font-medium">{{ 'sio.common.name' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.common.age' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.services.request' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.services.hospital' | translate: lang() }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of bloodRequests(); track $index) {
                    <tr class="border-t border-border align-top">
                      <td class="px-3 py-2">{{ row.recipientName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.recipientAge ?? '—' }}</td>
                      <td class="px-3 py-2">{{ row.typeOfRequest || '—' }}</td>
                      <td class="px-3 py-2">{{ row.hospitalAdmitted || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- Epidemic outbreak -->
        @if (epidemicComplaints().length > 0) {
          <div class="mb-6">
            <h4 class="mb-2 text-sm font-medium text-foreground">
              {{ 'sio.services.epidemicComplaints' | translate: lang() }}
            </h4>
            <div class="overflow-x-auto rounded-md border border-border">
              <table class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th class="px-3 py-2 font-medium">{{ 'sio.epidemic.nature' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.epidemic.peopleAffected' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.common.district' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.common.subDistrict' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.common.remarks' | translate: lang() }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of epidemicComplaints(); track $index) {
                    <tr class="border-t border-border align-top">
                      <td class="px-3 py-2">{{ row.natureOfComplaint || '—' }}</td>
                      <td class="px-3 py-2">{{ row.totalPeopleAffected ?? '—' }}</td>
                      <td class="px-3 py-2">{{ row.m_district?.districtName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.m_districtblock?.blockName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.remarks || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- Food safety -->
        @if (foodComplaints().length > 0) {
          <div class="mb-6">
            <h4 class="mb-2 text-sm font-medium text-foreground">
              {{ 'sio.services.foodComplaints' | translate: lang() }}
            </h4>
            <div class="overflow-x-auto rounded-md border border-border">
              <table class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th class="px-3 py-2 font-medium">{{ 'sio.services.request' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.food.historyOfDiet' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.food.typeOfFood' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.food.foodConsumedFrom' | translate: lang() }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of foodComplaints(); track $index) {
                    <tr class="border-t border-border align-top">
                      <td class="px-3 py-2">{{ row.typeOfRequest || '—' }}</td>
                      <td class="px-3 py-2">{{ row.historyOfDiet || '—' }}</td>
                      <td class="px-3 py-2">{{ row.typeOfFood || '—' }}</td>
                      <td class="px-3 py-2">{{ row.foodConsumedFrom || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- Organ donation -->
        @if (organRequests().length > 0) {
          <div>
            <h4 class="mb-2 text-sm font-medium text-foreground">
              {{ 'sio.services.organRequests' | translate: lang() }}
            </h4>
            <div class="overflow-x-auto rounded-md border border-border">
              <table class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th class="px-3 py-2 font-medium">{{ 'sio.organ.donationType' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.organ.organ' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'sio.common.remarks' | translate: lang() }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of organRequests(); track $index) {
                    <tr class="border-t border-border align-top">
                      <td class="px-3 py-2">{{ row.m_donationType?.donationType || '—' }}</td>
                      <td class="px-3 py-2">{{ row.m_donatableOrgan?.donatableOrgan || '—' }}</td>
                      <td class="px-3 py-2">{{ row.remarks || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }
    </section>
  `,
})
export class SioServicesHistoryComponent implements OnInit {
  private readonly history = inject(SioServicesHistoryService);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;

  private readonly data = signal<SioHistoryData>({});
  readonly errorMessage = signal('');

  readonly bloodRequests = computed<BloodRequestHistoryRow[]>(() => this.data().t_bloodRequest ?? []);
  readonly epidemicComplaints = computed<EpidemicHistoryRow[]>(() => this.data().t_epidemicOutbreak ?? []);
  readonly foodComplaints = computed<FoodSafetyHistoryRow[]>(() => this.data().t_foodSafetyCopmlaint ?? []);
  readonly organRequests = computed<OrganDonationHistoryRow[]>(() => this.data().t_organDonation ?? []);

  readonly hasContext = computed(() => this.callStore.beneficiaryId() !== null);
  readonly isEmpty = computed(
    () =>
      this.bloodRequests().length === 0 &&
      this.epidemicComplaints().length === 0 &&
      this.foodComplaints().length === 0 &&
      this.organRequests().length === 0,
  );

  ngOnInit(): void {
    if (!this.hasContext()) {
      return;
    }
    this.history
      .getHistory(this.callStore.beneficiaryId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.data.set(data),
        error: (err: SioError) => this.errorMessage.set(err.errorMessage || this.i18n.instant('sio.common.loadError')),
      });
  }
}
