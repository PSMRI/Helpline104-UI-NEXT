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
 * Shapes for the caller-disconnect wrap-up flow (legacy `innerpage.component`'s
 * `startCallWraupup`/`getWrapupExceedsCallTypeID`), documented against the
 * legacy `Helpline104-UI` source (`innerpage/innerpage.component.ts`,
 * `services/common/caller.service.ts`).
 */

/** Response of `GET {ip104}user/role/{roleID}` — the role's wrap-up grace period. */
export interface RoleWrapupTime {
  isWrapUpTime: boolean;
  /** Seconds the agent has to close the call before it is auto-closed. */
  wrapUpTime: number;
}
