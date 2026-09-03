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
import { TestBed } from '@angular/core/testing';

import { ZardDialogService } from '@common-ui/ui/dialog';

import { AuthStore } from '../../core/auth/auth.store';
import { ActivityPanelComponent } from './activity-panel.component';
import { KmDocsDialogComponent } from './dialogs/km-docs-dialog.component';

/**
 * The badge count and KM Docs modal were previously a hardcoded per-role
 * number and an always-empty placeholder respectively — these pin that both
 * now come from the real `notification/*` endpoints (the `KM` notification
 * type, matching legacy's `ActivityThisWeekComponent`).
 */
describe('ActivityPanelComponent', () => {
  let authStore: AuthStore;
  let http: HttpTestingController;
  let dialogSpy: jasmine.SpyObj<Pick<ZardDialogService, 'create'>>;

  beforeEach(() => {
    sessionStorage.clear();
    dialogSpy = jasmine.createSpyObj('ZardDialogService', ['create']);
    TestBed.configureTestingModule({
      imports: [ActivityPanelComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ZardDialogService, useValue: dialogSpy },
      ],
    });
    authStore = TestBed.inject(AuthStore);
    authStore.setSession({
      token: 't',
      user: { userID: 1, agentID: 2145, userName: '104hao', status: 'Active' },
    });
    authStore.setCurrentRole({
      roleID: 5,
      roleName: 'HAO',
      serviceID: 1,
      serviceName: '104',
      serviceProviderID: 1,
      providerServiceMapID: 9,
      workingLocationID: null,
      apimanClientKey: null,
      featureCode: 'HAO',
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  function render() {
    const fixture = TestBed.createComponent(ActivityPanelComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the real unread KM-notification count as the badge, not a hardcoded number', () => {
    const fixture = render();
    http.expectOne((r) => r.url.includes('notification/getNotificationType')).flush({ data: [] });
    http
      .expectOne((r) => r.url.includes('notification/getAlertsAndNotificationCount'))
      .flush({ data: { userNotificationTypeList: [{ notificationType: 'KM', notificationTypeUnreadCount: 3 }] } });

    expect(fixture.componentInstance.count()).toBe(3);
  });

  it('opens the KM Docs modal with the agent\'s real documents, filtering out future-dated ones', () => {
    const fixture = render();
    http
      .expectOne((r) => r.url.includes('notification/getNotificationType'))
      .flush({ data: [{ notificationType: 'KM', notificationTypeID: 42 }] });
    http.expectOne((r) => r.url.includes('notification/getAlertsAndNotificationCount')).flush({ data: {} });

    fixture.componentInstance.openKmDocs();
    http.expectOne((r) => r.url.includes('notification/getAlertsAndNotificationDetail')).flush({
      data: [
        { userNotificationMapID: 1, notificationState: 'unread', notification: { notificationDesc: 'Doc A' } },
        { userNotificationMapID: 2, notificationState: 'future', notification: { notificationDesc: 'Doc B' } },
      ],
    });

    expect(dialogSpy.create).toHaveBeenCalledTimes(1);
    const call = dialogSpy.create.calls.mostRecent().args[0] as { zContent: unknown; zData: { documents: unknown[] } };
    expect(call.zContent).toBe(KmDocsDialogComponent);
    expect(call.zData.documents.length).toBe(1);
  });

  it('opens the empty-list dialog when the KM notification type is not configured for this service', () => {
    const fixture = render();
    http.expectOne((r) => r.url.includes('notification/getNotificationType')).flush({ data: [] });
    http.expectOne((r) => r.url.includes('notification/getAlertsAndNotificationCount')).flush({ data: {} });

    fixture.componentInstance.openKmDocs();
    http.expectNone((r) => r.url.includes('notification/getAlertsAndNotificationDetail'));

    expect(dialogSpy.create).toHaveBeenCalledTimes(1);
    const call = dialogSpy.create.calls.mostRecent().args[0] as { zData: { documents: unknown[] } };
    expect(call.zData.documents).toEqual([]);
  });
});
