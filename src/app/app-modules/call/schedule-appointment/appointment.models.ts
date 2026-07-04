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
 * Types for the schedule-appointment modal, derived from the legacy
 * `ScheduleAppointmentComponent` and `SearchService`. Endpoints (common API):
 *   - GET  uptsu/get/facilityMaster/{providerServiceMapID}/{blockName}
 *   - POST uptsu/save/appointment-details
 * Sub-districts (blocks) are loaded via the shared BeneficiaryService.
 */

/** Standard AMRIT API envelope. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised appointment-API error the component can display. */
export interface AppointmentError {
  status: number;
  errorMessage: string;
}

/** One facility (CHO centre) returned by the facility master. */
export interface FacilityOption {
  facilityName?: string;
  facilityCode?: string;
  /** CHO name (legacy reads `employeeName` into the "CHO name" field). */
  employeeName?: string;
  employeeCode?: string;
  hfrId?: string;
  /** Facility phone (legacy reads `presentMobileNo`). */
  presentMobileNo?: string;
}

/** Request body for POST uptsu/save/appointment-details. */
export interface SaveAppointmentRequest {
  blockName: string;
  facilityName: string;
  facilityCode: string;
  choName: string;
  employeeCode: string;
  hfrId: string;
  facilityPhoneNo: string;
  /** ISO datetime with the legacy `":00.000Z"` suffix. */
  appointmentDate: string;
  benRegId: number | null;
  benCallId: number | string | null;
  alternateMobNo: string | null;
  createdBy: string;
  providerServiceMapID: number | null;
}
