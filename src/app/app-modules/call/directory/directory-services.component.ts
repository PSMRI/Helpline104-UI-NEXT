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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBookMarked, lucideSearch } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { AuthStore } from '../../core/auth/auth.store';
import { CallStore } from '../call.store';
import { BeneficiaryService } from '../beneficiary/beneficiary.service';
import { DistrictOption, StateOption } from '../beneficiary/beneficiary.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { DirectoryService } from './directory.service';
import {
  DirectoryError,
  DirectoryHistoryRow,
  DirectoryItem,
  InstituteResult,
  SubDirectoryItem,
} from './directory.models';

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring';

/** Sub-service name fragments to match per role feature (legacy mapping). */
const SUB_SERVICE_BY_FEATURE: Record<string, string[]> = {
  HAO: ['Health'],
  CO: ['Counselling'],
  MO: ['Medical'],
  SIO: ['Blood', 'Organ'],
};

/**
 * Directory / institute-information lookup tab. The agent narrows by location
 * (state → district) and directory type →
 * sub-directory, searches for matching institutes, and sees the results plus a
 * running search history. Ported from the legacy `DirectoryServicesComponent`.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only. Only
 * state + district are sent to the backend (matching legacy), so the state
 * cascade reuses BeneficiaryService for districts; SMS-out of results is a
 * separate concern (SmsTemplateService) and is intentionally not included here.
 */
