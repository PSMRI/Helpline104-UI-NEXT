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

import { AuthStore } from '../auth/auth.store';
import { ConfigService } from '../services/config.service';

/**
 * Attaches auth credentials to every outbound request, replacing the legacy
 * `InterceptedHttp`/`SecurityInterceptedHttp` request mutation.
 *
 *  - `Authorization`: the raw token (no `Bearer` prefix — matches the 104 API).
 *  - `Content-Type: application/json` unless the body is `FormData` (so the
 *    browser can set the multipart boundary).
 *  - `?apikey=<apimanKey>` appended when `environment.useApimanKey` is on and a
 *    key has been captured (APIMAN gateway).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthStore);
  const config = inject(ConfigService);

  let headers = req.headers;

  const token = auth.token();
  if (token) {
    headers = headers.set('Authorization', token);
  }

  const isFormData = req.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers = headers.set('Content-Type', 'application/json');
  }

  let url = req.url;
  if (config.useApimanKey()) {
    const apikey = auth.apimanKey();
    if (apikey && !/[?&]apikey=/.test(url)) {
      url += (url.includes('?') ? '&' : '?') + 'apikey=' + encodeURIComponent(apikey);
    }
  }

  return next(req.clone({ url, headers }));
};
