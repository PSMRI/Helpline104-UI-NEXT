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
 * Types for the "other helpline" case-sheet history tabs (MCTS + MMU), derived
 * from the legacy `OtherHelplineService`, `CasesheetHistoryMctsComponent` and
 * `CasesheetHistoryMmuComponent`. Endpoints:
 *   - POST mctsOutboundHistoryController/getMctsCallHistory   (common) — MCTS calls
 *   - POST mctsOutboundHistoryController/getMctsCallResponse  (common) — MCTS Q&A
 *   - POST common/getBeneficiaryCaseSheetHistory             (MMU/TM) — MMU visits
 *
 * Both history tabs share this service/model set (as the legacy did).
 */

/** Standard AMRIT API envelope. */
export interface ApiResponse<T> {
  data?: T;
  statusCode?: number;
  errorMessage?: string;
}

/** A normalised history-API error the component can display. */
export interface OtherHelplineError {
  status: number;
  errorMessage: string;
}

/** One MCTS outbound-call history row. */
export interface MctsCallRow {
  callDetailID?: number;
  createdDate?: string;
  /** Pipe-delimited change log; shown comma-joined. */
  changeLog?: string;
  smsAdvice?: string;
  remark?: string;
  mctsOutboundCall?: { displayOBCallType?: string };
  callType?: { callGroupType?: string; callType?: string };
}

/** One question/answer row for an MCTS call. */
export interface MctsQaRow {
  answer?: string;
  questionnaireDetail?: { question?: string };
}

/** One MMU/TM beneficiary visit (case-sheet history) row. */
export interface MmuVisitRow {
  benFlowID?: number;
  beneficiaryRegID?: number;
  visitCode?: number | string;
  VisitReason?: string;
  VisitCategory?: string;
  benVisitNo?: number;
  benVisitDate?: string;
}
