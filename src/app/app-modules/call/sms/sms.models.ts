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

/**
 * Types for post-registration SMS sending, derived from the legacy
 * `SmsTemplateService` and the send flows in registration / prescription /
 * directory. Endpoints (common API):
 *   - POST sms/getSMSTypes      { serviceID }
 *   - POST sms/getSMSTemplates  { providerServiceMapID, smsTemplateTypeID? }
 *   - POST sms/sendSMS          [ SendSmsRequest ]
 */

/** Standard AMRIT API envelope. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised SMS-API error the component can display. */
export interface SmsError {
  status: number;
  errorMessage: string;
}

/** An SMS type available for a service. */
export interface SmsType {
  smsTypeID: number;
  smsType: string;
}

/** An SMS template configured for a service + type. */
export interface SmsTemplate {
  smsTemplateID: number;
  smsTemplateName: string;
  smsType?: { smsTypeID?: number; smsType?: string };
  deleted?: boolean;
}

/** One entry in the sms/sendSMS request array. */
export interface SendSmsRequest {
  beneficiaryRegID: number | null;
  smsTemplateID: number;
  smsTemplateTypeID: number;
  providerServiceMapID: number | null;
  createdBy: string;
  /** Recipient number; the caller's CLI unless an alternate is entered. */
  alternateNo: string | null;
  is1097: boolean;
}
