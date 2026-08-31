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
 * Types for the post-logout platform feedback API. Endpoints:
 *   - GET  platform-feedback/categories?serviceLine=<sl>  (common API, open)
 *   - POST platform-feedback  { rating, categorySlug, comment, isAnonymous, serviceLine }
 */

/** A selectable feedback category, scoped to a service line or GLOBAL. */
export interface FeedbackCategory {
  categoryId: string;
  slug: string;
  label: string;
  scope: string;
  active: boolean;
}

/** Submission payload sent to POST platform-feedback. */
export interface FeedbackSubmitRequest {
  rating: number;
  categorySlug: string;
  comment: string;
  isAnonymous: boolean;
  serviceLine: string;
}

/** Response returned after a successful submission. */
export interface FeedbackSubmitResponse {
  id: string;
  createdAt: string;
}

/** A normalised platform-feedback API error the component can display. */
export interface FeedbackApiError {
  status: number;
  errorMessage: string;
}
