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

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';

import { SpinnerService } from '../services/spinner.service';

/**
 * Drives the global loading indicator via a pending-request counter, replacing
 * the legacy interceptor's inline `loaderService.show()/hide()`.
 *
 * TODO(P1): add a skip-list (e.g. CTI agent-state polling) so background polls
 * don't flash the spinner — mirrors MMU's `donotShowSpinnerUrl`.
 */
export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const spinner = inject(SpinnerService);

  spinner.show();
  return next(req).pipe(finalize(() => spinner.hide()));
};
