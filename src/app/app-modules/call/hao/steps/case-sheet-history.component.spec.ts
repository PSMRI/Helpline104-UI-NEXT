/*
 * AMRIT â€“ Accessible Medical Records via Integrated Technologies
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
import { TestBed } from '@angular/core/testing';

import { of } from 'rxjs';

import { CaseSheetHistoryEntry } from '../hao.models';
import { HaoService } from '../hao.service';
import { CaseSheetHistoryComponent } from './case-sheet-history.component';

describe('CaseSheetHistoryComponent', () => {
  it('shows createdDate as the wall-clock time the backend recorded, not shifted to the browser zone', async () => {
    const row: CaseSheetHistoryEntry = { benHistoryID: 1155320, createdDate: '2026-10-08T14:51:21.000Z' };
    TestBed.configureTestingModule({
      imports: [CaseSheetHistoryComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: HaoService, useValue: { getCaseSheetHistory: () => of([row]) } },
      ],
    });
    const fixture = TestBed.createComponent(CaseSheetHistoryComponent);
    fixture.componentRef.setInput('benRegID', 9450999);
    await fixture.whenStable();

    const cells = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody td');
    expect(cells[3].textContent?.trim()).toBe('08/10/2026 02:51 PM');
  });
});
