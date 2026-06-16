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
 * Options for {@link ConfirmDialogService.confirm}.
 *
 * Migrated from the legacy `ConfirmationDialogsService.confirm(title, message, ...)`
 * positional API to a single options object.
 *
 * The legacy `status` argument (info/success/error header coloring) is intentionally
 * omitted: every legacy `confirm()` call site used the default `'info'`; the
 * non-default statuses were only ever used with `alert()`. A `status` field will be
 * reintroduced alongside the deferred `alert()` wrapper if/when a call site needs it,
 * rather than added now as a prop the ZardUI dialog cannot yet render.
 */
export interface ConfirmDialogOptions {
  /** Heading shown at the top of the dialog. */
  title: string;
  /** Body text describing what the user is confirming. */
  message: string;
  /** Label for the confirm button. Defaults to `'OK'`. */
  okText?: string;
  /** Label for the cancel button. Defaults to `'Cancel'`. */
  cancelText?: string;
  /**
   * Renders the confirm button with the destructive (danger) style.
   * Use for irreversible actions such as delete. Defaults to `false`.
   */
  destructive?: boolean;
}
