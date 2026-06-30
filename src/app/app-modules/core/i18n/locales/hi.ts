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
  // Header
  'dashboard.header.logoAlt': 'पिरामल स्वास्थ्य',
  'dashboard.header.titleSuffix': 'डैशबोर्ड',
  'dashboard.header.languageLabel': 'भाषा चुनें',
  'dashboard.header.languageComingSoon': 'हम इस भाषा के साथ आ रहे हैं',
  'dashboard.header.welcome': 'स्वागत है',
  'dashboard.header.contacts': 'आपातकालीन संपर्क',
  'dashboard.header.profile': 'प्रोफ़ाइल',
  'dashboard.header.help': 'सहायता',
  'dashboard.header.version': 'संस्करण',
  'dashboard.header.licenseInfo': 'लाइसेंस जानकारी',
  'dashboard.header.logout': 'लॉग आउट',

  // Sidebar
  'dashboard.sidebar.switchRole': 'भूमिका बदलें',
  'dashboard.sidebar.activityArea': 'गतिविधि क्षेत्र',

  // Agent ID
  'dashboard.agentId.label': 'मेरी आईडी : प्रतिनिधि -',

  // Campaign
  'dashboard.campaign.label': 'कॉल मोड',
  'dashboard.campaign.inbound': 'भीतर का',
  'dashboard.campaign.outbound': 'बाहर का',
  'dashboard.campaign.switchToInboundConfirm': 'भीतर के मोड में बदलें?',
  'dashboard.campaign.switchToOutboundConfirm': 'बाहर के मोड में बदलें?',
  'dashboard.campaign.switchError': 'कॉल मोड बदलने में असमर्थ। कृपया पुनः प्रयास करें।',

  // Call statistics
  'dashboard.callStatistics.title': 'कॉल सांख्यिकी',
  'dashboard.callStatistics.callDuration': 'कॉल की अवधि',
  'dashboard.callStatistics.breakTime': 'विराम समय',
  'dashboard.callStatistics.freeTime': 'खाली समय',
  'dashboard.callStatistics.totalCalls': 'कुल कॉल',
  'dashboard.callStatistics.hrs': 'घंटे',
  'dashboard.callStatistics.mins': 'मिनट',
  'dashboard.callStatistics.secs': 'सेकंड',

  // Alerts & Notifications panel
  'dashboard.alerts.title': 'चेतावनी और सूचनाएं',
  'dashboard.alerts.alerts': 'चेतावनी',
  'dashboard.alerts.officeBulletin': 'कार्यालय बुलेटिन',
  'dashboard.alerts.notifications': 'सूचनाएं',
  'dashboard.alerts.noAlerts': 'कोई चेतावनी संदेश नहीं मिला',
  'dashboard.alerts.noOfficeBulletin': 'कोई कार्यालय संदेश नहीं मिला',
  'dashboard.alerts.noNotifications': 'कोई सूचना संदेश नहीं मिला',

  // Reports panel
  'dashboard.reports.title': 'विवरण',
  'dashboard.reports.sno': 'क्र.सं.',
  'dashboard.reports.reportName': 'विवरण का नाम',
  'dashboard.reports.date': 'तारीख',
  'dashboard.reports.export': 'निर्यात',
  'dashboard.reports.more': 'सभी देखें →',

  // Activity for this week panel
  'dashboard.activity.title': 'इस सप्ताह के लिए गतिविधि',
  'dashboard.activity.trainingResources': 'प्रशिक्षण संसाधन',
  'dashboard.activity.more': 'सभी देखें →',
  'dashboard.activity.kmDocsTitle': 'केएम दस्तावेज़',
  'dashboard.activity.noKmDocs': 'कोई केएम दस्तावेज़ नहीं मिला',

  // Rating panel
  'dashboard.rating.title': 'रेटिंग',
  'dashboard.rating.panelContent': 'पैनल सामग्री',

  // Emergency contacts modal
  'dashboard.contacts.name': 'नाम',
  'dashboard.contacts.number': 'नंबर',
  'dashboard.contacts.empty': 'कोई आपातकालीन संपर्क नहीं मिला',

  // Footer
  'dashboard.footer.feedback': 'प्रतिक्रिया',
  'dashboard.footer.version': 'संस्करण',

  // Shared dialog chrome
  'dashboard.dialog.info': 'सूचना',
  'dashboard.dialog.error': 'त्रुटि',
  'dashboard.dialog.ok': 'ठीक है',
  'dashboard.dialog.cancel': 'रद्द करें',

  // On-call workspace (Innerpage) shell
  'innerpage.callerNumber': 'कॉल करने वाले का नंबर',
  'innerpage.timer.ariaLabel': 'कॉल अवधि',
  'innerpage.statusOnCall': 'कॉल पर',
  'innerpage.dispatcherTitle': 'कॉल कार्यक्षेत्र',
  'innerpage.dispatcherHint':
    'कॉल करने वाले की पहचान होते ही भूमिका कार्यक्षेत्र (पंजीकरण, सेवा और समापन) यहाँ खुलेगा।',

  // Supervisor placeholder page
  'supervisor.title': 'पर्यवेक्षक गतिविधि क्षेत्र',
  'supervisor.intro':
    'पर्यवेक्षकों के लिए गतिविधियाँ, विवरण और कॉन्फ़िगरेशन यहाँ प्रबंधित किए जाएंगे।',
  'supervisor.backToDashboard': 'डैशबोर्ड पर वापस जाएं',

  // Post-logout feedback page
  'feedback.loggedOut': 'आप सत्र से लॉग आउट हो गए हैं',
  'feedback.subtitle': 'हम आपके अनुभव के बारे में जानना चाहेंगे (वैकल्पिक)',
  'feedback.rateAria': 'अपने अनुभव को रेट करें',
  'feedback.ratingTerrible': 'बहुत खराब',
  'feedback.ratingBad': 'खराब',
  'feedback.ratingOkay': 'ठीक-ठाक',
  'feedback.ratingGood': 'अच्छा',
  'feedback.ratingGreat': 'बहुत अच्छा',
  'feedback.category': 'श्रेणी',
  'feedback.selectCategory': 'श्रेणी चुनें',
  'feedback.catCallCenter': 'कॉल सेंटर सेवा',
  'feedback.catFacilityCleanliness': 'सुविधा स्वच्छता',
  'feedback.catMedicineAvailability': 'दवा उपलब्धता',
  'feedback.catPatientCare': 'रोगी देखभाल',
  'feedback.catStaffBehavior': 'कर्मचारी व्यवहार',
  'feedback.catWaitTime': 'प्रतीक्षा समय',
  'feedback.commentPlaceholder': 'हम इसे कैसे बेहतर बना सकते हैं…',
  'feedback.anonymousNote':
    'आप लॉग इन नहीं हैं, यह प्रतिक्रिया गुमनाम रूप से सबमिट की जाएगी।',
  'feedback.close': 'बंद करें',
  'feedback.okay': 'ठीक है',

  // HAO workspace shell
  'hao.workspace.title': 'स्वास्थ्य सहायक अधिकारी',
  'hao.workspace.subtitle': 'कॉल करने वाले को सेवा प्रदान करें, फिर कॉल बंद करें।',
  'hao.workspace.stepService': 'सेवा प्रदान करें',
  'hao.workspace.stepClosure': 'समापन',
  'hao.workspace.backToRo': 'आरओ पर वापस जाएं',
  'hao.workspace.cancel': 'रद्द करें',
  'hao.workspace.proceedToClosure': 'समापन की ओर बढ़ें',
  'hao.workspace.proceedTitle': 'समापन',
  'hao.workspace.proceedConfirm': 'इस कॉल के लिए समापन की ओर बढ़ें?',
  'hao.workspace.cancelTitle': 'रद्द करें',
  'hao.workspace.cancelConfirm': 'सेवा प्रदान करने पर वापस जाएं?',

  // HAO service tabs ("Provide Service" step)
  'hao.service.tablistLabel': 'सेवाएं',
  'hao.service.comingSoon': 'यह सेवा शीघ्र ही उपलब्ध होगी।',
  'hao.service.healthAdvisory': 'स्वास्थ्य सलाह',
  'hao.service.diabeticScreening': 'मधुमेह जांच',
  'hao.service.bpScreening': 'रक्तचाप जांच',
  'hao.service.bloodOnCall': 'ब्लड ऑन कॉल',
  'hao.service.directory': 'निर्देशिका सेवाएं',
  'hao.service.epidemic': 'महामारी प्रकोप',
  'hao.service.foodSafety': 'खाद्य सुरक्षा',
  'hao.service.grievance': 'शिकायत',
  'hao.service.organDonation': 'अंगदान',
  'hao.service.schemes': 'स्वास्थ्य योजनाएं',
  'hao.service.covid19': 'कोविड-19',
  'hao.service.imrMmr': 'आईएमआर / एमएमआर जानकारी',
  'hao.service.balVivah': 'बाल विवाह',

  // HAO case sheet (Health Advisory)
  'hao.caseSheet.chiefComplaints': 'मुख्य शिकायतें',
  'hao.caseSheet.chiefComplaintsPlaceholder': 'कॉल करने वाले की शिकायतें बताएं',
  'hao.caseSheet.chiefComplaintsRequired': 'मुख्य शिकायतें आवश्यक हैं।',
  'hao.caseSheet.chiefComplaintsTooLong':
    'मुख्य शिकायतें 2000 अक्षरों से अधिक नहीं होनी चाहिए।',
  'hao.caseSheet.provisionalDiagnosis': 'अस्थायी निदान',
  'hao.caseSheet.selectDiagnosis': 'निदान चुनें',
  'hao.caseSheet.healthAdvice': 'स्वास्थ्य सलाह',
  'hao.caseSheet.healthAdvicePlaceholder': 'कॉल करने वाले को दी गई सलाह',
  'hao.caseSheet.remarks': 'टिप्पणियां',
  'hao.caseSheet.save': 'केस शीट सहेजें',
  'hao.caseSheet.saveSuccess': 'केस शीट सफलतापूर्वक सहेजी गई।',
  'hao.caseSheet.saveError': 'केस शीट सहेजने में असमर्थ। कृपया पुनः प्रयास करें।',

  // HAO closure step
  'hao.closure.emergency': 'आपातकाल',
  'hao.closure.suicidal': 'आत्मघाती',
  'hao.closure.callType': 'कॉल प्रकार',
  'hao.closure.selectCallType': 'कॉल प्रकार चुनें',
  'hao.closure.callTypeRequired': 'कॉल प्रकार आवश्यक है।',
  'hao.closure.callSubType': 'कॉल उप-प्रकार',
  'hao.closure.selectCallSubType': 'कॉल उप-प्रकार चुनें',
  'hao.closure.callSubTypeRequired': 'कॉल उप-प्रकार आवश्यक है।',
  'hao.closure.followUpRequired': 'अनुवर्ती आवश्यक',
  'hao.closure.followUpDate': 'अनुवर्ती तिथि',
  'hao.closure.followUpDateRequired': 'अनुवर्ती तिथि आवश्यक है।',
  'hao.closure.remarks': 'टिप्पणियां',
  'hao.closure.transferCall': 'कॉल स्थानांतरित करें',
  'hao.closure.transferCampaign': 'अभियान',
  'hao.closure.selectCampaign': 'अभियान चुनें',
  'hao.closure.transferSkill': 'कौशल',
  'hao.closure.selectSkill': 'कौशल चुनें',
  'hao.closure.transfer': 'स्थानांतरित करें',
  'hao.closure.submitContinue': 'सबमिट करें और जारी रखें',
  'hao.closure.submitClose': 'सबमिट करें और बंद करें',
  'hao.closure.confirmTitle': 'समापन',
  'hao.closure.confirmContinue': 'यह डिस्पोज़िशन सबमिट करें और कॉल जारी रखें?',
  'hao.closure.confirmClose': 'यह डिस्पोज़िशन सबमिट करें और कॉल बंद करें?',
  'hao.closure.confirmTransfer': 'इस कॉल को चयनित अभियान में स्थानांतरित करें?',
  'hao.closure.noCallError': 'बंद करने के लिए कोई सक्रिय कॉल नहीं है।',
  'hao.closure.closeError': 'कॉल बंद करने में असमर्थ। कृपया पुनः प्रयास करें।',
  'hao.closure.transferError': 'कॉल स्थानांतरित करने में असमर्थ। कृपया पुनः प्रयास करें।',
  'hao.closure.callTypesLoadError':
    'कॉल प्रकार लोड करने में असमर्थ। कृपया पुनः प्रयास करें।',
};
