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
 * Assamese dictionary. Typed as a complete map of {@link TranslationKey} so a
 * missing or stray key fails the build rather than silently falling back.
 */
export const as: Record<TranslationKey, string> = {
  // Header
  'dashboard.header.logoAlt': 'পিৰামল স্বাস্থ্য',
  'dashboard.header.titleSuffix': 'ডেশ্ববৰ্ড',
  'dashboard.header.languageLabel': 'ভাষা বাছনি কৰক',
  'dashboard.header.languageComingSoon': 'আমি এই ভাষাটোৰ সৈতে আহি আছোঁ',
  'dashboard.header.welcome': 'স্বাগতম',
  'dashboard.header.contacts': 'জৰুৰীকালীন যোগাযোগ',
  'dashboard.header.profile': 'প্ৰ’ফাইল',
  'dashboard.header.help': 'সহায়',
  'dashboard.header.version': 'সংস্কৰণ',
  'dashboard.header.licenseInfo': 'অনুজ্ঞাপত্ৰ তথ্য',
  'dashboard.header.logout': 'লগ আউট',

  // Sidebar
  'dashboard.sidebar.switchRole': 'ভূমিকা সলনি কৰক',
  'dashboard.sidebar.activityArea': 'কাৰ্যকলাপ ক্ষেত্ৰ',

  // Agent ID
  'dashboard.agentId.label': 'মোৰ আইডি : প্ৰতিনিধি -',

  // Campaign
  'dashboard.campaign.label': 'কল ম’ড',
  'dashboard.campaign.inbound': 'ভিতৰৰ',
  'dashboard.campaign.outbound': 'বাহিৰৰ',
  'dashboard.campaign.switchToInboundConfirm': 'ভিতৰৰ ম’ডলৈ সলনি কৰিবনে?',
  'dashboard.campaign.switchToOutboundConfirm': 'বাহিৰৰ ম’ডলৈ সলনি কৰিবনে?',
  'dashboard.campaign.switchError':
    'কল ম’ড সলনি কৰিব পৰা নগ’ল। অনুগ্ৰহ কৰি পুনৰ চেষ্টা কৰক।',

  // Call statistics
  'dashboard.callStatistics.title': 'কল পৰিসংখ্যা',
  'dashboard.callStatistics.callDuration': 'কলৰ সময়',
  'dashboard.callStatistics.breakTime': 'বিৰতি সময়',
  'dashboard.callStatistics.freeTime': 'মুক্ত সময়',
  'dashboard.callStatistics.totalCalls': 'মুঠ কল',
  'dashboard.callStatistics.hrs': 'ঘণ্টা',
  'dashboard.callStatistics.mins': 'মিনিট',
  'dashboard.callStatistics.secs': 'ছেকেণ্ড',

  // Alerts & Notifications panel
  'dashboard.alerts.title': 'সতৰ্কবাণী আৰু জাননী',
  'dashboard.alerts.alerts': 'সতৰ্কবাণী',
  'dashboard.alerts.officeBulletin': 'কাৰ্যালয় বুলেটিন',
  'dashboard.alerts.notifications': 'জাননী',
  'dashboard.alerts.noAlerts': 'কোনো সতৰ্কবাণী বাৰ্তা পোৱা নগ’ল',
  'dashboard.alerts.noOfficeBulletin': 'কোনো কাৰ্যালয় বাৰ্তা পোৱা নগ’ল',
  'dashboard.alerts.noNotifications': 'কোনো জাননী বাৰ্তা পোৱা নগ’ল',

  // Reports panel
  'dashboard.reports.title': 'প্ৰতিবেদন',
  'dashboard.reports.sno': 'ক্ৰম',
  'dashboard.reports.reportName': 'প্ৰতিবেদনৰ নাম',
  'dashboard.reports.date': 'তাৰিখ',
  'dashboard.reports.export': 'ৰপ্তানি',
  'dashboard.reports.more': 'সকলো চাওক →',

  // Activity for this week panel
  'dashboard.activity.title': 'এই সপ্তাহৰ কাৰ্যকলাপ',
  'dashboard.activity.trainingResources': 'প্ৰশিক্ষণ সম্পদ',
  'dashboard.activity.more': 'সকলো চাওক →',
  'dashboard.activity.kmDocsTitle': 'কেএম নথি',
  'dashboard.activity.noKmDocs': 'কোনো কেএম নথি পোৱা নগ’ল',

  // Rating panel
  'dashboard.rating.title': 'মূল্যাংকন',
  'dashboard.rating.panelContent': 'পেনেল সমল',

  // Emergency contacts modal
  'dashboard.contacts.name': 'নাম',
  'dashboard.contacts.number': 'নম্বৰ',
  'dashboard.contacts.empty': 'কোনো জৰুৰীকালীন যোগাযোগ পোৱা নগ’ল',

  // Footer
  'dashboard.footer.feedback': 'প্ৰতিক্ৰিয়া',
  'dashboard.footer.version': 'সংস্কৰণ',

  // Shared dialog chrome
  'dashboard.dialog.info': 'তথ্য',
  'dashboard.dialog.error': 'ত্ৰুটি',
  'dashboard.dialog.ok': 'ঠিক আছে',
  'dashboard.dialog.cancel': 'বাতিল',

  // On-call workspace (Innerpage) shell
  'innerpage.callerNumber': 'কলাৰৰ নম্বৰ',
  'innerpage.timer.ariaLabel': 'কলৰ ম্যাদ',
  'innerpage.statusOnCall': 'কলত আছে',
  'innerpage.dispatcherTitle': 'কল কৰ্মক্ষেত্ৰ',
  'innerpage.dispatcherHint':
    'কলাৰ চিনাক্ত হোৱাৰ লগে লগে ভূমিকা কৰ্মক্ষেত্ৰ (পঞ্জীয়ন, সেৱা আৰু সমাপ্তি) ইয়াত খোল খাব।',
  'innerpage.identifyCaller': 'কলাৰ চিনাক্ত কৰক',

  // Beneficiary registration / caller identification
  'registration.title': 'কলাৰ চিনাক্ত কৰক',
  'registration.subtitle': 'এই কলটো এজন হিতাধিকাৰীৰ সৈতে মিলাওক',
  'registration.tab.history': 'এই নম্বৰ',
  'registration.tab.search': 'সন্ধান কৰক',
  'registration.tab.register': 'নতুন পঞ্জীয়ন',
  'registration.history.heading': 'এই নম্বৰৰ বাবে পঞ্জীয়ন',
  'registration.history.loading': 'পঞ্জীয়ন ল’ড হৈ আছে…',
  'registration.history.empty': 'এই নম্বৰৰ বাবে কোনো পঞ্জীয়ন পোৱা নগ’ল।',
  'registration.search.empty': 'আপোনাৰ সন্ধানৰ সৈতে কোনো হিতাধিকাৰী মিলা নাই।',
  'registration.search.prompt': 'নাম বা পঞ্জীয়ন আইডি দিয়ক, তাৰ পিছত সন্ধান কৰক।',
  'registration.col.regId': 'পঞ্জী. আইডি',
  'registration.col.name': 'নাম',
  'registration.col.gender': 'লিংগ',
  'registration.col.age': 'বয়স',
  'registration.col.relationship': 'সম্পৰ্ক',
  'registration.col.district': 'জিলা',
  'registration.col.action': 'কাৰ্য',
  'registration.action.select': 'বাছনি কৰক',
  'registration.field.firstName': 'নাম',
  'registration.field.lastName': 'উপনাম',
  'registration.field.benId': 'পঞ্জীয়ন আইডি',
  'registration.field.gender': 'লিংগ',
  'registration.field.age': 'বয়স',
  'registration.field.phone': 'ফোন নম্বৰ',
  'registration.field.genderPlaceholder': 'লিংগ বাছনি কৰক',
  'registration.gender.male': 'পুৰুষ',
  'registration.gender.female': 'মহিলা',
  'registration.gender.transgender': 'ৰূপান্তৰকামী',
  'registration.action.search': 'সন্ধান কৰক',
  'registration.action.register': 'হিতাধিকাৰী পঞ্জীয়ন কৰক',
  'registration.validation.required': 'এই ক্ষেত্ৰটো আৱশ্যক।',
  'registration.validation.firstNameMin': 'কমেও ৩টা আখৰ দিয়ক।',
  'registration.validation.whitespace': 'কেৱল ৰিক্ত স্থান হ’ব নোৱাৰে।',
  'registration.validation.age': 'বৈধ বয়স দিয়ক (১–১২০)।',
  'registration.validation.phone': 'বৈধ ১০-অংকীয় ফোন নম্বৰ দিয়ক।',
  'registration.validation.searchCriteria':
    'সন্ধান কৰিবলৈ নাম বা পঞ্জীয়ন আইডি দিয়ক।',
  'registration.toast.selected': 'এই কলৰ বাবে হিতাধিকাৰী বাছনি কৰা হ’ল।',
  'registration.toast.registered': 'হিতাধিকাৰী পঞ্জীয়ন আৰু বাছনি কৰা হ’ল।',
  'registration.toast.error': 'কিবা ভুল হ’ল। অনুগ্ৰহ কৰি পুনৰ চেষ্টা কৰক।',
  'registration.toast.noCli': 'এই কলৰ বাবে কোনো কলাৰ নম্বৰ উপলব্ধ নহয়।',
  'registration.toast.masterError': 'কিছুমান ফৰ্ম বিকল্প ল’ড কৰিব পৰা নগ’ল।',
  'registration.notice.noCli':
    'এই কলৰ বাবে কোনো কলাৰ নম্বৰ উপলব্ধ নোহোৱাৰ বাবে পঞ্জীয়ন উপলব্ধ নহয়।',
  'registration.section.identity': 'ব্যক্তিগত বিৱৰণ',
  'registration.section.address': 'ঠিকনা আৰু যোগাযোগ',
  'registration.field.title': 'উপাধি',
  'registration.field.healthcareWorker': 'স্বাস্থ্যকৰ্মী?',
  'registration.field.yes': 'হয়',
  'registration.field.no': 'নহয়',
  'registration.field.hcwType': 'স্বাস্থ্যকৰ্মীৰ প্ৰকাৰ',
  'registration.field.emergency': 'জৰুৰীকালীন পঞ্জীয়ন',
  'registration.field.dob': 'জন্ম তাৰিখ',
  'registration.field.ageUnit': 'বয়সৰ একক',
  'registration.field.relationship': 'সম্পৰ্ক',
  'registration.field.caste': 'জাতি / সম্প্ৰদায়',
  'registration.field.maritalStatus': 'বৈবাহিক স্থিতি',
  'registration.field.fatherSpouse': 'পিতৃ / পতি-পত্নীৰ নাম',
  'registration.field.education': 'শিক্ষা',
  'registration.field.idType': 'পৰিচয়ৰ প্ৰকাৰ',
  'registration.field.idNumber': 'পৰিচয় নম্বৰ',
  'registration.field.state': 'ৰাজ্য',
  'registration.field.district': 'জিলা',
  'registration.field.subDistrict': 'উপ-জিলা / ব্লক',
  'registration.field.village': 'গাঁও',
  'registration.field.houseNumber': 'ঘৰ / দুৱাৰ / ফ্লেট নং.',
  'registration.field.pincode': 'পিনক’ড',
  'registration.field.alternateNumber': 'বিকল্প নম্বৰ',
  'registration.field.selectPlaceholder': 'বাছনি কৰক',
  'registration.ageUnit.years': 'বছৰ',
  'registration.ageUnit.months': 'মাহ',
  'registration.ageUnit.days': 'দিন',
  'registration.action.next': 'পৰৱৰ্তী',
  'registration.action.back': 'পিছলৈ',
  'registration.validation.ageRange': 'বৈধ বয়স দিয়ক।',
  'registration.validation.idInvalid': 'বৈধ পৰিচয় নম্বৰ দিয়ক।',
  'registration.validation.pincode': 'বৈধ ৬-অংকীয় পিনক’ড দিয়ক।',

  // Supervisor placeholder page
  'supervisor.title': 'তত্ত্বাৱধায়ক কাৰ্যকলাপ ক্ষেত্ৰ',
  'supervisor.intro':
    'তত্ত্বাৱধায়কৰ বাবে কাৰ্যকলাপ, প্ৰতিবেদন আৰু কনফিগাৰেচন ইয়াত পৰিচালনা কৰা হ’ব।',
  'supervisor.backToDashboard': 'ডেশ্ববৰ্ডলৈ উভতি যাওক',

  // Post-logout feedback page
  'feedback.loggedOut': 'আপুনি ছেচনৰ পৰা লগ আউট হৈছে',
  'feedback.subtitle': 'আমি আপোনাৰ অভিজ্ঞতাৰ বিষয়ে জানিব বিচাৰোঁ (বৈকল্পিক)',
  'feedback.rateAria': 'আপোনাৰ অভিজ্ঞতা মূল্যাংকন কৰক',
  'feedback.ratingTerrible': 'অতি বেয়া',
  'feedback.ratingBad': 'বেয়া',
  'feedback.ratingOkay': 'মোটামুটি',
  'feedback.ratingGood': 'ভাল',
  'feedback.ratingGreat': 'অতি উত্তম',
  'feedback.category': 'শ্ৰেণী',
  'feedback.selectCategory': 'শ্ৰেণী বাছনি কৰক',
  'feedback.catCallCenter': 'কল চেণ্টাৰ সেৱা',
  'feedback.catFacilityCleanliness': 'সুবিধা পৰিচ্ছন্নতা',
  'feedback.catMedicineAvailability': 'ঔষধৰ উপলব্ধতা',
  'feedback.catPatientCare': 'ৰোগীৰ যত্ন',
  'feedback.catStaffBehavior': 'কৰ্মচাৰীৰ আচৰণ',
  'feedback.catWaitTime': 'অপেক্ষাৰ সময়',
  'feedback.commentPlaceholder': 'আমি ইয়াক কেনেকৈ উন্নত কৰিব পাৰোঁ…',
  'feedback.anonymousNote':
    'আপুনি লগ ইন কৰা নাই, এই প্ৰতিক্ৰিয়া বেনামীভাৱে দাখিল কৰা হ’ব।',
  'feedback.close': 'বন্ধ কৰক',
  'feedback.okay': 'ঠিক আছে',
};
