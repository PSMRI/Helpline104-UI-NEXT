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
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFileText, lucidePhoneOutgoing } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardDialogService } from '@common-ui/ui/dialog';
import { ZardFormControlComponent, ZardFormFieldComponent, ZardFormLabelComponent } from '@common-ui/ui/form';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../core/auth/auth.store';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { FEATURE_SCREEN_NAMES } from '../outbound/outbound.models';
import { OutboundService } from '../outbound/outbound.service';
import { CDI_CALL_STATUSES, CdiCallRecord, ReportError } from './call-type-report.models';
import { CallTypeReportService } from './call-type-report.service';
import { CdiReportDialogComponent } from './cdi-report-dialog.component';

/** Shared Tailwind classes for native `<select>` controls (no custom CSS). */
const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

/** Legacy defaults: the range opens 3 days back, paged 5 rows at a time. */
const DEFAULT_RANGE_DAYS = 3;
const PAGE_SIZES = [5, 10, 15, 20] as const;

/** Zero-pad to two digits. */
function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Format a Date as `YYYY-MM-DD` for a native date input. */
function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/**
 * Agent Call Type (Customer Delight Index) report, ported from the legacy
 * `surveyor-calltype-reports`: a date-range + call-status filter over the
 * server-paged CDI worklist (`call/filterCallListPage`). Closed calls open the
 * Customer Delight Report modal ({@link CdiReportDialogComponent}); dialing a
 * pending call needs the CTI soft-phone and is deferred, like the outbound
 * worklist's manual dial.
 *
 * Embedded in the surveyor workspace and routed at `/reports/call-type` from
 * the dashboard Reports panel. Standalone, OnPush + signals, ZardUI + Tailwind.
 */
