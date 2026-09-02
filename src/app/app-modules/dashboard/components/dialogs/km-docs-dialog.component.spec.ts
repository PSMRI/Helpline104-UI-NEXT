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

import { Z_MODAL_DATA } from '@common-ui/ui/dialog';

import { ConfigService } from '../../../core/services/config.service';
import { KmDocsDialogComponent, KmDocsDialogData } from './km-docs-dialog.component';

describe('KmDocsDialogComponent', () => {
  function render(data: KmDocsDialogData) {
    TestBed.configureTestingModule({
      imports: [KmDocsDialogComponent],
      providers: [provideZonelessChangeDetection(), { provide: Z_MODAL_DATA, useValue: data }],
    });
    TestBed.overrideProvider(ConfigService, {
      useValue: { getOpenKmBaseURL: () => 'https://km.example.org/download/' },
    });
    const fixture = TestBed.createComponent(KmDocsDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the empty message when there are no documents', () => {
    const fixture = render({ documents: [] });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No KM Docs documents found');
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });

  it('renders each document\'s description and a file link built from ConfigService when it has an attached file', () => {
    const fixture = render({
      documents: [
        {
          userNotificationMapID: 1,
          notification: {
            notificationDesc: 'Onboarding guide',
            kmFileManager: { fileUID: 'abc-123', fileName: 'guide.pdf' },
          },
        },
        {
          userNotificationMapID: 2,
          notification: { notificationDesc: 'Policy update, no attachment' },
        },
      ],
    });

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Onboarding guide');
    expect(text).toContain('Policy update, no attachment');

    const links = fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toBe('https://km.example.org/download/abc-123');
  });
});
