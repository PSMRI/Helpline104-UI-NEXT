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

import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Z_MODAL_DATA } from '@common-ui/ui/dialog';

import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SupervisorError } from '../../shared/supervisor-api';
import { FeedbackLog } from './grievance.models';
import { SupervisorGrievanceService } from './grievance.service';

/** Input for the dialog: the grievance whose change log to show. */
export interface ChangeLogDialogData {
  feedbackID: number;
}

/**
 * Change-log dialog for a grievance (legacy `ChangeLogModalComponent`): lists
 * the `feedback/getFeedbackLogs` entries with who changed what and when.
 * Timestamps are epoch ms displayed as UTC, matching the legacy `utcDate` pipe.
 */
@Component({
  selector: 'app-change-log-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, TranslatePipe],
  template: `
    @if (errorMessage()) {
      <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
    }

    @if (loading()) {
      <p class="py-4 text-center text-sm text-muted-foreground">
        {{ 'supGrievance.loading' | translate: lang() }}
      </p>
    } @else {
      <div class="overflow-x-auto rounded-md border border-border">
        <table class="w-full text-left text-sm">
          <thead class="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th scope="col" class="px-3 py-2 font-medium">
                {{ 'supGrievance.log.sno' | translate: lang() }}
              </th>
              <th scope="col" class="px-3 py-2 font-medium">
                {{ 'supGrievance.log.grievanceLogs' | translate: lang() }}
              </th>
              <th scope="col" class="px-3 py-2 font-medium">
                {{ 'supGrievance.log.modifiedBy' | translate: lang() }}
              </th>
              <th scope="col" class="px-3 py-2 font-medium">
                {{ 'supGrievance.log.modifiedDate' | translate: lang() }}
              </th>
            </tr>
          </thead>
          <tbody>
            @for (log of logs(); track $index) {
              <tr class="border-t border-border align-top">
                <td class="px-3 py-2">{{ $index + 1 }}</td>
                <td class="px-3 py-2">{{ log.feedbackLogs || '—' }}</td>
                <td class="px-3 py-2">{{ log.createdBy || '—' }}</td>
                <td class="px-3 py-2">
                  {{
                    log.createdDate != null
                      ? (log.createdDate | date: 'dd/MM/yyyy hh:mm a' : 'UTC')
                      : '—'
                  }}
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="px-3 py-6 text-center text-muted-foreground">
                  {{ 'supGrievance.noRecords' | translate: lang() }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class ChangeLogDialogComponent implements OnInit {
  private readonly service = inject(SupervisorGrievanceService);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly data = inject<ChangeLogDialogData>(Z_MODAL_DATA);

  readonly lang = this.i18n.language;

  readonly logs = signal<FeedbackLog[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.loading.set(true);
    this.service
      .getFeedbackLogs(this.data.feedbackID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (logs) => {
          this.loading.set(false);
          this.logs.set(logs);
        },
        error: (err: SupervisorError) => {
          this.loading.set(false);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }
}
