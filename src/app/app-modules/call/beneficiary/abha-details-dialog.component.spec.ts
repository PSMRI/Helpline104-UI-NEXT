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
import { TestBed } from '@angular/core/testing';

import { Z_MODAL_DATA, ZardDialogRef } from '@common-ui/ui/dialog';

import { AbhaDetailsDialogComponent, AbhaDetailsDialogData } from './abha-details-dialog.component';

describe('AbhaDetailsDialogComponent', () => {
  let closeSpy: jasmine.Spy;

  function render(data: AbhaDetailsDialogData) {
    closeSpy = jasmine.createSpy('close');
    TestBed.configureTestingModule({
      imports: [AbhaDetailsDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: Z_MODAL_DATA, useValue: data },
        { provide: ZardDialogRef, useValue: { close: closeSpy } },
      ],
    });
    const fixture = TestBed.createComponent(AbhaDetailsDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('lists every ABHA linkage row', () => {
    const fixture = render({
      abhaDetails: [
        { HealthIDNumber: '91-1234-5678-9012', HealthID: 'jane@abdm', CreatedDate: '2026-01-01', AuthenticationMode: 'AADHAAR_OTP' },
        { HealthIDNumber: '91-0000-1111-2222', HealthID: 'jane2@abdm', CreatedDate: '2026-02-01', AuthenticationMode: 'MOBILE_OTP' },
      ],
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('91-1234-5678-9012');
    expect(text).toContain('jane@abdm');
    expect(text).toContain('91-0000-1111-2222');
    expect(text).toContain('MOBILE_OTP');
  });

  it('falls back to a dash for missing fields', () => {
    const fixture = render({ abhaDetails: [{}] });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('—');
  });

  it('close() closes the dialog', () => {
    const fixture = render({ abhaDetails: [] });
    fixture.componentInstance.close();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
