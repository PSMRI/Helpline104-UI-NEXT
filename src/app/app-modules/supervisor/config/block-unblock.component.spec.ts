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

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlockUnblockComponent } from './block-unblock.component';
import { BlacklistEntry } from './block-unblock.models';

function entries(count: number): BlacklistEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    phoneBlockID: i + 1,
    phoneNo: `98000000${String(i).padStart(2, '0')}`,
    isBlocked: i % 2 === 0,
    noOfNuisanceCall: i % 3,
    blockEndDate: Date.UTC(2026, 8, 30, 10, 30),
  }));
}

describe('BlockUnblockComponent blacklist table', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<BlockUnblockComponent>;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [BlockUnblockComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(BlockUnblockComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function flushBlacklist(rows: BlacklistEntry[]): void {
    http.expectOne((req) => req.url.includes('call/getBlacklistNumbers')).flush({ statusCode: 200, data: rows });
    fixture.detectChanges();
  }

  function bodyRows(): HTMLTableRowElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('app-data-table tbody tr'));
  }

  it('pages the blacklist ten rows at a time and shows the pager when there is more than one page', () => {
    flushBlacklist(entries(25));

    expect(bodyRows().length).toBe(10);
    expect(fixture.nativeElement.querySelector('z-pagination')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('25 record(s)');
  });

  it('hides the pager when everything fits on one page', () => {
    flushBlacklist(entries(4));

    expect(bodyRows().length).toBe(4);
    expect(fixture.nativeElement.querySelector('z-pagination')).toBeNull();
  });

  it('renders every legacy column: phone, status, call-count link, reason, blocked-till and the action button', () => {
    flushBlacklist([
      { phoneBlockID: 1, phoneNo: '9800000001', isBlocked: true, noOfNuisanceCall: 3, blockEndDate: Date.UTC(2026, 8, 30) },
      { phoneBlockID: 2, phoneNo: '9800000002', isBlocked: false, noOfNuisanceCall: 0 },
    ]);

    const headers = Array.from(fixture.nativeElement.querySelectorAll('app-data-table thead th') as NodeListOf<HTMLElement>).map(
      (th) => (th.textContent ?? '').trim(),
    );
    expect(headers).toEqual(['Phone Number', 'Status', 'Call Count', 'Reason', 'Blocked Till', 'Action']);

    const [blocked, unblocked] = bodyRows();
    const blockedCells = Array.from(blocked.querySelectorAll('td')).map((td) => (td.textContent ?? '').trim());
    expect(blockedCells[0]).toBe('9800000001');
    expect(blockedCells[1]).toBe('Blocked');
    expect(blockedCells[2]).toBe('3');
    expect(blockedCells[3]).toBe('Nuisance Call');
    expect(blockedCells[4]).toMatch(/^\d{2}\/\d{2}\/2026 \d{2}:\d{2}$/);
    expect(blockedCells[5]).toBe('Unblock');
    expect((blocked.querySelectorAll('td')[2].querySelector('button') as HTMLButtonElement).disabled).toBeFalse();

    const unblockedCells = Array.from(unblocked.querySelectorAll('td')).map((td) => (td.textContent ?? '').trim());
    expect(unblockedCells[1]).toBe('Unblocked');
    expect(unblockedCells[4]).toBe('—');
    expect(unblockedCells[5]).toBe('Block');
    expect((unblocked.querySelectorAll('td')[2].querySelector('button') as HTMLButtonElement).disabled).toBeTrue();
  });

  it('opens the recordings sub-table from the call-count link', () => {
    flushBlacklist([{ phoneBlockID: 1, phoneNo: '9800000001', isBlocked: true, noOfNuisanceCall: 2 }]);

    (bodyRows()[0].querySelectorAll('td')[2].querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url.includes('call/nueisanceCallHistory'));
    expect(req.request.body).toEqual(jasmine.objectContaining({ phoneNo: '9800000001', count: 2 }));
    req.flush({ statusCode: 200, data: { workList: [{ phoneNo: '9800000001', benCallID: 11, callID: 5, agentID: 9 }] } });
    fixture.detectChanges();

    expect(fixture.componentInstance.recordingsPhone()).toBe('9800000001');
    expect(fixture.componentInstance.recordings().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Call recordings for');
  });

  it('shows the empty message when the blacklist is empty', () => {
    flushBlacklist([]);

    expect(bodyRows().length).toBe(1);
    expect(bodyRows()[0].textContent).toContain('No records found.');
  });
});
