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
 * English dictionary — the canonical key set. Its keys define
 * {@link TranslationKey}, which every other locale must implement in full.
 */
export const en = {
  'dashboard.header.appName': 'AMRIT 104 Helpline',
  'dashboard.header.logoAlt': 'Piramal Swasthya',
  'dashboard.header.service': 'Service',
  'dashboard.header.role': 'Role',
  'dashboard.header.welcome': 'Welcome',
  'dashboard.header.languageLabel': 'Language',
  'dashboard.header.profile': 'Profile',
  'dashboard.header.logout': 'Log out',
  'dashboard.header.logoutConfirm': 'Are you sure you want to log out?',
  'dashboard.agentId.label': 'My ID: Agent',
  'dashboard.campaign.label': 'Call mode',
  'dashboard.campaign.inbound': 'Inbound',
  'dashboard.campaign.outbound': 'Outbound',
  'dashboard.callStatistics.title': 'Call statistics',
  'dashboard.callStatistics.callDuration': 'Call duration',
  'dashboard.callStatistics.breakTime': 'Break time',
  'dashboard.callStatistics.freeTime': 'Free time',
  'dashboard.callStatistics.totalCalls': 'Total calls',
} as const;

/** Every translatable key in the app, derived from the English dictionary. */
export type TranslationKey = keyof typeof en;
