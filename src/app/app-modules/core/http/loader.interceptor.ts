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
 * Endpoints that must not drive the global spinner — mirrors MMU's
 * `donotShowSpinnerUrl`. The CTI calls fire on login and on a background
 * polling cadence; routing them through the spinner makes it flicker.
 */
const SPINNER_SKIP_URLS: readonly string[] = [
  'cti/getAgentState',
  'cti/getAgentIPAddress',
  'cti/getLoginKey',
  'cti/doAgentLogin',
];

/**
 * Drives the global loading indicator via a pending-request counter, replacing
 * the legacy interceptor's inline `loaderService.show()/hide()`.
 */
export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  if (SPINNER_SKIP_URLS.some((url) => req.url.includes(url))) {
    return next(req);
  }

  const spinner = inject(SpinnerService);

  spinner.show();
  return next(req).pipe(finalize(() => spinner.hide()));
};
