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

import { TemplateRef } from '@angular/core';

/** Active sort direction for a column; null means unsorted. */
export type DataTableSortDirection = 'asc' | 'desc' | null;

/** How a sortable column compares values. Defaults to 'string'. */
export type DataTableSortType = 'string' | 'number';

/** Context passed to a column's {@link DataTableColumn.cellTemplate}. */
export interface DataTableCellContext<T = Record<string, unknown>> {
  /** The row for this cell. */
  $implicit: T;
  /** The column being rendered. */
  column: DataTableColumn<T>;
}

/** Column definition for {@link DataTableComponent}. */
export interface DataTableColumn<T = Record<string, unknown>> {
  /** Property key on the row; used for default cell rendering and sorting. */
  key: string;
  /** Column header label. */
  header: string;
  /** Enable click-to-sort on this column. Defaults to false. */
  sortable?: boolean;
  /**
   * Comparison mode when this column is sorted. 'string' (default) uses a
   * natural, case-insensitive locale compare (so "2" sorts before "10" and
   * leading-zero IDs keep their identity); 'number' compares numerically.
   */
  sortType?: DataTableSortType;
  /** Text alignment for the header and its cells. Defaults to 'left'. */
  align?: 'left' | 'center' | 'right';
  /**
   * Custom cell text; receives the row and returns display text. Defaults to
   * `String(row[key] ?? '')`. This text is what search, sort, and CSV export
   * operate on — provide it (or a real `key`) for template columns that should
   * still be searchable/exportable.
   */
  cell?: (row: T) => string;
  /**
   * Custom cell renderer for rich content (buttons, links, badges). When set,
   * it replaces the text output in the cell; its event handlers run in the
   * declaring component's context. Search/sort/export still use `cell`/`key`.
   */
  cellTemplate?: TemplateRef<DataTableCellContext<T>>;
}
