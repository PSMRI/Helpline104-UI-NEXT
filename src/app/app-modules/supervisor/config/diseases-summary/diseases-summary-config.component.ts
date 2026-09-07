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
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucidePencil } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';
import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { TranslationKey } from '../../../core/i18n/locales';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SupervisorError } from '../../shared/supervisor-api';
import { SUP_SELECT_CLASS, SUP_TEXTAREA_CLASS } from '../../shared/supervisor-ui';
import { DiseaseSummaryItem } from '../../reports/reports.models';
import {
  DiseaseSaveRequest,
  DiseasesSummaryConfigService,
} from './diseases-summary-config.service';

type ViewMode = 'list' | 'create' | 'edit';

/** Page-size choices of the legacy table footer. */
const PAGE_SIZES = [5, 10, 15, 20];

/** Decode the legacy encoding: `$`-separated entries with a leading `$`. */
function decodeLines(value: string | undefined): string {
  if (!value) {
    return '';
  }
  const body = value.startsWith('$') ? value.slice(1) : value;
  return body.replace(/\$/g, '\n');
}

/**
 * Encode a multi-line textarea back to the legacy wire format: one `$` before
 * every non-empty trimmed line (empty string when there is no content).
 */
function encodeLines(value: string | null | undefined): string {
  const lines = (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  return lines.length === 0 ? '' : '$' + lines.join('$');
}

/** One catalogue row: the raw API item plus decoded display fields. */
interface DiseaseRow {
  item: DiseaseSummaryItem;
  diseaseName: string;
  summary: string;
  medicalAdvice: string;
  deleted: boolean;
}

/** The ten multi-line content sections shown on the create/edit form. */
interface ContentField {
  control: string;
  labelKey: TranslationKey;
}

/**
 * Diseases Summary configuration (legacy
 * `SupervisorDiseasesSummaryComponent`): maintain the disease-summary master
 * used by the HAO case sheet — list the catalogue, create a new disease with
 * its ten content sections (one entry per line, `$`-encoded on the wire),
 * edit an existing disease, and activate/deactivate entries.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-diseases-summary-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucidePencil })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        @switch (mode()) {
          @case ('create') {
            {{ 'supDisease.createTitle' | translate: lang() }}
          }
          @case ('edit') {
            {{ 'supDisease.editTitle' | translate: lang() }}
          }
          @default {
            {{ 'supDisease.title' | translate: lang() }}
          }
        }
      </h1>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      <!-- Catalogue list -->
      @if (mode() === 'list') {
        @if (loading()) {
          <p class="py-8 text-center text-sm text-muted-foreground">
            {{ 'supDisease.loading' | translate: lang() }}
          </p>
        } @else {
          <div class="overflow-x-auto rounded-md border border-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supDisease.sno' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supDisease.diseaseName' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supDisease.summary' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supDisease.colAdvice' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supDisease.actions' | translate: lang() }}
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.item.diseasesummaryID ?? $index) {
                  <tr class="border-t border-border align-top">
                    <td class="px-3 py-2">{{ pageStartIndex() + $index + 1 }}</td>
                    <td class="px-3 py-2">{{ row.diseaseName || '—' }}</td>
                    <td class="whitespace-pre-line px-3 py-2">{{ row.summary || '—' }}</td>
                    <td class="whitespace-pre-line px-3 py-2">{{ row.medicalAdvice || '—' }}</td>
                    <td class="px-3 py-2">
                      <div class="flex items-center gap-1">
                        @if (!row.deleted) {
                          <button
                            z-button
                            type="button"
                            zType="ghost"
                            zSize="sm"
                            [attr.aria-label]="'supDisease.edit' | translate: lang()"
                            (click)="openEdit(row)"
                          >
                            <ng-icon name="lucidePencil" size="16" aria-hidden="true" />
                          </button>
                          <button
                            z-button
                            type="button"
                            zType="outline"
                            zSize="sm"
                            (click)="toggleDeleted(row, true)"
                          >
                            {{ 'supDisease.deactivate' | translate: lang() }}
                          </button>
                        } @else {
                          <button
                            z-button
                            type="button"
                            zType="secondary"
                            zSize="sm"
                            (click)="toggleDeleted(row, false)"
                          >
                            {{ 'supDisease.activate' | translate: lang() }}
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="px-3 py-8 text-center text-muted-foreground">
                      {{ 'supDisease.noRecords' | translate: lang() }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <label for="ds-page-size" class="text-xs font-medium text-muted-foreground">
                {{ 'supDisease.pageSize' | translate: lang() }}
              </label>
              <select
                id="ds-page-size"
                [class]="selectClass"
                class="!w-20"
                [value]="pageSize()"
                (change)="onPageSizeChange($event)"
              >
                @for (size of pageSizes; track size) {
                  <option [value]="size">{{ size }}</option>
                }
              </select>
            </div>
            @if (rows().length > 0) {
              <div class="flex items-center gap-2 text-sm text-muted-foreground">
                <button
                  z-button
                  type="button"
                  zType="ghost"
                  zSize="sm"
                  [zDisabled]="pageNo() <= 1"
                  [attr.aria-label]="'supDisease.prevPage' | translate: lang()"
                  (click)="setPage(pageNo() - 1)"
                >
                  <ng-icon name="lucideChevronLeft" size="16" aria-hidden="true" />
                </button>
                <span>
                  {{ 'supDisease.page' | translate: lang() }} {{ pageNo() }} / {{ totalPages() }}
                </span>
                <button
                  z-button
                  type="button"
                  zType="ghost"
                  zSize="sm"
                  [zDisabled]="pageNo() >= totalPages()"
                  [attr.aria-label]="'supDisease.nextPage' | translate: lang()"
                  (click)="setPage(pageNo() + 1)"
                >
                  <ng-icon name="lucideChevronRight" size="16" aria-hidden="true" />
                </button>
              </div>
            }
            <button z-button type="button" zType="default" (click)="openCreate()">
              {{ 'supDisease.createTitle' | translate: lang() }}
            </button>
          </div>
        }
      }

      <!-- Create / edit form -->
      @if (mode() !== 'list') {
        <form [formGroup]="form" autocomplete="off" class="grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="ds-name" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supDisease.diseaseName' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="ds-name"
              z-input
              class="w-full max-w-sm"
              maxlength="50"
              formControlName="diseaseName"
            />
            @if (nameExists()) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supDisease.nameExists' | translate: lang() }}
              </p>
            } @else if (form.controls.diseaseName.invalid && form.controls.diseaseName.touched) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supDisease.nameRequired' | translate: lang() }}
              </p>
            }
          </div>

          @for (field of contentFields; track field.control) {
            <div>
              <label
                [for]="'ds-' + field.control"
                class="mb-1 block text-xs font-medium text-muted-foreground"
              >
                {{ field.labelKey | translate: lang() }}
              </label>
              <textarea
                [id]="'ds-' + field.control"
                [class]="textareaClass"
                rows="3"
                maxlength="600"
                [formControlName]="field.control"
              ></textarea>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ 'supDisease.linesHint' | translate: lang() }}
              </p>
            </div>
          }

          <div class="sm:col-span-2 flex flex-wrap justify-between gap-2">
            <div class="flex gap-2">
              <button z-button type="button" zType="outline" (click)="backToList()">
                {{ 'supDisease.back' | translate: lang() }}
              </button>
              <button z-button type="button" zType="outline" (click)="resetForm()">
                {{ 'supDisease.reset' | translate: lang() }}
              </button>
            </div>
            <button
              z-button
              type="button"
              zType="default"
              [zLoading]="saving()"
              [zDisabled]="form.invalid || nameExists() || saving()"
              (click)="mode() === 'edit' ? update() : save()"
            >
              @if (mode() === 'edit') {
                {{ 'supDisease.update' | translate: lang() }}
              } @else {
                {{ 'supDisease.save' | translate: lang() }}
              }
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class DiseasesSummaryConfigComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(DiseasesSummaryConfigService);
  private readonly authStore = inject(AuthStore);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly selectClass = SUP_SELECT_CLASS;
  readonly textareaClass = SUP_TEXTAREA_CLASS;
  readonly pageSizes = PAGE_SIZES;

  readonly mode = signal<ViewMode>('list');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly rows = signal<DiseaseRow[]>([]);
  readonly pageNo = signal(1);
  readonly pageSize = signal(PAGE_SIZES[0]);
  readonly totalPages = signal(1);

  readonly pageStartIndex = computed(() => (this.pageNo() - 1) * this.pageSize());

  /** Duplicate-name guard (legacy `checkExistance`), case-insensitive. */
  readonly nameExists = signal(false);

  /** The row being edited; null while creating. */
  private editingItem: DiseaseSummaryItem | null = null;
  private loadReqId = 0;

  /** The ten content sections, in the legacy form's order. */
  readonly contentFields: ContentField[] = [
    { control: 'diseaseSummary', labelKey: 'supDisease.summary' },
    { control: 'questions', labelKey: 'supDisease.questions' },
    { control: 'causes', labelKey: 'supDisease.causes' },
    { control: 'doAndDonts', labelKey: 'supDisease.dosDonts' },
    { control: 'signsAndSymptoms', labelKey: 'supDisease.symptoms' },
    { control: 'medicalAdvice', labelKey: 'supDisease.whenToSeekAdvice' },
    { control: 'riskFactors', labelKey: 'supDisease.riskFactors' },
    { control: 'treatment', labelKey: 'supDisease.treatment' },
    { control: 'selfCare', labelKey: 'supDisease.selfCare' },
    { control: 'investigations', labelKey: 'supDisease.investigations' },
  ];

  readonly form = this.fb.group({
    diseaseName: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    diseaseSummary: this.fb.control('', { nonNullable: true }),
    questions: this.fb.control('', { nonNullable: true }),
    causes: this.fb.control('', { nonNullable: true }),
    doAndDonts: this.fb.control('', { nonNullable: true }),
    signsAndSymptoms: this.fb.control('', { nonNullable: true }),
    medicalAdvice: this.fb.control('', { nonNullable: true }),
    riskFactors: this.fb.control('', { nonNullable: true }),
    treatment: this.fb.control('', { nonNullable: true }),
    selfCare: this.fb.control('', { nonNullable: true }),
    investigations: this.fb.control('', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.form.controls.diseaseName.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.checkExistance(value));
    this.load();
  }

  private psmID(): number | null {
    return this.authStore.currentRole()?.providerServiceMapID ?? null;
  }

  private load(): void {
    const reqId = ++this.loadReqId;
    this.loading.set(true);
    this.errorMessage.set('');
    this.service
      .getDiseaseSummaryList(this.pageNo(), this.pageSize())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          if (reqId !== this.loadReqId) {
            return;
          }
          this.loading.set(false);
          this.rows.set(
            (page.DiseaseList ?? []).map((item) => ({
              item,
              diseaseName: item.diseaseName ?? '',
              summary: decodeLines(item.summary),
              medicalAdvice: decodeLines(item.medicaladvice),
              deleted: item['deleted'] === true,
            })),
          );
          this.totalPages.set(Math.max(1, page.totalPages ?? 1));
        },
        error: (err: SupervisorError) => {
          if (reqId !== this.loadReqId) {
            return;
          }
          this.loading.set(false);
          this.rows.set([]);
          this.totalPages.set(1);
          this.errorMessage.set(
            err.errorMessage || this.i18n.instant('supDisease.loadError'),
          );
        },
      });
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.pageNo()) {
      this.pageNo.set(page);
      this.load();
    }
  }

  onPageSizeChange(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    if (PAGE_SIZES.includes(size)) {
      this.pageSize.set(size);
      this.pageNo.set(1);
      this.load();
    }
  }

  private checkExistance(name: string): void {
    const candidate = name.trim().toLowerCase();
    if (!candidate) {
      this.nameExists.set(false);
      return;
    }
    const editingName = (this.editingItem?.diseaseName ?? '').trim().toLowerCase();
    this.nameExists.set(
      this.rows().some((row) => {
        const existing = row.diseaseName.trim().toLowerCase();
        return existing === candidate && existing !== editingName;
      }),
    );
  }

  openCreate(): void {
    this.editingItem = null;
    this.form.reset();
    this.nameExists.set(false);
    this.errorMessage.set('');
    this.mode.set('create');
  }

  openEdit(row: DiseaseRow): void {
    this.editingItem = row.item;
    this.errorMessage.set('');
    this.form.reset({
      diseaseName: row.item.diseaseName ?? '',
      diseaseSummary: decodeLines(row.item.summary),
      questions: decodeLines(row.item.couldbedangerous),
      causes: decodeLines(row.item.causes),
      doAndDonts: decodeLines(row.item.dos_donts),
      signsAndSymptoms: decodeLines(row.item.symptoms_Signs),
      medicalAdvice: decodeLines(row.item.medicaladvice),
      riskFactors: decodeLines(row.item.riskfactors),
      treatment: decodeLines(row.item.treatment),
      selfCare: decodeLines(row.item.self_care),
      investigations: decodeLines(row.item.investigations),
    });
    this.nameExists.set(false);
    this.mode.set('edit');
  }

  backToList(): void {
    this.mode.set('list');
    this.editingItem = null;
    this.errorMessage.set('');
  }

  resetForm(): void {
    this.form.reset();
    this.nameExists.set(false);
  }

  /** Build the legacy request payload from the form's decoded values. */
  private buildRequest(): DiseaseSaveRequest {
    const value = this.form.getRawValue();
    return {
      diseaseName: value.diseaseName.trim(),
      summary: encodeLines(value.diseaseSummary),
      couldbedangerous: encodeLines(value.questions),
      causes: encodeLines(value.causes),
      dos_donts: encodeLines(value.doAndDonts),
      symptoms_Signs: encodeLines(value.signsAndSymptoms),
      medicaladvice: encodeLines(value.medicalAdvice),
      riskfactors: encodeLines(value.riskFactors),
      treatment: encodeLines(value.treatment),
      self_care: encodeLines(value.selfCare),
      investigations: encodeLines(value.investigations),
      providerServiceMapID: this.psmID(),
      createdBy: this.authStore.user()?.userName ?? null,
    };
  }

  save(): void {
    if (this.form.invalid || this.nameExists()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .saveDiseaseSummary([this.buildRequest()])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          toast.success(this.i18n.instant('supDisease.saved'));
          this.backToList();
          this.pageNo.set(1);
          this.load();
        },
        error: (err: SupervisorError) => {
          this.saving.set(false);
          this.errorMessage.set(
            err.errorMessage || this.i18n.instant('supDisease.saveFailed'),
          );
        },
      });
  }

  update(): void {
    const diseasesummaryID = this.editingItem?.diseasesummaryID;
    if (this.form.invalid || this.nameExists() || diseasesummaryID == null) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .updateDiseaseSummary({ ...this.buildRequest(), diseasesummaryID })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          toast.success(this.i18n.instant('supDisease.updated'));
          this.backToList();
          this.pageNo.set(1);
          this.load();
        },
        error: (err: SupervisorError) => {
          this.saving.set(false);
          this.errorMessage.set(
            err.errorMessage || this.i18n.instant('supDisease.updateFailed'),
          );
        },
      });
  }

  toggleDeleted(row: DiseaseRow, deleted: boolean): void {
    this.confirmDialog
      .confirm({
        title: this.i18n.instant(deleted ? 'supDisease.deactivate' : 'supDisease.activate'),
        message: this.i18n.instant(
          deleted ? 'supDisease.confirmDeactivate' : 'supDisease.confirmActivate',
        ),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
        destructive: deleted,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.setDeleted(row, deleted);
        }
      });
  }

  private setDeleted(row: DiseaseRow, deleted: boolean): void {
    this.errorMessage.set('');
    this.service
      .setDeleted(row.item, deleted)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          toast.success(this.i18n.instant('supDisease.statusUpdated'));
          this.pageNo.set(1);
          this.load();
        },
        error: (err: SupervisorError) => {
          this.errorMessage.set(
            err.errorMessage || this.i18n.instant('supDisease.statusFailed'),
          );
        },
      });
  }
}
