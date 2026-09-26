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

import { formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  LOCALE_ID,
  OnInit,
  TemplateRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, Validators } from '@angular/forms';
import { FormBuilder } from '@angular/forms';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlay, lucideSearch } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { ConfirmDialogService } from '@/shared/components/confirm-dialog';
import { DataTableCellContext, DataTableColumn, DataTableComponent } from '@/shared/components/data-table';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslationKey } from '../../core/i18n/locales';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { BlacklistEntry, BlockUnblockError, RecordingEntry } from './block-unblock.models';
import { BlockUnblockService } from './block-unblock.service';

const PHONE_PATTERN = /^[0-9]{5,12}$/;
const BLACKLIST_PAGE_SIZE = 10;
const BLACKLIST_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const BLOCKED_TILL_FORMAT = 'dd/MM/yyyy HH:mm';

/** A blacklist entry widened to the record shape {@link DataTableComponent} requires. */
type BlacklistRow = BlacklistEntry & Record<string, unknown>;

/** Identity for a recording row, used to key the active audio player. */
function recordingKey(entry: RecordingEntry): string {
  return `${entry.agentID}-${entry.callID}`;
}

/**
 * Block / unblock a caller number (supervisor screen). Ported from the legacy
 * `BlockUnblockNumberComponent`: lists the service's blacklist, toggles
 * block/unblock, and drills into a number's nuisance-call recordings with
 * inline audio playback.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-block-unblock',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NgIcon,
    TranslatePipe,
    ZardButtonComponent,
    ZardInputDirective,
    DataTableComponent,
  ],
  viewProviders: [provideIcons({ lucidePlay, lucideSearch })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        {{ 'blockUnblock.title' | translate: lang() }}
      </h1>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      <div class="mb-4 flex flex-wrap items-end gap-4">
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            [checked]="searchByPhone()"
            (change)="toggleSearchByPhone()"
          />
          {{ 'blockUnblock.searchByPhone' | translate: lang() }}
        </label>

        @if (searchByPhone()) {
          <div>
            <label for="bu-phone" class="sr-only">{{ 'blockUnblock.phone' | translate: lang() }}</label>
            <input
              id="bu-phone"
              z-input
              [formControl]="phone"
              inputmode="numeric"
              maxlength="12"
              [placeholder]="'blockUnblock.phone' | translate: lang()"
            />
            @if (phone.touched && phone.hasError('required')) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'registration.validation.required' | translate: lang() }}
              </p>
            }
          </div>
          <button z-button type="button" zType="default" [zDisabled]="phone.invalid || loading()" (click)="search()">
            <ng-icon name="lucideSearch" size="16" aria-hidden="true" />
            {{ 'blockUnblock.search' | translate: lang() }}
          </button>
        }
      </div>

      @if (loading()) {
        <p class="py-8 text-center text-sm text-muted-foreground">
          {{ 'blockUnblock.loading' | translate: lang() }}
        </p>
      } @else {
        <div class="overflow-x-auto">
          <app-data-table
            [columns]="columns()"
            [data]="rows()"
            [pageSize]="pageSize"
            [pageSizeOptions]="pageSizeOptions"
            [pageSizeLabel]="'blockUnblock.rowsPerPage' | translate: lang()"
            [filterable]="false"
            [rowKey]="rowKey"
            [emptyMessage]="'blockUnblock.noRecords' | translate: lang()"
          />
        </div>

        <!-- Recordings for the selected number -->
        @if (recordingsPhone(); as rp) {
          <div class="mt-6">
            <h2 class="mb-2 text-sm font-semibold text-foreground">
              {{ 'blockUnblock.recordingsFor' | translate: lang() }} <strong>{{ rp }}</strong>
            </h2>
            @if (recordingsLoading()) {
              <p class="py-4 text-center text-sm text-muted-foreground">
                {{ 'blockUnblock.loading' | translate: lang() }}
              </p>
            } @else {
              <div class="overflow-x-auto rounded-md border border-border">
                <table class="w-full text-left text-sm">
                  <thead class="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" class="px-3 py-2 font-medium">
                        {{ 'blockUnblock.phone' | translate: lang() }}
                      </th>
                      <th scope="col" class="px-3 py-2 font-medium">
                        {{ 'blockUnblock.callId' | translate: lang() }}
                      </th>
                      <th scope="col" class="px-3 py-2 font-medium">
                        {{ 'blockUnblock.agentId' | translate: lang() }}
                      </th>
                      <th scope="col" class="px-3 py-2 font-medium">
                        {{ 'blockUnblock.recording' | translate: lang() }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (rec of recordings(); track $index) {
                      <tr class="border-t border-border align-top">
                        <td class="px-3 py-2">{{ rec.phoneNo || '—' }}</td>
                        <td class="px-3 py-2">{{ rec.benCallID ?? '—' }}</td>
                        <td class="px-3 py-2">{{ rec.agentID ?? '—' }}</td>
                        <td class="px-3 py-2">
                          @if (activeAudioKey() === keyOf(rec) && audioSrc()) {
                            <audio controls autoplay preload="none" class="h-8">
                              <source [src]="audioSrc()" type="audio/mpeg" />
                            </audio>
                          } @else {
                            <button
                              z-button
                              type="button"
                              zType="ghost"
                              zSize="sm"
                              [zDisabled]="!(rec.agentID && rec.callID)"
                              (click)="playAudio(rec)"
                            >
                              <ng-icon name="lucidePlay" size="14" aria-hidden="true" />
                              {{ 'blockUnblock.play' | translate: lang() }}
                            </button>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="4" class="px-3 py-6 text-center text-muted-foreground">
                          {{ 'blockUnblock.noRecords' | translate: lang() }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }
      }

      <ng-template #callCountCell let-entry>
        <button
          type="button"
          class="text-primary underline-offset-2 hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
          [disabled]="!(entry.noOfNuisanceCall && entry.noOfNuisanceCall > 0)"
          (click)="openRecordings(entry)"
        >
          {{ entry.noOfNuisanceCall ?? 0 }}
        </button>
      </ng-template>

      <ng-template #actionCell let-entry>
        @if (entry.isBlocked) {
          <button z-button type="button" zType="outline" zSize="sm" (click)="unblock(entry)">
            {{ 'blockUnblock.unblock' | translate: lang() }}
          </button>
        } @else {
          <button z-button type="button" zType="destructive" zSize="sm" (click)="block(entry)">
            {{ 'blockUnblock.block' | translate: lang() }}
          </button>
        }
      </ng-template>
    </section>
  `,
})
export class BlockUnblockComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(BlockUnblockService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);

  private readonly callCountCell = viewChild<TemplateRef<DataTableCellContext<BlacklistRow>>>('callCountCell');
  private readonly actionCell = viewChild<TemplateRef<DataTableCellContext<BlacklistRow>>>('actionCell');

  readonly lang = this.i18n.language;
  readonly pageSize = BLACKLIST_PAGE_SIZE;
  readonly pageSizeOptions = BLACKLIST_PAGE_SIZE_OPTIONS;

  readonly phone = this.fb.control('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(PHONE_PATTERN)],
  });

  readonly blacklist = signal<BlacklistEntry[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly searchByPhone = signal(false);

  readonly recordingsPhone = signal<string | null>(null);
  readonly recordings = signal<RecordingEntry[]>([]);
  readonly recordingsLoading = signal(false);

  readonly activeAudioKey = signal<string | null>(null);
  readonly audioSrc = signal('');
  private readonly audioCache = new Map<string, string>();

  /** Blacklist rows in the shape the shared data table paginates over. */
  readonly rows = computed<BlacklistRow[]>(() => this.blacklist() as BlacklistRow[]);

  readonly rowKey = (row: BlacklistRow): unknown => row.phoneBlockID;

  /**
   * Column definitions for the blacklist table, rebuilt when the language or
   * the cell templates change. Text cells carry the display text so the
   * table's sort works on what the user sees; the call-count link and the
   * block/unblock action render through the templates declared above.
   */
  readonly columns = computed<DataTableColumn<BlacklistRow>[]>(() => {
    const language = this.lang();
    const t = (key: TranslationKey): string => this.i18n.instantFor(key, language);
    return [
      { key: 'phoneNo', header: t('blockUnblock.phone'), cell: (row) => row.phoneNo || '—' },
      {
        key: 'isBlocked',
        header: t('blockUnblock.status'),
        cell: (row) => t(row.isBlocked ? 'blockUnblock.blocked' : 'blockUnblock.unblocked'),
      },
      {
        key: 'noOfNuisanceCall',
        header: t('blockUnblock.callCount'),
        cell: (row) => String(row.noOfNuisanceCall ?? 0),
        cellTemplate: this.callCountCell(),
      },
      { key: 'reason', header: t('blockUnblock.reason'), cell: () => t('blockUnblock.nuisanceCall') },
      {
        key: 'blockEndDate',
        header: t('blockUnblock.blockedTill'),
        cell: (row) =>
          row.isBlocked && row.blockEndDate ? formatDate(row.blockEndDate, BLOCKED_TILL_FORMAT, this.locale) : '—',
      },
      { key: 'action', header: t('blockUnblock.action'), cell: () => '', cellTemplate: this.actionCell() },
    ];
  });

  // Request-id guards: only the most recent request per operation may apply its
  // response, so a slow earlier call can't overwrite newer state.
  private loadReqId = 0;
  private recordingsReqId = 0;
  private audioReqId = 0;

  ngOnInit(): void {
    this.load();
  }

  keyOf(rec: RecordingEntry): string {
    return recordingKey(rec);
  }

  toggleSearchByPhone(): void {
    const next = !this.searchByPhone();
    this.searchByPhone.set(next);
    if (!next) {
      this.phone.reset('');
      this.load();
    }
  }

  search(): void {
    if (this.phone.invalid) {
      this.phone.markAsTouched();
      return;
    }
    this.load(this.phone.value.trim());
  }

  block(entry: BlacklistEntry): void {
    if (entry.phoneBlockID == null) {
      return;
    }
    this.confirmDialog
      .confirm({
        title: this.i18n.instant('blockUnblock.block'),
        message: this.i18n.instant('blockUnblock.blockConfirm'),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
        destructive: true,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.toggle(this.service.block(entry.phoneBlockID as number));
        }
      });
  }

  unblock(entry: BlacklistEntry): void {
    if (entry.phoneBlockID == null) {
      return;
    }
    this.confirmDialog
      .confirm({
        title: this.i18n.instant('blockUnblock.unblock'),
        message: this.i18n.instant('blockUnblock.unblockConfirm'),
        okText: this.i18n.instant('dashboard.dialog.ok'),
        cancelText: this.i18n.instant('dashboard.dialog.cancel'),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.toggle(this.service.unblock(entry.phoneBlockID as number));
        }
      });
  }

  openRecordings(entry: BlacklistEntry): void {
    const phoneNo = entry.phoneNo;
    if (!phoneNo || !entry.noOfNuisanceCall) {
      return;
    }
    const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;
    const reqId = ++this.recordingsReqId;
    this.recordingsPhone.set(phoneNo);
    this.recordings.set([]);
    this.activeAudioKey.set(null);
    this.audioSrc.set('');
    this.recordingsLoading.set(true);
    this.errorMessage.set('');
    this.service
      .getRecordings(providerServiceMapID, phoneNo, entry.noOfNuisanceCall)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (recordings) => {
          if (reqId !== this.recordingsReqId) {
            return;
          }
          this.recordingsLoading.set(false);
          this.recordings.set(recordings);
        },
        error: (err: BlockUnblockError) => {
          if (reqId !== this.recordingsReqId) {
            return;
          }
          this.recordingsLoading.set(false);
          this.recordings.set([]);
          this.setError(err);
        },
      });
  }

  playAudio(rec: RecordingEntry): void {
    if (rec.agentID == null || rec.callID == null) {
      return;
    }
    const key = recordingKey(rec);
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
    this.service
      .getAudio(rec.agentID, rec.callID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (path) => {
          if (reqId !== this.audioReqId) {
            return;
          }
          if (!path) {
            this.setError({
              status: 0,
              errorMessage: this.i18n.instant('blockUnblock.audioError'),
            });
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
          this.setError({
            status: 0,
            errorMessage: this.i18n.instant('blockUnblock.audioError'),
          });
        },
      });
  }

  private toggle(action: ReturnType<BlockUnblockService['block']>): void {
    this.loading.set(true);
    this.errorMessage.set('');
    action.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.load(this.searchByPhone() ? this.phone.value.trim() : undefined),
      error: (err: BlockUnblockError) => {
        this.loading.set(false);
        this.setError(err);
      },
    });
  }

  private load(phoneNo?: string): void {
    const providerServiceMapID = this.authStore.currentRole()?.providerServiceMapID ?? null;
    const reqId = ++this.loadReqId;
    this.loading.set(true);
    this.errorMessage.set('');
    this.recordingsPhone.set(null);
    this.service
      .getBlacklist(providerServiceMapID, phoneNo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (entries) => {
          if (reqId !== this.loadReqId) {
            return;
          }
          this.loading.set(false);
          this.blacklist.set(entries);
        },
        error: (err: BlockUnblockError) => {
          if (reqId !== this.loadReqId) {
            return;
          }
          this.loading.set(false);
          this.blacklist.set([]);
          this.setError(err);
        },
      });
  }

  private setError(err: BlockUnblockError): void {
    this.errorMessage.set(err.errorMessage || this.i18n.instant('blockUnblock.loadError'));
  }
}
