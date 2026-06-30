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
  // Header
  'dashboard.header.logoAlt': 'Piramal Swasthya',
  'dashboard.header.titleSuffix': 'Dashboard',
  'dashboard.header.languageLabel': 'Select Language',
  'dashboard.header.languageComingSoon': 'We are coming up with this language',
  'dashboard.header.welcome': 'Welcome',
  'dashboard.header.contacts': 'Emergency Contacts',
  'dashboard.header.profile': 'Profile',
  'dashboard.header.help': 'Help',
  'dashboard.header.version': 'Version',
  'dashboard.header.licenseInfo': 'License info.',
  'dashboard.header.logout': 'Logout',

  // Sidebar
  'dashboard.sidebar.switchRole': 'Switch Role',
  'dashboard.sidebar.activityArea': 'Activity Area',

  // Agent ID
  'dashboard.agentId.label': 'My ID : Agent -',

  // Campaign (inbound / outbound)
  'dashboard.campaign.label': 'Call mode',
  'dashboard.campaign.inbound': 'Inbound',
  'dashboard.campaign.outbound': 'Outbound',
  'dashboard.campaign.switchToInboundConfirm': 'Switch to Inbound?',
  'dashboard.campaign.switchToOutboundConfirm': 'Switch to Outbound?',
  'dashboard.campaign.switchError': 'Unable to switch call mode. Please try again.',

  // Call statistics
  'dashboard.callStatistics.title': 'Call Statistics',
  'dashboard.callStatistics.callDuration': 'Call Duration',
  'dashboard.callStatistics.breakTime': 'Break Time',
  'dashboard.callStatistics.freeTime': 'Free Time',
  'dashboard.callStatistics.totalCalls': 'Total Calls',
  'dashboard.callStatistics.hrs': 'Hrs',
  'dashboard.callStatistics.mins': 'Mins',
  'dashboard.callStatistics.secs': 'Secs',

  // Alerts & Notifications panel
  'dashboard.alerts.title': 'Alerts & Notifications',
  'dashboard.alerts.alerts': 'Alerts',
  'dashboard.alerts.officeBulletin': 'Office Bulletin',
  'dashboard.alerts.notifications': 'Notifications',
  'dashboard.alerts.noAlerts': 'No alert messages found',
  'dashboard.alerts.noOfficeBulletin': 'No office messages found',
  'dashboard.alerts.noNotifications': 'No notification messages found',

  // Reports panel
  'dashboard.reports.title': 'Reports',
  'dashboard.reports.sno': 'S.No',
  'dashboard.reports.reportName': 'Report Name',
  'dashboard.reports.date': 'Date',
  'dashboard.reports.export': 'Export',
  'dashboard.reports.more': 'View All →',

  // Activity for this week panel
  'dashboard.activity.title': 'Activity for this week',
  'dashboard.activity.trainingResources': 'Training Resources',
  'dashboard.activity.more': 'View All →',
  'dashboard.activity.kmDocsTitle': 'KM Docs',
  'dashboard.activity.noKmDocs': 'No KM Docs documents found',

  // Rating panel
  'dashboard.rating.title': 'Rating',
  'dashboard.rating.panelContent': 'Panel Content',

  // Emergency contacts modal
  'dashboard.contacts.name': 'Name',
  'dashboard.contacts.number': 'Number',
  'dashboard.contacts.empty': 'No emergency contacts found',

  // Footer
  'dashboard.footer.feedback': 'Feedback',
  'dashboard.footer.version': 'Version',

  // Shared dialog chrome
  'dashboard.dialog.info': 'Info',
  'dashboard.dialog.error': 'Error',
  'dashboard.dialog.ok': 'Ok',
  'dashboard.dialog.cancel': 'Cancel',

  // On-call workspace (Innerpage) shell
  'innerpage.callerNumber': 'Caller number',
  'innerpage.timer.ariaLabel': 'Call duration',
  'innerpage.statusOnCall': 'On call',
  'innerpage.dispatcherTitle': 'Call workspace',
  'innerpage.dispatcherHint':
    'The role workspace (registration, service and closure) will open here once the caller is identified.',

  // Supervisor placeholder page
  'supervisor.title': 'Supervisor Activity Area',
  'supervisor.intro':
    'Activities, reports and configurations for supervisors will be managed here.',
  'supervisor.backToDashboard': 'Back to Dashboard',

  // Post-logout feedback page
  'feedback.loggedOut': 'You have logged out of the session',
  'feedback.subtitle': 'We’d love to hear about your experience (optional)',
  'feedback.rateAria': 'Rate your experience',
  'feedback.ratingTerrible': 'Terrible',
  'feedback.ratingBad': 'Bad',
  'feedback.ratingOkay': 'Okay',
  'feedback.ratingGood': 'Good',
  'feedback.ratingGreat': 'Great',
  'feedback.category': 'Category',
  'feedback.selectCategory': 'Select Category',
  'feedback.catCallCenter': 'Call Center Service',
  'feedback.catFacilityCleanliness': 'Facility Cleanliness',
  'feedback.catMedicineAvailability': 'Medicine Availability',
  'feedback.catPatientCare': 'Patient Care',
  'feedback.catStaffBehavior': 'Staff Behavior',
  'feedback.catWaitTime': 'Wait Time',
  'feedback.commentPlaceholder': 'How we can make it better…',
  'feedback.anonymousNote':
    'You are not logged in, this feedback will be submitted anonymously.',
  'feedback.close': 'Close',
  'feedback.okay': 'Okay',

  // HAO workspace shell
  'hao.workspace.title': 'Health Assistant Officer',
  'hao.workspace.subtitle': 'Provide a service to the caller, then close the call.',
  'hao.workspace.stepService': 'Provide Service',
  'hao.workspace.stepClosure': 'Closure',
  'hao.workspace.backToRo': 'Back to RO',
  'hao.workspace.cancel': 'Cancel',
  'hao.workspace.proceedToClosure': 'Proceed to Closure',
  'hao.workspace.proceedTitle': 'Closure',
  'hao.workspace.proceedConfirm': 'Proceed to closure for this call?',
  'hao.workspace.cancelTitle': 'Cancel',
  'hao.workspace.cancelConfirm': 'Return to providing a service?',

  // HAO service tabs ("Provide Service" step)
  'hao.service.tablistLabel': 'Services',
  'hao.service.comingSoon': 'This service will be available soon.',
  'hao.service.healthAdvisory': 'Health Advisory',
  'hao.service.diabeticScreening': 'Diabetic Screening',
  'hao.service.bpScreening': 'BP Screening',
  'hao.service.bloodOnCall': 'Blood on Call',
  'hao.service.directory': 'Directory Services',
  'hao.service.epidemic': 'Epidemic Outbreak',
  'hao.service.foodSafety': 'Food Safety',
  'hao.service.grievance': 'Grievance',
  'hao.service.organDonation': 'Organ Donation',
  'hao.service.schemes': 'Health Schemes',
  'hao.service.covid19': 'Covid-19',
  'hao.service.imrMmr': 'IMR / MMR Information',
  'hao.service.balVivah': 'Bal Vivah',

  // HAO case sheet (Health Advisory)
  'hao.caseSheet.chiefComplaints': 'Chief Complaints',
  'hao.caseSheet.chiefComplaintsPlaceholder': "Describe the caller's complaints",
  'hao.caseSheet.chiefComplaintsRequired': 'Chief complaints are required.',
  'hao.caseSheet.provisionalDiagnosis': 'Provisional Diagnosis',
  'hao.caseSheet.selectDiagnosis': 'Select a diagnosis',
  'hao.caseSheet.healthAdvice': 'Health Advice',
  'hao.caseSheet.healthAdvicePlaceholder': 'Advice given to the caller',
  'hao.caseSheet.remarks': 'Remarks',
  'hao.caseSheet.save': 'Save Case Sheet',
  'hao.caseSheet.saveSuccess': 'Case sheet saved successfully.',
  'hao.caseSheet.saveError': 'Unable to save the case sheet. Please try again.',

  // HAO closure step
  'hao.closure.emergency': 'Emergency',
  'hao.closure.suicidal': 'Suicidal',
  'hao.closure.callType': 'Call Type',
  'hao.closure.selectCallType': 'Select call type',
  'hao.closure.callTypeRequired': 'Call type is required.',
  'hao.closure.callSubType': 'Call Sub-Type',
  'hao.closure.selectCallSubType': 'Select call sub-type',
  'hao.closure.callSubTypeRequired': 'Call sub-type is required.',
  'hao.closure.followUpRequired': 'Follow-up required',
  'hao.closure.followUpDate': 'Follow-up Date',
  'hao.closure.followUpDateRequired': 'Follow-up date is required.',
  'hao.closure.remarks': 'Remarks',
  'hao.closure.transferCall': 'Transfer call',
  'hao.closure.transferCampaign': 'Campaign',
  'hao.closure.selectCampaign': 'Select campaign',
  'hao.closure.transferSkill': 'Skill',
  'hao.closure.selectSkill': 'Select skill',
  'hao.closure.transfer': 'Transfer',
  'hao.closure.submitContinue': 'Submit & Continue',
  'hao.closure.submitClose': 'Submit & Close',
  'hao.closure.confirmTitle': 'Closure',
  'hao.closure.confirmContinue': 'Submit this disposition and continue the call?',
  'hao.closure.confirmClose': 'Submit this disposition and close the call?',
  'hao.closure.noCallError': 'No active call to close.',
  'hao.closure.closeError': 'Unable to close the call. Please try again.',
  'hao.closure.transferError': 'Unable to transfer the call. Please try again.',
} as const;

/** Every translatable key in the app, derived from the English dictionary. */
export type TranslationKey = keyof typeof en;
