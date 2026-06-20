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

import { TranslationKey } from './en';

/**
 * Hindi dictionary. Typed as a complete map of {@link TranslationKey} so a
 * missing or stray key fails the build rather than silently falling back.
 */
export const hi: Record<TranslationKey, string> = {
  'dashboard.header.appName': 'अमृत 104 हेल्पलाइन',
  'dashboard.header.logoAlt': 'पिरामल स्वास्थ्य',
  'dashboard.header.service': 'सेवा',
  'dashboard.header.role': 'भूमिका',
  'dashboard.header.welcome': 'स्वागत है',
  'dashboard.header.languageLabel': 'भाषा',
  'dashboard.header.profile': 'प्रोफ़ाइल',
  'dashboard.header.logout': 'लॉग आउट',
  'dashboard.header.logoutConfirm': 'क्या आप वाकई लॉग आउट करना चाहते हैं?',
  'dashboard.agentId.label': 'मेरी आईडी: एजेंट',
  'dashboard.campaign.label': 'कॉल मोड',
  'dashboard.campaign.inbound': 'इनबाउंड',
  'dashboard.campaign.outbound': 'आउटबाउंड',
  'dashboard.callStatistics.title': 'कॉल आँकड़े',
  'dashboard.callStatistics.callDuration': 'कॉल अवधि',
  'dashboard.callStatistics.breakTime': 'विराम समय',
  'dashboard.callStatistics.freeTime': 'खाली समय',
  'dashboard.callStatistics.totalCalls': 'कुल कॉल',
};