@Component({
  selector: 'app-directory-services',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent],
  viewProviders: [provideIcons({ lucideBookMarked, lucideSearch })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon name="lucideBookMarked" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-foreground">
          {{ 'directory.title' | translate: lang() }}
        </h3>
      </header>

      @if (!hasContext()) {
        <p class="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          {{ 'directory.noContext' | translate: lang() }}
        </p>
      } @else {
        @if (errorMessage()) {
          <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
        }

        <form [formGroup]="form" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label for="dir-state" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'directory.state' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="dir-state" [class]="selectClass" formControlName="stateID" (change)="onStateChange()">
              <option [ngValue]="null" disabled>{{ 'directory.select' | translate: lang() }}</option>
              @for (s of states(); track s.stateID) {
                <option [ngValue]="s.stateID">{{ s.stateName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="dir-district" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'directory.district' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="dir-district" [class]="selectClass" formControlName="districtID">
              <option [ngValue]="null" disabled>{{ 'directory.select' | translate: lang() }}</option>
              @for (d of districts(); track d.districtID) {
                <option [ngValue]="d.districtID">{{ d.districtName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="dir-directory" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'directory.information' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="dir-directory" [class]="selectClass" formControlName="instituteDirectoryID" (change)="onDirectoryChange()">
              <option [ngValue]="null" disabled>{{ 'directory.select' | translate: lang() }}</option>
              @for (d of directoryList(); track d.instituteDirectoryID) {
                <option [ngValue]="d.instituteDirectoryID">{{ d.instituteDirectoryName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="dir-subdirectory" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'directory.subDirectory' | translate: lang() }} <span class="text-destructive">*</span>
            </label>
            <select id="dir-subdirectory" [class]="selectClass" formControlName="instituteSubDirectoryID">
              <option [ngValue]="null" disabled>{{ 'directory.select' | translate: lang() }}</option>
              @for (s of subDirectoryList(); track s.instituteSubDirectoryID) {
                <option [ngValue]="s.instituteSubDirectoryID">{{ s.instituteSubDirectoryName }}</option>
              }
            </select>
          </div>
        </form>

        <div class="mt-4">
          <button z-button type="button" zType="default" [zLoading]="searching()" [zDisabled]="form.invalid || searching()" (click)="search()">
            <ng-icon name="lucideSearch" size="16" aria-hidden="true" />
            {{ 'directory.search' | translate: lang() }}
          </button>
        </div>

        <!-- Search results -->
        @if (searched()) {
          <div class="mt-5">
            @if (results().length === 0) {
              <p class="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                {{ 'directory.noResults' | translate: lang() }}
              </p>
            } @else {
              <ul class="flex flex-col gap-2">
                @for (r of results(); track $index) {
                  <li class="rounded-md border border-border p-3 text-sm">
                    <p class="font-medium text-foreground">{{ r.institute?.institutionName || '—' }}</p>
                    @if (r.institute?.address) {
                      <p class="text-muted-foreground">{{ r.institute?.address }}</p>
                    }
                    @if (contactLine(r); as contact) {
                      <p class="text-muted-foreground">{{ contact }}</p>
                    }
                  </li>
                }
              </ul>
            }
          </div>
        }

        <!-- Search history -->
        <div class="mt-6">
          <h4 class="mb-2 text-sm font-medium text-foreground">
            {{ 'directory.history' | translate: lang() }}
          </h4>
          @if (history().length === 0) {
            <p class="text-sm text-muted-foreground">{{ 'directory.noHistory' | translate: lang() }}</p>
          } @else {
            <div class="overflow-x-auto rounded-md border border-border">
              <table class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th class="px-3 py-2 font-medium">{{ 'directory.colDirectory' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'directory.colSubDirectory' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'directory.colInstitution' | translate: lang() }}</th>
                    <th class="px-3 py-2 font-medium">{{ 'directory.colAddress' | translate: lang() }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of history(); track $index) {
                    <tr class="border-t border-border align-top">
                      <td class="px-3 py-2">{{ row.instituteDirectory?.instituteDirectoryName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.instituteSubDirectory?.instituteSubDirectoryName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.institute?.institutionName || '—' }}</td>
                      <td class="px-3 py-2">{{ row.institute?.address || '—' }}</td>
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
export class DirectoryServicesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly directory = inject(DirectoryService);
  private readonly beneficiary = inject(BeneficiaryService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitted after a successful search (mirrors the legacy `referralServiceProvided`). */
  readonly serviceProvided = output<void>();

  readonly lang = this.i18n.language;
  readonly selectClass = SELECT_CLASS;

  readonly states = signal<StateOption[]>([]);
  readonly districts = signal<DistrictOption[]>([]);
  readonly directoryList = signal<DirectoryItem[]>([]);
  readonly subDirectoryList = signal<SubDirectoryItem[]>([]);
  readonly results = signal<InstituteResult[]>([]);
  readonly history = signal<DirectoryHistoryRow[]>([]);
  readonly searching = signal(false);
  readonly searched = signal(false);
  readonly errorMessage = signal('');

  /** Resolved `serviceID1097` for the current role (from the sub-services). */
  private readonly subServiceID = signal<number | null>(null);

  readonly form = this.fb.group({
    stateID: this.fb.control<number | null>(null, Validators.required),
    districtID: this.fb.control<number | null>(null, Validators.required),
    instituteDirectoryID: this.fb.control<number | null>(null, Validators.required),
    instituteSubDirectoryID: this.fb.control<number | null>(null, Validators.required),
  });

  readonly hasContext = computed(() => this.callStore.beneficiaryId() !== null);

  ngOnInit(): void {
    if (!this.hasContext()) {
      return;
    }
    const role = this.authStore.currentRole();

    this.beneficiary
      .getProviderStates(role?.serviceProviderID ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (states) => this.states.set(states),
        error: (err: DirectoryError) => this.setError(err),
      });

    this.directory
      .getDirectoryList(role?.providerServiceMapID ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.directoryList.set(list),
        error: (err: DirectoryError) => this.setError(err),
      });

    this.directory
      .getServices(role?.providerServiceMapID ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (services) => {
          const fragments = SUB_SERVICE_BY_FEATURE[role?.featureCode ?? ''] ?? [];
          const match = services.find((s) =>
            fragments.some((f) => (s.subServiceName ?? '').includes(f)),
          );
          this.subServiceID.set(match?.subServiceID ?? null);
        },
        error: () => this.subServiceID.set(null),
      });

    this.loadHistory();
  }

  onStateChange(): void {
    this.form.patchValue({ districtID: null });
    this.districts.set([]);
    const stateID = this.form.controls.stateID.value;
    if (stateID == null) {
      return;
    }
    this.beneficiary
      .getDistricts(stateID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d) => this.districts.set(d), error: (e: DirectoryError) => this.setError(e) });
  }

  onDirectoryChange(): void {
    this.form.patchValue({ instituteSubDirectoryID: null });
    this.subDirectoryList.set([]);
    const id = this.form.controls.instituteDirectoryID.value;
    if (id == null) {
      return;
    }
    this.directory
      .getSubDirectory(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (s) => this.subDirectoryList.set(s), error: (e: DirectoryError) => this.setError(e) });
  }

  /** Comma-joined non-empty contact numbers for a result. */
  contactLine(r: InstituteResult): string {
    return [r.institute?.contactNo1, r.institute?.contactNo2, r.institute?.contactNo3]
      .filter((c): c is string => !!c && c.trim().length > 0)
      .join(', ');
  }

  search(): void {
    if (this.form.invalid || this.searching()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const createdBy = this.authStore.user()?.userName ?? '';
    this.searching.set(true);
    this.errorMessage.set('');
    this.directory
      .searchInstitutes({
        beneficiaryRegID: this.callStore.beneficiaryId(),
        benCallID: this.callStore.callId(),
        serviceID1097: this.subServiceID(),
        createdBy,
        instituteDirectoryID: v.instituteDirectoryID,
        instituteSubDirectoryID: v.instituteSubDirectoryID,
        stateID: v.stateID,
        districtID: v.districtID,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          this.searching.set(false);
          this.searched.set(true);
          this.results.set(results);
          // Legacy marked the service as availed on any completed search; only
          // non-empty results are persisted to the search history.
          this.serviceProvided.emit();
          if (results.length > 0) {
            this.persistHistory(results, createdBy);
          }
        },
        error: (err: DirectoryError) => {
          this.searching.set(false);
          this.setError(err);
        },
      });
  }

  private persistHistory(results: InstituteResult[], createdBy: string): void {
    const rows = results.map((r) => ({
      beneficiaryRegID: this.callStore.beneficiaryId(),
      benCallID: this.callStore.callId(),
      institutionID: r.institute?.institutionID,
      instituteDirectoryID: r.directory?.instituteDirectoryID,
      instituteSubDirectoryID: r.subDirectory?.instituteSubDirectoryID,
      providerServiceMapID: r.directory?.providerServiceMapID,
      createdBy,
    }));
    this.directory
      .saveSearchHistory(rows)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.loadHistory(), error: () => undefined });
  }

  private loadHistory(): void {
    this.directory
      .getSearchHistory(this.callStore.beneficiaryId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (rows) => this.history.set(rows), error: () => this.history.set([]) });
  }

  private setError(err: DirectoryError): void {
    this.errorMessage.set(err.errorMessage || this.i18n.instant('directory.loadError'));
  }
}
