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
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';

import { ZardButtonComponent } from '@/shared/ui/button';
import { ZardPaginationComponent } from '@/shared/ui/pagination';
import { ZardTableImports } from '@/shared/ui/table';
import { ZardInputDirective } from '@/shared/ui/input';

import { DataTableColumn, DataTableSortDirection } from './data-table.types';

/**
 * Reusable, presentation-only data table built on the ZardUI Table and
 * Pagination primitives. Replaces the legacy `md2DataTable` usage with:
 *
 *  - column definitions (label, optional formatter, alignment, sortability),
 *  - a single global search box (client-side, across all columns),
 *  - click-to-sort column headers (asc → desc → none),
 *  - client-side pagination, and
 *  - optional CSV export of the current (filtered + sorted) rows.
 *
 * All processing is client-side over the bound `data`. For server-driven
 * datasets (e.g. the criteria-based reports), fetch/filter upstream and pass
 * the resulting page of rows in; do not rely on this for server pagination.
 */
@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ...ZardTableImports,
    ZardPaginationComponent,
    ZardInputDirective,
    ZardButtonComponent,
    NgTemplateOutlet,
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.css',
})
export class DataTableComponent<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly columns = input.required<DataTableColumn<T>[]>();
  readonly data = input<readonly T[]>([]);
  /**
   * Rows per page. Defaults to 10. An in-UI page-size picker is intentionally
   * not provided yet (no ZardUI select component exists); consumers set the
   * size here.
   */
  readonly pageSize = input<number>(10);
  /** Show the global search box. Defaults to true. */
  readonly filterable = input<boolean>(true);
  /** Show the "Export CSV" button. Defaults to false. */
  readonly exportable = input<boolean>(false);
  readonly caption = input<string>('');
  readonly searchPlaceholder = input<string>('Search…');
  readonly emptyMessage = input<string>('No records found.');
  /** Base name for the exported CSV file (without extension). */
  readonly exportFileName = input<string>('table-export');
  /**
   * Optional stable row identity for `@for` tracking. Recommended whenever
   * columns use `cellTemplate` with interactive/stateful content, so DOM/state
   * isn't reused for a different row across sort/filter/paginate. Falls back to
   * the row index.
   */
  readonly rowKey = input<((row: T) => unknown) | undefined>(undefined);

  protected readonly searchTerm = signal('');
  protected readonly sortKey = signal<string | null>(null);
  protected readonly sortDir = signal<DataTableSortDirection>(null);
  /** 1-based current page. */
  protected readonly pageIndex = signal(1);

  /** Rows after applying the global search. */
  protected readonly filtered = computed<readonly T[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const rows = this.data();
    if (!term) {
      return rows;
    }
    const columns = this.columns();
    return rows.filter((row) =>
      columns.some((column) =>
        this.cellText(column, row).toLowerCase().includes(term),
      ),
    );
  });

  /** Filtered rows after applying the active sort. */
  protected readonly sorted = computed<readonly T[]>(() => {
    const key = this.sortKey();
    const direction = this.sortDir();
    const rows = this.filtered();
    if (!key || !direction) {
      return rows;
    }
    const column = this.columns().find((c) => c.key === key);
    const factor = direction === 'asc' ? 1 : -1;
    const numeric = column?.sortType === 'number';
    return [...rows].sort((a, b) => {
      const av = column ? this.cellText(column, a) : String(a[key] ?? '');
      const bv = column ? this.cellText(column, b) : String(b[key] ?? '');
      if (numeric) {
        const an = Number(av);
        const bn = Number(bv);
        return ((isNaN(an) ? 0 : an) - (isNaN(bn) ? 0 : bn)) * factor;
      }
      // Natural, case-insensitive compare: "2" < "10", leading-zero IDs kept.
      return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' }) * factor;
    });
  });

  /**
   * `pageSize` clamped to a positive integer. Guards the pagination math against
   * a 0, negative, fractional, or NaN input (which would make `totalPages`
   * Infinity/NaN and break the page slice). Falls back to the documented 10.
   */
  protected readonly effectivePageSize = computed(() => {
    const size = Math.floor(this.pageSize());
    return Number.isFinite(size) && size > 0 ? size : 10;
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.sorted().length / this.effectivePageSize())),
  );

  /**
   * Current page clamped to the valid `[1, totalPages]` range. Bound to the
   * pager and used by `paged` so the control and the displayed rows never
   * disagree — e.g. when the `data` input shrinks below the stored `pageIndex`
   * (a report re-query), or a stray non-positive page is set.
   */
  protected readonly displayIndex = computed(() =>
    Math.min(Math.max(1, Math.floor(this.pageIndex())), this.totalPages()),
  );

  /** The slice of rows for the current page. */
  protected readonly paged = computed<readonly T[]>(() => {
    const size = this.effectivePageSize();
    const start = (this.displayIndex() - 1) * size;
    return this.sorted().slice(start, start + size);
  });

  /** Resolve a column's display text for a row. */
  cellText(column: DataTableColumn<T>, row: T): string {
    return column.cell ? column.cell(row) : String(row[column.key] ?? '');
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
    this.pageIndex.set(1);
  }

  toggleSort(column: DataTableColumn<T>): void {
    if (!column.sortable) {
      return;
    }
    if (this.sortKey() !== column.key) {
      this.sortKey.set(column.key);
      this.sortDir.set('asc');
    } else if (this.sortDir() === 'asc') {
      this.sortDir.set('desc');
    } else if (this.sortDir() === 'desc') {
      this.sortKey.set(null);
      this.sortDir.set(null);
    } else {
      this.sortDir.set('asc');
    }
    this.pageIndex.set(1);
  }

  onPageChange(page: number): void {
    this.pageIndex.set(page);
  }

  /** Keyboard activation for sortable headers (Enter / Space), mirroring click. */
  onHeaderKeydown(event: KeyboardEvent, column: DataTableColumn<T>): void {
    if (!column.sortable) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.toggleSort(column);
    }
  }

  /** `@for` track function: stable row key when provided, else the index. */
  trackRow(index: number, row: T): unknown {
    const key = this.rowKey();
    return key ? key(row) : index;
  }

  /** ARIA sort state for a header cell. */
  ariaSort(column: DataTableColumn<T>): 'ascending' | 'descending' | 'none' | null {
    if (!column.sortable) {
      return null;
    }
    if (this.sortKey() !== column.key || !this.sortDir()) {
      return 'none';
    }
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  /** Sort glyph for a header (empty when not the active sort column). */
  sortIndicator(column: DataTableColumn<T>): string {
    if (this.sortKey() !== column.key) {
      return '';
    }
    return this.sortDir() === 'asc' ? '▲' : this.sortDir() === 'desc' ? '▼' : '';
  }

  /** Export the current (filtered + sorted) rows as a CSV download. */
  exportCsv(): void {
    const columns = this.columns();
    const header = columns.map((c) => this.csvEscape(c.header)).join(',');
    const rows = this.sorted().map((row) =>
      columns.map((column) => this.csvEscape(this.cellText(column, row))).join(','),
    );
    // Prepend a UTF-8 BOM so Excel renders non-ASCII (e.g. Devanagari) text.
    const csv = String.fromCharCode(0xfeff) + [header, ...rows].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.exportFileName()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private csvEscape(value: string): string {
    // Neutralise CSV formula injection: a cell beginning with =, +, -, or @ can
    // be evaluated as a formula by Excel/Sheets. Prefix with a tab so the cell
    // is treated as text (OWASP CSV injection guidance).
    const safe = /^[=+\-@]/.test(value) ? `\t${value}` : value;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  }
}
