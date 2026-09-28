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

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataTableComponent, pagerWindow } from './data-table.component';
import { DataTableColumn } from './data-table.types';

type Row = Record<string, unknown> & { id: number; name: string };

function rows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));
}

const COLUMNS: DataTableColumn<Row>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name' },
];

describe('pagerWindow', () => {
  it('lists every page when there are seven or fewer', () => {
    expect(pagerWindow(1, 1)).toEqual([1]);
    expect(pagerWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps first, last, and a window around the current page with gap markers', () => {
    expect(pagerWindow(1, 224)).toEqual([1, 2, 3, 4, 'ellipsis', 224]);
    expect(pagerWindow(100, 224)).toEqual([1, 'ellipsis', 99, 100, 101, 'ellipsis', 224]);
    expect(pagerWindow(224, 224)).toEqual([1, 'ellipsis', 221, 222, 223, 224]);
  });

  it('never exceeds seven slots', () => {
    for (let page = 1; page <= 224; page++) {
      expect(pagerWindow(page, 224).length).toBeLessThanOrEqual(7);
    }
  });
});

describe('DataTableComponent pager', () => {
  let fixture: ComponentFixture<DataTableComponent<Row>>;

  function pagerButtons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('z-pagination button'));
  }

  function bodyRows(): HTMLTableRowElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tbody tr'));
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DataTableComponent],
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(DataTableComponent<Row>);
    fixture.componentRef.setInput('columns', COLUMNS);
  });

  it('renders a bounded pager for a list that spans hundreds of pages', async () => {
    fixture.componentRef.setInput('data', rows(2240));
    fixture.componentRef.setInput('pageSize', 10);
    await fixture.whenStable();

    const labels = pagerButtons().map((b) => (b.textContent ?? '').replace(/\s+/g, ' ').trim());
    expect(pagerButtons().length).toBeLessThanOrEqual(9);
    expect(labels.some((l) => l.endsWith('1'))).toBeTrue();
    expect(labels.some((l) => l.endsWith('224'))).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('z-pagination-ellipsis').length).toBe(1);
    expect(bodyRows().length).toBe(10);
  });

  it('moves the window with the current page', async () => {
    fixture.componentRef.setInput('data', rows(2240));
    await fixture.whenStable();

    pagerButtons().find((b) => (b.textContent ?? '').includes('224'))?.click();
    await fixture.whenStable();

    const labels = pagerButtons().map((b) => (b.textContent ?? '').replace(/\s+/g, ' ').trim());
    expect(labels.some((l) => l.endsWith('221'))).toBeTrue();
    expect(labels.some((l) => l.endsWith('223'))).toBeTrue();
    expect(bodyRows()[0].textContent).toContain('Row 2231');
  });

  it('shows no page-size picker unless options are given', async () => {
    fixture.componentRef.setInput('data', rows(30));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.dt-page-size')).toBeNull();

    fixture.componentRef.setInput('pageSizeOptions', [10, 25, 50]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.dt-page-size')).not.toBeNull();
  });

  it('re-slices from page one when a new page size is chosen', async () => {
    fixture.componentRef.setInput('data', rows(60));
    fixture.componentRef.setInput('pageSizeOptions', [10, 25]);
    await fixture.whenStable();
    pagerButtons().find((b) => (b.textContent ?? '').includes('6'))?.click();
    await fixture.whenStable();
    expect(bodyRows()[0].textContent).toContain('Row 51');

    (fixture.componentInstance as unknown as { onPageSizeChange(v: string): void }).onPageSizeChange('25');
    await fixture.whenStable();

    expect(bodyRows().length).toBe(25);
    expect(bodyRows()[0].textContent).toContain('Row 1');
    expect(pagerButtons().filter((b) => /^\D*[0-9]+$/.test((b.textContent ?? '').trim())).length).toBe(3);
  });
});
