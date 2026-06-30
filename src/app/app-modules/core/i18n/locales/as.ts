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

  // HAO workspace shell
  'hao.workspace.title': 'স্বাস্থ্য সহায়ক বিষয়া',
  'hao.workspace.subtitle': 'কলাৰক সেৱা আগবঢ়াওক, তাৰ পিছত কল বন্ধ কৰক।',
  'hao.workspace.stepService': 'সেৱা আগবঢ়াওক',
  'hao.workspace.stepClosure': 'সমাপন',
  'hao.workspace.backToRo': 'আৰঅ’লৈ উভতি যাওক',
  'hao.workspace.cancel': 'বাতিল কৰক',
  'hao.workspace.proceedToClosure': 'সমাপনলৈ আগবাঢ়ক',
  'hao.workspace.proceedTitle': 'সমাপন',
  'hao.workspace.proceedConfirm': 'এই কলৰ বাবে সমাপনলৈ আগবাঢ়িব নে?',
  'hao.workspace.cancelTitle': 'বাতিল কৰক',
  'hao.workspace.cancelConfirm': 'সেৱা আগবঢ়োৱালৈ উভতি যাব নে?',

  // HAO service tabs ("Provide Service" step)
  'hao.service.tablistLabel': 'সেৱাসমূহ',
  'hao.service.comingSoon': 'এই সেৱা সোনকালে উপলব্ধ হ’ব।',
  'hao.service.healthAdvisory': 'স্বাস্থ্য পৰামৰ্শ',
  'hao.service.diabeticScreening': 'মধুমেহ পৰীক্ষা',
  'hao.service.bpScreening': 'ৰক্তচাপ পৰীক্ষা',
  'hao.service.bloodOnCall': 'ব্লাড অন কল',
  'hao.service.directory': 'নিৰ্দেশিকা সেৱা',
  'hao.service.epidemic': 'মহামাৰীৰ প্ৰাদুৰ্ভাৱ',
  'hao.service.foodSafety': 'খাদ্য সুৰক্ষা',
  'hao.service.grievance': 'অভিযোগ',
  'hao.service.organDonation': 'অংগ দান',
  'hao.service.schemes': 'স্বাস্থ্য আঁচনি',
  'hao.service.covid19': 'কোভিড-১৯',
  'hao.service.imrMmr': 'আইএমআৰ / এমএমআৰ তথ্য',
  'hao.service.balVivah': 'বাল বিবাহ',

  // HAO case sheet (Health Advisory)
  'hao.caseSheet.chiefComplaints': 'মুখ্য অভিযোগ',
  'hao.caseSheet.chiefComplaintsPlaceholder': 'কলাৰৰ অভিযোগসমূহ বৰ্ণনা কৰক',
  'hao.caseSheet.chiefComplaintsRequired': 'মুখ্য অভিযোগ আৱশ্যক।',
  'hao.caseSheet.chiefComplaintsTooLong':
    'মুখ্য অভিযোগ 2000 আখৰৰ ভিতৰত হ’ব লাগে।',
  'hao.caseSheet.provisionalDiagnosis': 'অস্থায়ী নিৰ্ণয়',
  'hao.caseSheet.selectDiagnosis': 'নিৰ্ণয় বাছনি কৰক',
  'hao.caseSheet.healthAdvice': 'স্বাস্থ্য পৰামৰ্শ',
  'hao.caseSheet.healthAdvicePlaceholder': 'কলাৰক দিয়া পৰামৰ্শ',
  'hao.caseSheet.remarks': 'মন্তব্য',
  'hao.caseSheet.save': 'কেছ শ্বীট সংৰক্ষণ কৰক',
  'hao.caseSheet.saveSuccess': 'কেছ শ্বীট সফলতাৰে সংৰক্ষণ কৰা হ’ল।',
  'hao.caseSheet.saveError': 'কেছ শ্বীট সংৰক্ষণ কৰিব পৰা নগ’ল। অনুগ্ৰহ কৰি পুনৰ চেষ্টা কৰক।',

  // HAO closure step
  'hao.closure.emergency': 'জৰুৰীকালীন',
  'hao.closure.suicidal': 'আত্মঘাতী',
  'hao.closure.callType': 'কলৰ প্ৰকাৰ',
  'hao.closure.selectCallType': 'কলৰ প্ৰকাৰ বাছনি কৰক',
  'hao.closure.callTypeRequired': 'কলৰ প্ৰকাৰ আৱশ্যক।',
  'hao.closure.callSubType': 'কলৰ উপ-প্ৰকাৰ',
  'hao.closure.selectCallSubType': 'কলৰ উপ-প্ৰকাৰ বাছনি কৰক',
  'hao.closure.callSubTypeRequired': 'কলৰ উপ-প্ৰকাৰ আৱশ্যক।',
  'hao.closure.followUpRequired': 'অনুসৰণ আৱশ্যক',
  'hao.closure.followUpDate': 'অনুসৰণৰ তাৰিখ',
  'hao.closure.followUpDateRequired': 'অনুসৰণৰ তাৰিখ আৱশ্যক।',
  'hao.closure.remarks': 'মন্তব্য',
  'hao.closure.transferCall': 'কল স্থানান্তৰ কৰক',
  'hao.closure.transferCampaign': 'অভিযান',
  'hao.closure.selectCampaign': 'অভিযান বাছনি কৰক',
  'hao.closure.transferSkill': 'দক্ষতা',
  'hao.closure.selectSkill': 'দক্ষতা বাছনি কৰক',
  'hao.closure.transfer': 'স্থানান্তৰ কৰক',
  'hao.closure.submitContinue': 'দাখিল কৰক আৰু অব্যাহত ৰাখক',
  'hao.closure.submitClose': 'দাখিল কৰক আৰু বন্ধ কৰক',
  'hao.closure.confirmTitle': 'সমাপন',
  'hao.closure.confirmContinue': 'এই ডিচপোজিচন দাখিল কৰি কল অব্যাহত ৰাখিব নে?',
  'hao.closure.confirmClose': 'এই ডিচপোজিচন দাখিল কৰি কল বন্ধ কৰিব নে?',
  'hao.closure.confirmTransfer': 'এই কল বাছনি কৰা অভিযানলৈ স্থানান্তৰ কৰিব নে?',
  'hao.closure.noCallError': 'বন্ধ কৰিবলৈ কোনো সক্ৰিয় কল নাই।',
  'hao.closure.closeError': 'কল বন্ধ কৰিব পৰা নগ’ল। অনুগ্ৰহ কৰি পুনৰ চেষ্টা কৰক।',
  'hao.closure.transferError': 'কল স্থানান্তৰ কৰিব পৰা নগ’ল। অনুগ্ৰহ কৰি পুনৰ চেষ্টা কৰক।',
  'hao.closure.callTypesLoadError':
    'কলৰ প্ৰকাৰ ল’ড কৰিব পৰা নগ’ল। অনুগ্ৰহ কৰি পুনৰ চেষ্টা কৰক।',
  'hao.closure.noServiceError':
    'আপোনাৰ ভূমিকাত কোনো সেৱা নিযুক্ত কৰা হোৱা নাই, সেয়েহে কলৰ প্ৰকাৰ ল’ড কৰিব পৰা নগ’ল। অনুগ্ৰহ কৰি আপোনাৰ প্ৰশাসকৰ সৈতে যোগাযোগ কৰক।',
};
