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
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucideDownload,
  lucideEye,
  lucidePlay,
} from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';
import * as XLSX from 'xlsx';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { BlockUnblockService } from '../config/block-unblock.service';
import { saveBlob } from '../reports/report-runner';
import { AgentOption, CallTypeGroup, CallTypeOption, RoleOption } from '../reports/reports.models';
import { SupervisorReportsService } from '../reports/reports.service';
import {
  clampEndDate,
  maxEndFor,
  rangeEndIso,
  rangeStartIso,
  todayInput,
} from '../reports/reports.util';
import { SupervisorError } from '../shared/supervisor-api';
import { SUP_SELECT_CLASS } from '../shared/supervisor-ui';
import { CallRecordingRow, WorklistRequest } from './quality-audit.models';
import { QualityAuditService } from './quality-audit.service';

const PHONE_PATTERN = /^[0-9]{10,12}$/;

/** Call-type groups the legacy screen audits (legacy `getCallTypes` filter). */
const AUDITED_GROUPS = ['valid', 'invalid', 'incomplete', 'transfer'];

/** The synthetic "All" call-type group the legacy screen appends. */
const ALL_GROUP = 'All';

/** Identity for a worklist row, used to key the active audio player. */
function recordingKey(row: CallRecordingRow): string {
  return `${row.agentID}-${row.callID}`;
}