@Component({
  selector: 'app-call-type-report',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    NgIcon,
    ReactiveFormsModule,
    TranslatePipe,
    ZardButtonComponent,
    ZardInputDirective,
    ZardFormFieldComponent,
    ZardFormControlComponent,
    ZardFormLabelComponent,
  ],
  viewProviders: [provideIcons({ lucideFileText, lucidePhoneOutgoing })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-base font-semibold text-foreground">
          {{ 'reports.callType.title' | translate: lang() }}
        </h1>
        @if (showBack()) {
          <button z-button type="button" zType="outline" zSize="sm" (click)="goToDashboard()">
            {{ 'reports.backToDashboard' | translate: lang() }}
          </button>
        }
      </header>

      <form [formGroup]="filterForm" (ngSubmit)="search()" autocomplete="off">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <z-form-field>
            <label z-form-label zRequired>{{ 'reports.callType.startDate' | translate: lang() }}</label>
            <z-form-control>
              <input z-input type="date" formControlName="startDate" [attr.max]="maxDate" />
            </z-form-control>
          </z-form-field>

          <z-form-field>
            <label z-form-label zRequired>{{ 'reports.callType.endDate' | translate: lang() }}</label>
            <z-form-control>
              <input z-input type="date" formControlName="endDate" [attr.max]="maxDate" />
            </z-form-control>
          </z-form-field>

          <z-form-field>
            <label z-form-label>{{ 'reports.callType.status' | translate: lang() }}</label>
            <z-form-control>
              <select formControlName="status" [class]="selectClass">
                @for (status of statuses; track status) {
                  <option [value]="status">{{ status }}</option>
                }
              </select>
            </z-form-control>
          </z-form-field>

          <z-form-field>
            <label z-form-label>{{ 'reports.callType.rowsPerPage' | translate: lang() }}</label>
            <z-form-control>
              <select formControlName="pageSize" [class]="selectClass">
                @for (size of pageSizes; track size) {
                  <option [value]="size">{{ size }}</option>
                }
              </select>
            </z-form-control>
          </z-form-field>
        </div>

        @if (dateRangeError()) {
          <p class="mt-3 text-sm font-medium text-destructive" role="alert">
            {{ 'reports.callType.dateRangeError' | translate: lang() }}
          </p>
        } @else if (filterForm.invalid && filterForm.touched) {
          <p class="mt-3 text-sm font-medium text-destructive" role="alert">
            {{ 'reports.callType.dateRequired' | translate: lang() }}
          </p>
        }

        <div class="mt-4">
          <button
            z-button
            type="submit"
            zType="default"
            [zLoading]="loading()"
            [zDisabled]="loading() || filterForm.invalid"
          >
            {{ 'reports.callType.search' | translate: lang() }}
          </button>
        </div>
      </form>

      @if (errorMessage()) {
        <p class="mt-4 text-sm font-medium text-destructive" role="alert">
          {{ errorMessage() }}
        </p>
      }

      @if (searched()) {
        <div class="mt-5 overflow-x-auto rounded-md border border-border">
          <table class="w-full text-left text-sm">
            <thead class="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'reports.callType.col.benId' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'reports.callType.col.benName' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'reports.callType.col.callType' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'reports.callType.col.remarks' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'reports.callType.col.status' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'reports.callType.col.callDate' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'reports.callType.col.lastCalledOn' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'reports.callType.col.action' | translate: lang() }}
                </th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.benCallID) {
                <tr class="border-t border-border align-top">
                  <td class="px-3 py-2">{{ row.beneficiaryID ?? '—' }}</td>
                  <td class="px-3 py-2">{{ row.name || '—' }}</td>
                  <td class="px-3 py-2">{{ row.callType || '—' }}</td>
                  <td class="px-3 py-2">{{ row.remarks || '—' }}</td>
                  <td class="px-3 py-2">{{ row.cDICallStatus || '—' }}</td>
                  <td class="px-3 py-2">
                    {{ (row.callTime | date: 'dd/MM/yyyy HH:mm') || '—' }}
                  </td>
                  <td class="px-3 py-2">
                    {{ row.cDICallStatus === 'New' ? '—' : row.lastCalledOn || '—' }}
                  </td>
                  <td class="px-3 py-2">
                    @if (row.cDICallStatus === 'Closed') {
                      <button z-button zType="default" zSize="sm" type="button" (click)="openReport(row)">
                        <ng-icon name="lucideFileText" size="14" aria-hidden="true" />
                        {{ 'reports.callType.report' | translate: lang() }}
                      </button>
                    } @else {
                      <button z-button zType="outline" zSize="sm" type="button" [zDisabled]="true">
                        <ng-icon name="lucidePhoneOutgoing" size="14" aria-hidden="true" />
                        {{ 'reports.callType.dial' | translate: lang() }}
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="px-3 py-8 text-center text-muted-foreground">
                    {{ 'reports.callType.empty' | translate: lang() }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (totalPages() > 1) {
          <div class="mt-4 flex items-center justify-end gap-3 text-sm">
            <button
              z-button
              type="button"
              zType="outline"
              zSize="sm"
              [zDisabled]="loading() || page() <= 1"
              (click)="goToPage(page() - 1)"
            >
              {{ 'reports.callType.previous' | translate: lang() }}
            </button>
            <span class="text-muted-foreground">
              {{ 'reports.callType.page' | translate: lang() }} {{ page() }} /
              {{ totalPages() }}
            </span>
            <button
              z-button
              type="button"
              zType="outline"
              zSize="sm"
              [zDisabled]="loading() || page() >= totalPages()"
              (click)="goToPage(page() + 1)"
            >
              {{ 'reports.callType.next' | translate: lang() }}
            </button>
          </div>
        }

        <!-- Dialing a pending CDI call needs the CTI soft-phone (deferred). -->
        <p class="mt-4 text-xs text-muted-foreground">
          {{ 'reports.callType.dialDeferred' | translate: lang() }}
        </p>
      }
    </section>
  `,
})
export class CallTypeReportComponent implements OnInit {
  private readonly reportService = inject(CallTypeReportService);
  private readonly outbound = inject(OutboundService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly dialog = inject(ZardDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  /** Show the "Back to Dashboard" action (routed page; hidden when embedded). */
  readonly showBack = input(false);

  readonly lang = this.i18n.language;
  readonly selectClass = SELECT_CLASS;
  readonly statuses = CDI_CALL_STATUSES;
  readonly pageSizes = PAGE_SIZES;
  readonly maxDate = toDateInput(new Date());

  readonly rows = signal<CdiCallRecord[]>([]);
  readonly loading = signal(false);
  readonly searched = signal(false);
  readonly errorMessage = signal('');
  readonly dateRangeError = signal(false);
  readonly page = signal(1);
  readonly totalPages = signal(0);

  /** The "valid" call type resolved from `call/getCallTypesV1`. */
  private callTypeID: number | null = null;
  /** Name of the role holding Health_Advice (legacy `receivedRoleName`). */
  private receivedRoleName: string | null = null;

  readonly filterForm = new FormGroup({
    startDate: new FormControl(toDateInput(new Date(new Date().setDate(new Date().getDate() - DEFAULT_RANGE_DAYS))), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: new FormControl(toDateInput(new Date()), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    status: new FormControl<string>('All', { nonNullable: true }),
    pageSize: new FormControl<number | string>(PAGE_SIZES[0], { nonNullable: true }),
  });

  ngOnInit(): void {
    const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;

    // Resolve the "valid" call type (legacy getCallTypesV1 → callGroupType
    // "valid" → callType containing "valid").
    this.reportService
      .getCallTypes(providerServiceMapID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groups) => {
          const validGroup = groups.find((g) => g.callGroupType?.toLowerCase() === 'valid');
          this.callTypeID =
            validGroup?.callTypes?.find((t) => t.callType?.toLowerCase().includes('valid'))?.callTypeID ?? null;
        },
        error: () => undefined,
      });

    // Resolve the role that receives CDI calls: the role mapped to the
    // Health_Advice screen (legacy getRoleScreenMappingByProviderID → getRoles).
    this.outbound
      .getFeatureRoleMapping(providerServiceMapID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (mappings) => {
          const roleID = mappings.find((m) => m.screen?.screenName === FEATURE_SCREEN_NAMES.health)?.roleID;
          if (roleID == null) {
            return;
          }
          this.outbound
            .getRoles(providerServiceMapID)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (roles) => {
                this.receivedRoleName = roles.find((r) => r.roleID === roleID)?.roleName ?? null;
              },
              error: () => undefined,
            });
        },
        error: () => undefined,
      });
  }

  search(): void {
    // Both dates are required; without this guard a cleared date input would
    // run an unbounded-range query against the server-paged worklist.
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }
    const { startDate, endDate } = this.filterForm.getRawValue();
    if (startDate && endDate && endDate < startDate) {
      this.dateRangeError.set(true);
      return;
    }
    this.dateRangeError.set(false);
    this.goToPage(1);
  }

  goToPage(pageNo: number): void {
    const { startDate, endDate, status, pageSize } = this.filterForm.getRawValue();
    this.loading.set(true);
    this.errorMessage.set('');
    this.reportService
      .filterCallList({
        calledServiceID: this.authStore.currentRole()?.providerServiceMapID ?? null,
        callTypeID: this.callTypeID,
        filterStartDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
        filterEndDate: endDate ? `${endDate}T23:59:59.999Z` : undefined,
        receivedRoleName: this.receivedRoleName,
        pageNo,
        pageSize: Number(pageSize),
        cDICallStatus: status,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.searched.set(true);
          this.rows.set(res.workList ?? []);
          this.page.set(pageNo);
          this.totalPages.set(res.totalPages ?? 0);
        },
        error: (err: ReportError) => {
          this.loading.set(false);
          this.searched.set(true);
          this.rows.set([]);
          this.totalPages.set(0);
          this.errorMessage.set(err.errorMessage || this.i18n.instant('reports.callType.loadError'));
        },
      });
  }

  goToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  /** Open the Customer Delight Report modal for a closed call. */
  openReport(row: CdiCallRecord): void {
    this.dialog.create({
      zTitle: this.i18n.instant('reports.cdi.title'),
      zContent: CdiReportDialogComponent,
      zData: {
        beneficiaryRegID: row.beneficiaryRegID ?? null,
        benCallID: row.benCallID ?? null,
      },
      zHideFooter: true,
      zWidth: '40rem',
    });
  }
}
