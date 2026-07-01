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
  'innerpage.identifyCaller': 'कॉलर की पहचान करें',

  // Beneficiary registration / caller identification
  'registration.tab.search': 'खोजें',
  'registration.tab.register': 'नया पंजीकरण',
  'registration.history.heading': 'इस नंबर के लिए पंजीकरण',
  'registration.history.loading': 'पंजीकरण लोड हो रहे हैं…',
  'registration.history.empty': 'इस नंबर के लिए कोई पंजीकरण नहीं मिला।',
  'registration.search.empty': 'आपकी खोज से कोई लाभार्थी मेल नहीं खाता।',
  'registration.search.prompt': 'नाम या पंजीकरण आईडी दर्ज करें, फिर खोजें।',
  'registration.col.regId': 'पंजी. आईडी',
  'registration.col.name': 'नाम',
  'registration.col.gender': 'लिंग',
  'registration.col.age': 'आयु',
  'registration.col.relationship': 'संबंध',
  'registration.col.district': 'ज़िला',
  'registration.col.action': 'कार्रवाई',
  'registration.action.select': 'चुनें',
  'registration.field.firstName': 'पहला नाम',
  'registration.field.lastName': 'उपनाम',
  'registration.field.benId': 'पंजीकरण आईडी',
  'registration.field.gender': 'लिंग',
  'registration.field.age': 'आयु',
  'registration.field.phone': 'फ़ोन नंबर',
  'registration.field.genderPlaceholder': 'लिंग चुनें',
  'registration.gender.male': 'पुरुष',
  'registration.gender.female': 'महिला',
  'registration.gender.transgender': 'ट्रांसजेंडर',
  'registration.action.search': 'खोजें',
  'registration.action.register': 'लाभार्थी पंजीकृत करें',
  'registration.validation.required': 'यह फ़ील्ड आवश्यक है।',
  'registration.validation.firstNameMin': 'कम से कम 3 अक्षर दर्ज करें।',
  'registration.validation.whitespace': 'केवल रिक्त स्थान नहीं हो सकता।',
  'registration.validation.age': 'मान्य आयु दर्ज करें (1–120)।',
  'registration.validation.phone': 'मान्य 10-अंकीय फ़ोन नंबर दर्ज करें।',
  'registration.validation.searchCriteria':
    'खोजने के लिए नाम या पंजीकरण आईडी दर्ज करें।',
  'registration.toast.selected': 'इस कॉल के लिए लाभार्थी चुना गया।',
  'registration.toast.registered': 'लाभार्थी पंजीकृत और चयनित किया गया।',
  'registration.toast.error': 'कुछ गलत हो गया। कृपया पुनः प्रयास करें।',
  'registration.toast.noCli': 'इस कॉल के लिए कोई कॉलर नंबर उपलब्ध नहीं है।',
  'registration.toast.masterError': 'कुछ फ़ॉर्म विकल्प लोड नहीं हो सके।',
  'registration.notice.noCli':
    'इस कॉल के लिए कोई कॉलर नंबर उपलब्ध न होने के कारण पंजीकरण उपलब्ध नहीं है।',
  'registration.section.identity': 'व्यक्तिगत विवरण',
  'registration.section.address': 'पता और संपर्क',
  'registration.field.title': 'शीर्षक',
  'registration.field.healthcareWorker': 'स्वास्थ्यकर्मी?',
  'registration.field.yes': 'हाँ',
  'registration.field.no': 'नहीं',
  'registration.field.hcwType': 'स्वास्थ्यकर्मी प्रकार',
  'registration.field.emergency': 'आपातकालीन पंजीकरण',
  'registration.field.dob': 'जन्म तिथि',
  'registration.field.ageUnit': 'आयु इकाई',
  'registration.field.relationship': 'संबंध',
  'registration.field.caste': 'जाति / समुदाय',
  'registration.field.maritalStatus': 'वैवाहिक स्थिति',
  'registration.field.fatherName': 'पिता का नाम',
  'registration.field.spouseName': 'पति-पत्नी का नाम',
  'registration.field.education': 'शिक्षा',
  'registration.field.idType': 'पहचान प्रकार',
  'registration.field.idNumber': 'पहचान संख्या',
  'registration.field.state': 'राज्य',
  'registration.field.district': 'ज़िला',
  'registration.field.subDistrict': 'उप-ज़िला / ब्लॉक',
  'registration.field.village': 'गाँव',
  'registration.field.houseNumber': 'मकान / द्वार / फ्लैट नं.',
  'registration.field.pincode': 'पिनकोड',
  'registration.field.alternateNumber': 'वैकल्पिक नंबर',
  'registration.field.selectPlaceholder': 'चुनें',
  'registration.ageUnit.years': 'वर्ष',
  'registration.ageUnit.months': 'माह',
  'registration.ageUnit.days': 'दिन',
  'registration.action.next': 'आगे',
  'registration.action.back': 'पीछे',
  'registration.validation.ageRange': 'मान्य आयु दर्ज करें।',
  'registration.validation.idInvalid': 'मान्य पहचान संख्या दर्ज करें।',
  'registration.validation.pincode': 'मान्य 6-अंकीय पिनकोड दर्ज करें।',
  'registration.validation.dobInvalid':
    'मान्य जन्म तिथि दर्ज करें (भविष्य की नहीं)।',

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
};
