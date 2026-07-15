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
 * Types for the supervisor upload-schemes screen, derived from the legacy
 * `SupervisorSchemeComponent` + `SchemeService`. Endpoints (common base, POST):
 *   - beneficiary/get/schemeList        { providerServiceMapID }
 *   - beneficiary/save/schemeDetails    SaveSchemeRequest
 *   - beneficiary/scheme/deleteScheme   { schemeID, deleted }
 */

/** Attachment descriptor on a scheme (subset the screen uses). */
export interface SchemeFileManager {
  fileName?: string;
  fileExtension?: string;
  providerServiceMapID?: number | null;
  userID?: number | null;
  /** Base64 content (data-URI payload without the prefix). */
  fileContent?: string;
  createdBy?: string | null;
  deleted?: boolean;
}

/** One scheme row (`beneficiary/get/schemeList`). */
export interface SchemeRow {
  schemeID: number;
  schemeName?: string;
  schemeDesc?: string;
  deleted?: boolean;
  kmFileManagerID?: number;
  kmFileManager?: { fileName?: string };
  kmFilePath?: string;
}

/** Body for `beneficiary/save/schemeDetails` (create and modify). */
export interface SaveSchemeRequest {
  providerServiceMapID: number | null;
  schemeName: string | null;
  schemeDesc: string | null;
  deleted: boolean;
  createdBy: string | null;
  schemeID?: number;
  kmFileManagerID?: number;
  kmFileManager: SchemeFileManager;
}