/**
 * Quality Audit activity screen (legacy `QualityAuditComponent`, "Call
 * Auditing"): filter the service's call recordings by date range, skillset,
 * agent, inbound/outbound, beneficiary phone and call type / sub-type
 * (`call/filterCallList`, server-paged), review the worklist, play a call's
 * voice recording (`call/getFilePathCTI`) and export the rows to `.xlsx`.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-quality-audit',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    NgIcon,
    TranslatePipe,
    ZardButtonComponent,
    ZardInputDirective,
  ],
  viewProviders: [
    provideIcons({ lucideChevronLeft, lucideChevronRight, lucideDownload, lucideEye, lucidePlay }),
  ],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        {{ 'supQa.title' | translate: lang() }}
      </h1>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">
          {{ errorMessage() }}
        </p>
      }

      <form [formGroup]="form" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label for="qa-audit-start" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.startDate' | translate: lang() }}
          </label>
          <input
            id="qa-audit-start"
            type="date"
            [class]="selectClass"
            formControlName="startDate"
            [max]="maxDate"
            (change)="onStartChange()"
          />
        </div>
        <div>
          <label for="qa-audit-end" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.endDate' | translate: lang() }}
          </label>
          <input
            id="qa-audit-end"
            type="date"
            [class]="selectClass"
            formControlName="endDate"
            [min]="form.controls.startDate.value"
            [max]="endMax()"
          />
        </div>
        <div>
          <label for="qa-audit-role" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.skillset' | translate: lang() }}
          </label>
          <select
            id="qa-audit-role"
            [class]="selectClass"
            formControlName="roleName"
            (change)="onRoleChange()"
          >
            <option [ngValue]="null">{{ 'supReports.filter.select' | translate: lang() }}</option>
            @for (role of roles(); track role.roleID) {
              <option [ngValue]="role.roleName">{{ role.roleName }}</option>
            }
          </select>
        </div>
        <div>
          <label for="qa-audit-agent" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.agent' | translate: lang() }}
          </label>
          <select id="qa-audit-agent" [class]="selectClass" formControlName="agentID">
            <option [ngValue]="null">{{ 'supReports.filter.select' | translate: lang() }}</option>
            @for (agent of agents(); track $index) {
              <option [ngValue]="agent.agentID">{{ agent.agentID }}</option>
            }
          </select>
        </div>
        <div>
          <label for="qa-audit-ioc" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supQa.filter.inboundOutbound' | translate: lang() }}
          </label>
          <select id="qa-audit-ioc" [class]="selectClass" formControlName="inboundOutbound">
            <option [ngValue]="null">{{ 'supReports.filter.select' | translate: lang() }}</option>
            <option value="inbound">{{ 'supQa.inbound' | translate: lang() }}</option>
            <option value="outbound">{{ 'supQa.outbound' | translate: lang() }}</option>
          </select>
        </div>
        <div>
          <label for="qa-audit-phone" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supQa.filter.phone' | translate: lang() }}
          </label>
          <input
            id="qa-audit-phone"
            z-input
            formControlName="phoneNo"
            inputmode="numeric"
            maxlength="12"
            [placeholder]="'supQa.filter.phone' | translate: lang()"
          />
          @if (form.controls.phoneNo.touched && form.controls.phoneNo.invalid) {
            <p class="mt-1 text-xs font-medium text-destructive">
              {{ 'supQa.phoneInvalid' | translate: lang() }}
            </p>
          }
        </div>
        <div>
          <label for="qa-audit-group" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.callType' | translate: lang() }}
          </label>
          <select
            id="qa-audit-group"
            [class]="selectClass"
            formControlName="callGroup"
            (change)="onCallGroupChange()"
          >
            <option [ngValue]="null" disabled>
              {{ 'supReports.filter.select' | translate: lang() }}
            </option>
            @for (group of callGroups(); track group.callGroupType) {
              <option [ngValue]="group">
                {{
                  group.callGroupType === allGroup
                    ? ('supReports.all' | translate: lang())
                    : group.callGroupType
                }}
              </option>
            }
          </select>
        </div>
        <div>
          <label for="qa-audit-sub" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.callSubType' | translate: lang() }}
          </label>
          <select id="qa-audit-sub" [class]="selectClass" formControlName="callTypeID">
            <option [ngValue]="null" disabled>
              {{ 'supReports.filter.select' | translate: lang() }}
            </option>
            @for (subType of callSubTypes(); track subType.callTypeID) {
              <option [ngValue]="subType.callTypeID">{{ subType.callType }}</option>
            }
          </select>
        </div>
      </form>

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button
          z-button
          type="button"
          [zLoading]="loading()"
          [zDisabled]="form.invalid"
          (click)="view()"
        >
          <ng-icon name="lucideEye" size="16" aria-hidden="true" />
          {{ 'supReports.view' | translate: lang() }}
        </button>
        <button
          z-button
          type="button"
          zType="outline"
          [zDisabled]="rows().length === 0"
          (click)="export()"
        >
          <ng-icon name="lucideDownload" size="16" aria-hidden="true" />
          {{ 'supReports.export' | translate: lang() }}
        </button>
      </div>

      @if (loading()) {
        <p class="py-8 text-center text-sm text-muted-foreground">
          {{ 'supReports.loading' | translate: lang() }}
        </p>
      } @else if (searched()) {
        <div class="mt-6 overflow-x-auto rounded-md border border-border">
          <table class="w-full text-left text-sm">
            <thead class="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'supQa.col.sno' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'supQa.col.callId' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'supQa.col.callTime' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'supQa.col.beneficiaryId' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'supQa.col.name' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'supQa.col.phone' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'supQa.col.remarks' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'supQa.col.callType' | translate: lang() }}
                </th>
                <th scope="col" class="px-3 py-2 font-medium">
                  {{ 'supQa.col.voice' | translate: lang() }}
                </th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track $index) {
                <tr class="border-t border-border align-top">
                  <td class="px-3 py-2">{{ $index + 1 }}</td>
                  <td class="px-3 py-2">{{ row.benCallID ?? '—' }}</td>
                  <td class="px-3 py-2">
                    {{ row.callTime ? (row.callTime | date: 'dd/MM/yyyy HH:mm') : '—' }}
                  </td>
                  <td class="px-3 py-2">{{ row.beneficiaryID ?? '—' }}</td>
                  <td class="px-3 py-2">{{ row.name || '—' }}</td>
                  <td class="px-3 py-2">{{ row.phoneNo || '—' }}</td>
                  <td class="px-3 py-2">{{ row.remarks || '—' }}</td>
                  <td class="px-3 py-2">{{ row.callType || '—' }}</td>
                  <td class="px-3 py-2">
                    @if (activeAudioKey() === keyOf(row) && audioSrc()) {
                      <audio controls autoplay preload="none" class="h-8">
                        <source [src]="audioSrc()" type="audio/mpeg" />
                      </audio>
                    } @else {
                      <button
                        z-button
                        type="button"
                        zType="ghost"
                        zSize="sm"
                        [zDisabled]="!(row.agentID && row.callID)"
                        (click)="playAudio(row)"
                      >
                        <ng-icon name="lucidePlay" size="14" aria-hidden="true" />
                        {{ 'supQa.play' | translate: lang() }}
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="px-3 py-8 text-center text-muted-foreground">
                    {{ 'supReports.noData' | translate: lang() }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Server-side pager: call/filterCallList returns one page per request. -->
        @if (totalPages() > 1) {
          <div class="mt-3 flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <span>
              {{ 'supQa.page' | translate: lang() }} {{ pageNo() }}
              {{ 'supQa.of' | translate: lang() }} {{ totalPages() }}
            </span>
            <button
              z-button
              type="button"
              zType="outline"
              zSize="sm"
              [zDisabled]="pageNo() <= 1 || loading()"
              (click)="goToPage(pageNo() - 1)"
            >
              <ng-icon name="lucideChevronLeft" size="14" aria-hidden="true" />
              {{ 'supQa.prev' | translate: lang() }}
            </button>
            <button
              z-button
              type="button"
              zType="outline"
              zSize="sm"
              [zDisabled]="pageNo() >= totalPages() || loading()"
              (click)="goToPage(pageNo() + 1)"
            >
              {{ 'supQa.next' | translate: lang() }}
              <ng-icon name="lucideChevronRight" size="14" aria-hidden="true" />
            </button>
          </div>
        }
      }
    </section>
  `,
})
export class QualityAuditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(QualityAuditService);
  private readonly reportsService = inject(SupervisorReportsService);
  private readonly audioService = inject(BlockUnblockService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly selectClass = SUP_SELECT_CLASS;
  readonly maxDate = todayInput();
  readonly allGroup = ALL_GROUP;

  readonly form = this.fb.group({
    startDate: this.fb.control<string>(this.maxDate, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: this.fb.control<string>(this.maxDate, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    roleName: this.fb.control<string | null>(null),
    agentID: this.fb.control<string | null>(null),
    inboundOutbound: this.fb.control<string | null>(null),
    phoneNo: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.pattern(PHONE_PATTERN)],
    }),
    callGroup: this.fb.control<CallTypeGroup | null>(null, Validators.required),
    callTypeID: this.fb.control<number | null>(null, Validators.required),
  });

  readonly endMax = signal(this.maxDate);
  readonly roles = signal<RoleOption[]>([]);
  readonly agents = signal<AgentOption[]>([]);
  readonly callGroups = signal<CallTypeGroup[]>([]);
  readonly callSubTypes = signal<CallTypeOption[]>([]);

  readonly loading = signal(false);
  readonly searched = signal(false);
  readonly errorMessage = signal('');
  readonly rows = signal<CallRecordingRow[]>([]);
  readonly pageNo = signal(1);
  readonly totalPages = signal(0);

  readonly activeAudioKey = signal<string | null>(null);
  readonly audioSrc = signal('');
  private readonly audioCache = new Map<string, string>();

  /** The filters the current worklist was fetched with (pager re-uses them). */
  private lastRequest: WorklistRequest | null = null;

  // Request-id guards: only the most recent request per operation may apply
  // its response, so a slow earlier call can't overwrite newer state.
  private worklistReqId = 0;
  private agentsReqId = 0;
  private audioReqId = 0;

  private readonly providerServiceMapID = computed(
    () => this.authStore.currentRole()?.providerServiceMapID ?? null,
  );

  ngOnInit(): void {
    const psmID = this.providerServiceMapID();
    this.reportsService
      .getRoles(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => this.roles.set(roles),
        error: () => this.notifyLookupError(),
      });
    this.loadAgents(undefined);
    this.reportsService
      .getCallTypeGroups(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Legacy `getCallTypes`: only the valid / invalid / incomplete /
        // transfer groups are auditable, plus a synthetic "All" entry.
        next: (groups) =>
          this.callGroups.set([
            ...groups.filter((group) =>
              AUDITED_GROUPS.includes((group.callGroupType ?? '').toLowerCase()),
            ),
            { callGroupType: ALL_GROUP, callTypes: [] },
          ]),
        error: () => this.notifyLookupError(),
      });
  }

  keyOf(row: CallRecordingRow): string {
    return recordingKey(row);
  }

  /** Tell the supervisor a filter-options lookup failed (all lookups share this). */
  private notifyLookupError(): void {
    toast.error(this.i18n.instant('supReports.lookupError'));
  }

  onStartChange(): void {
    const { startDate, endDate } = this.form.getRawValue();
    this.endMax.set(maxEndFor(startDate, this.maxDate));
    const clamped = clampEndDate(startDate, endDate, this.maxDate);
    if (clamped) {
      this.form.patchValue({ endDate: clamped });
    }
  }

  /** Narrow the agent list to the selected skillset (legacy `getRoleSpecificAgents`). */
  onRoleChange(): void {
    const roleName = this.form.controls.roleName.value;
    const role = this.roles().find(
      (r) => (r.roleName ?? '').toLowerCase() === (roleName ?? '').toLowerCase(),
    );
    this.form.patchValue({ agentID: null });
    this.loadAgents(roleName != null ? role?.roleID : undefined);
  }

  /** Populate sub-types for the group; "All" audits every type (no sub-type). */
  onCallGroupChange(): void {
    const group = this.form.controls.callGroup.value;
    const isAll = group?.callGroupType === ALL_GROUP;
    this.callSubTypes.set(isAll ? [] : (group?.callTypes ?? []));
    const callTypeID = this.form.controls.callTypeID;
    callTypeID.setValue(null);
    if (isAll) {
      callTypeID.clearValidators();
      callTypeID.disable();
    } else {
      callTypeID.setValidators(Validators.required);
      callTypeID.enable();
    }
    callTypeID.updateValueAndValidity();
  }

  view(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const isAll = value.callGroup?.callGroupType === ALL_GROUP;
    // Legacy `callRecordingRequestFordate` body, verbatim field names.
    this.lastRequest = {
      calledServiceID: this.providerServiceMapID(),
      ...(isAll || value.callTypeID == null ? {} : { callTypeID: value.callTypeID }),
      filterStartDate: rangeStartIso(value.startDate),
      filterEndDate: rangeEndIso(value.endDate),
      receivedRoleName: value.roleName ?? null,
      phoneNo: value.phoneNo ? value.phoneNo : null,
      agentID: value.agentID ?? null,
      inboundOutbound: value.inboundOutbound ?? null,
      is1097: false,
      pageNo: 1,
    };
    this.fetchPage(1);
  }

  goToPage(pageNo: number): void {
    if (!this.lastRequest || pageNo < 1 || pageNo > this.totalPages()) {
      return;
    }
    this.fetchPage(pageNo);
  }

  /** Export the current worklist page as an `.xlsx` workbook. */
  export(): void {
    const headers = (
      [
        'supQa.col.callId',
        'supQa.col.callTime',
        'supQa.col.beneficiaryId',
        'supQa.col.name',
        'supQa.col.phone',
        'supQa.col.remarks',
        'supQa.col.callType',
      ] as const
    ).map((key) => this.i18n.instant(key));
    const data = this.rows().map((row) => [
      row.benCallID ?? '',
      row.callTime ?? '',
      row.beneficiaryID ?? '',
      row.name ?? '',
      row.phoneNo ?? '',
      row.remarks ?? '',
      row.callType ?? '',
    ]);
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Report');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    saveBlob(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      'Quality_Audit.xlsx',
    );
    toast.success(this.i18n.instant('supReports.downloaded'));
  }

  playAudio(row: CallRecordingRow): void {
    if (row.agentID == null || row.callID == null) {
      return;
    }
    const key = recordingKey(row);
    // Bump the guard first so an in-flight (non-cached) request can't later
    // clobber this selection, whether we resolve from cache or the network.
    const reqId = ++this.audioReqId;
    const cached = this.audioCache.get(key);
    if (cached) {
      this.activeAudioKey.set(key);
      this.audioSrc.set(cached);
      return;
    }
    this.errorMessage.set('');
    this.audioService
      .getAudio(row.agentID, row.callID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (path) => {
          if (reqId !== this.audioReqId) {
            return;
          }
          if (!path) {
            this.errorMessage.set(this.i18n.instant('supQa.audioError'));
            return;
          }
          this.audioCache.set(key, path);
          this.activeAudioKey.set(key);
          this.audioSrc.set(path);
        },
        error: () => {
          if (reqId !== this.audioReqId) {
            return;
          }
          this.errorMessage.set(this.i18n.instant('supQa.audioError'));
        },
      });
  }

  private fetchPage(pageNo: number): void {
    if (!this.lastRequest) {
      return;
    }
    const reqId = ++this.worklistReqId;
    this.loading.set(true);
    this.errorMessage.set('');
    this.activeAudioKey.set(null);
    this.audioSrc.set('');
    this.service
      .getCallRecordingWorklist({ ...this.lastRequest, pageNo })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          if (reqId !== this.worklistReqId) {
            return;
          }
          this.loading.set(false);
          this.searched.set(true);
          this.rows.set(page.workList ?? []);
          this.totalPages.set(page.totalPages ?? 0);
          this.pageNo.set(pageNo);
        },
        error: (err: SupervisorError) => {
          if (reqId !== this.worklistReqId) {
            return;
          }
          this.loading.set(false);
          this.searched.set(true);
          this.rows.set([]);
          this.totalPages.set(0);
          this.pageNo.set(1);
          // Legacy semantics: a 500 means "no data for these filters".
          this.errorMessage.set(
            err.status === 500
              ? this.i18n.instant('supReports.noData')
              : this.i18n.instant('supReports.fetchError'),
          );
        },
      });
  }

  private loadAgents(roleID: number | undefined): void {
    const reqId = ++this.agentsReqId;
    this.service
      .getAgents(this.providerServiceMapID(), roleID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (agents) => {
          if (reqId !== this.agentsReqId) {
            return;
          }
          this.agents.set(agents);
        },
        error: () => {
          if (reqId !== this.agentsReqId) {
            return;
          }
          this.notifyLookupError();
        },
      });
  }
}
