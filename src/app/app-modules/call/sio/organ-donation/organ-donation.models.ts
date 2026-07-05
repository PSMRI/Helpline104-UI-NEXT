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
 * Types for the Organ Donation (donation request) service tab, derived from the
 * legacy SIO organ-donation flow. Endpoints (all 104 base):
 * `beneficiary/get/organDonationTypes`, `beneficiary/get/DonatableOrgans`,
 * `beneficiary/get/organDonationRequestDetails`,
 * `beneficiary/save/organDonationRequestDetails`.
 * The legacy hospital-referral search, institute-details save, outbound
 * follow-up and SMS flow are separate concerns and are intentionally not part
 * of this inbound capture tab.
 */

/** A donation type (`beneficiary/get/organDonationTypes`). */
export interface DonationType {
  donationTypeID: number;
  donationType: string;
}

/** A donatable organ (`beneficiary/get/DonatableOrgans`). */
export interface DonatableOrgan {
  donatableOrganID: number;
  donatableOrgan: string;
}

/** One organ-donation request (wrapped in `t_organDonations` on save). */
export interface OrganDonation {
  donatableOrganID: number | null;
  beneficiaryRegID: number | null;
  donarName: string;
  donarAge: number | null;
  donarGenderID: number | null;
  donationTypeID: number | null;
  deleted: boolean;
  createdBy: string;
  isSelf: boolean;
  providerServiceMapID: number | null;
  benCallID: string | null;
  remarks: string | null;
}

/** Request body for POST beneficiary/save/organDonationRequestDetails. */
export interface SaveOrganDonationRequest {
  t_organDonations: OrganDonation[];
}

/** One row of the organ-donation history (`beneficiary/get/organDonationRequestDetails`). */
export interface OrganDonationRow {
  requestID?: number | string;
  donarName?: string;
  donarAge?: number;
  m_gender?: { genderName?: string };
  m_donationType?: { donationType?: string };
  m_donatableOrgan?: { donatableOrgan?: string };
  [key: string]: unknown;
}
