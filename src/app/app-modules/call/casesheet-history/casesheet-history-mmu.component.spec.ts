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

import { CasesheetHistoryMmuComponent } from './casesheet-history-mmu.component';
import { MmuVisitRow } from './other-helpline.models';
import { OtherHelplineService } from './other-helpline.service';

describe('CasesheetHistoryMmuComponent', () => {
  it('shows benVisitDate as the wall-clock time the backend recorded, not shifted to the browser zone', async () => {
    const visit: MmuVisitRow = { benVisitDate: '2026-10-08T09:05:00.000Z', visitCode: 1 };
    TestBed.configureTestingModule({
      imports: [CasesheetHistoryMmuComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: OtherHelplineService, useValue: { getMmuBenCasesheet: () => of([visit]) } },
      ],
    });
    const fixture = TestBed.createComponent(CasesheetHistoryMmuComponent);
    fixture.componentRef.setInput('benRegID', 9450999);
    await fixture.whenStable();

    const firstCell = (fixture.nativeElement as HTMLElement).querySelector('tbody td');
    expect(firstCell?.textContent?.trim()).toBe('08/10/2026 09:05 AM');
  });
});
