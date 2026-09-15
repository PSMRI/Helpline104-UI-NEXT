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

import { Injectable, inject } from '@angular/core';
import { Observable, of, switchMap } from 'rxjs';

import { AuthStore } from '../../core/auth/auth.store';
import { CallStore } from '../call.store';
import { SmsService } from '../sms/sms.service';

const PRESCRIPTION_SMS_TYPE = 'prescription sms';

/**
 * Sends the "Prescription SMS" template for prescribed drug lines — legacy's
 * `sendSMS`, one request per line, to the beneficiary's registered number or an
 * alternate one.
 *
 * Shared because legacy reaches it from two places: the prescription dialog's
 * "Save & Send", and the Recent Prescription modal's "Send SMS". A missing SMS
 * type or template for the service resolves to `false` without an error, as
 * legacy did — that is a soft configuration gap, not a failure worth showing
 * the agent mid-call.
 */
@Injectable({ providedIn: 'root' })
export class PrescriptionSmsService {
  private readonly sms = inject(SmsService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);

  /** Resolves `true` once the messages are away, `false` if nothing was sent. */
  send(prescribedDrugIDs: readonly number[], alternateNo: string | null): Observable<boolean> {
    const beneficiaryRegID = this.callStore.beneficiaryId();
    if (beneficiaryRegID === null || prescribedDrugIDs.length === 0) {
      return of(false);
    }

    const role = this.authStore.currentRole();
    const providerServiceMapID = role?.providerServiceMapID ?? null;
    const createdBy = this.authStore.user()?.userName ?? '';

    return this.sms.getSmsTypes(role?.serviceID ?? null).pipe(
      switchMap((types) => {
        const smsType = types.find((t) => t.smsType.toLowerCase() === PRESCRIPTION_SMS_TYPE);
        if (!smsType) {
          return of(false);
        }
        return this.sms.getSmsTemplates(providerServiceMapID, smsType.smsTypeID).pipe(
          switchMap((templates) => {
            const template = templates.find((t) => t.deleted === false);
            if (!template) {
              return of(false);
            }
            const requests = prescribedDrugIDs.map((prescribedDrugID) => ({
              beneficiaryRegID,
              smsTemplateID: template.smsTemplateID,
              smsTemplateTypeID: smsType.smsTypeID,
              providerServiceMapID,
              createdBy,
              alternateNo,
              is1097: false,
              prescribedDrugID,
            }));
            return this.sms.sendSms(requests).pipe(switchMap(() => of(true)));
          }),
        );
      }),
    );
  }
}
