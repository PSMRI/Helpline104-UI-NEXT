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

import { DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';

import { toast } from 'ngx-sonner';
import * as XLSX from 'xlsx';

import { DataTableColumn } from '@/shared/components/data-table';

import { I18nService } from '../../core/i18n/i18n.service';
import { SupervisorError } from '../shared/supervisor-api';

/** A row parsed out of the server-generated workbook. */
export type ReportRow = Record<string, unknown>;

/** The name of the data sheet in legacy-generated workbooks. */
const REPORT_SHEET = 'Report';

/**
 * Human-readable column header from a workbook key: camelCase identifiers are
 * split on capitals with `I D` re-joined (the legacy `modifyHeader`); keys that
 * already contain spaces are server-provided labels and pass through as-is.
 */
export function prettifyHeader(key: string): string {
  if (key.includes(' ')) {
    return key;
  }
  const spaced = key.replace(/([A-Z])/g, ' $1').trim();
  const capitalised = spaced.charAt(0).toUpperCase() + spaced.slice(1);
  return capitalised.replace(/I D/g, 'ID');
}

/** Trigger a browser download of a blob (legacy `saveAs` without the dep). */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Fetch/parse/export state machine shared by every supervisor report screen.
 *
 * The legacy report endpoints stream a generated `.xlsx` workbook, so "view"
 * fetches the blob and parses its `Report` sheet into table rows, while
 * "export" fetches a fresh blob for the current filters and saves it — the
 * exact file the legacy screens downloaded.
 */
export class ReportRunner {
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly searched = signal(false);
  readonly errorMessage = signal('');
  readonly columns = signal<DataTableColumn<ReportRow>[]>([]);
  readonly rows = signal<ReportRow[]>([]);

  /** Only the latest request may apply its response. */
  private requestId = 0;

  constructor(
    private readonly i18n: I18nService,
    private readonly destroyRef: DestroyRef,
  ) {}

  /** Fetch the workbook for the current filters and show it in the table. */
  view(request$: Observable<Blob>): void {
    const reqId = ++this.requestId;
    this.loading.set(true);
    // Starting a view supersedes any in-flight export: bumping requestId makes
    // that export's response a no-op, so clear its spinner here or it sticks on.
    this.exporting.set(false);
    this.errorMessage.set('');
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        void this.applyBlob(reqId, blob);
      },
      error: (err: SupervisorError) => {
        if (reqId !== this.requestId) {
          return;
        }
        this.loading.set(false);
        this.searched.set(true);
        this.columns.set([]);
        this.rows.set([]);
        this.errorMessage.set(this.messageFor(err));
      },
    });
  }

  /** Fetch a fresh workbook for the current filters and download it. */
  export(request$: Observable<Blob>, fileName: string): void {
    const reqId = ++this.requestId;
    this.exporting.set(true);
    // Starting an export supersedes any in-flight view: bumping requestId makes
    // that view's response a no-op, so clear its spinner here or it sticks on.
    this.loading.set(false);
    this.errorMessage.set('');
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        if (reqId !== this.requestId) {
          return;
        }
        this.exporting.set(false);
        saveBlob(blob, `${fileName}.xlsx`);
        toast.success(this.i18n.instant('supReports.downloaded'));
      },
      error: (err: SupervisorError) => {
        if (reqId !== this.requestId) {
          return;
        }
        this.exporting.set(false);
        this.errorMessage.set(this.messageFor(err));
      },
    });
  }

  private async applyBlob(reqId: number, blob: Blob): Promise<void> {
    let rows: ReportRow[] = [];
    let parseFailed = false;
    try {
      const workbook = XLSX.read(await blob.arrayBuffer());
      const sheetName = workbook.SheetNames.includes(REPORT_SHEET)
        ? REPORT_SHEET
        : workbook.SheetNames[0];
      const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
      rows = sheet ? XLSX.utils.sheet_to_json<ReportRow>(sheet, { defval: '' }) : [];
    } catch {
      parseFailed = true;
    }
    if (reqId !== this.requestId) {
      return;
    }
    this.loading.set(false);
    this.searched.set(true);
    this.rows.set(rows);
    this.columns.set(
      rows.length
        ? Object.keys(rows[0]).map((key) => ({
            key,
            header: prettifyHeader(key),
            sortable: true,
          }))
        : [],
    );
    if (parseFailed) {
      this.errorMessage.set(this.i18n.instant('supReports.parseError'));
    }
  }

  /** Legacy semantics: a 500 means "no data for these filters". */
  private messageFor(err: SupervisorError): string {
    return err.status === 500
      ? this.i18n.instant('supReports.noData')
      : this.i18n.instant('supReports.fetchError');
  }
}
