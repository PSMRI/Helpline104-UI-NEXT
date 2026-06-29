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
  'innerpage.identifyCaller': 'Identify caller',

  // Beneficiary registration / caller identification
  'registration.title': 'Identify caller',
  'registration.subtitle': 'Match this call to a beneficiary',
  'registration.tab.history': 'This number',
  'registration.tab.search': 'Search',
  'registration.tab.register': 'Register new',
  'registration.history.heading': 'Registrations for this number',
  'registration.history.loading': 'Loading registrations…',
  'registration.history.empty': 'No existing registrations for this number.',
  'registration.search.empty': 'No beneficiaries match your search.',
  'registration.search.prompt': 'Enter a name or registration ID, then search.',
  'registration.col.regId': 'Reg. ID',
  'registration.col.name': 'Name',
  'registration.col.gender': 'Gender',
  'registration.col.age': 'Age',
  'registration.col.relationship': 'Relationship',
  'registration.col.district': 'District',
  'registration.col.action': 'Action',
  'registration.action.select': 'Select',
  'registration.field.firstName': 'First name',
  'registration.field.lastName': 'Last name',
  'registration.field.benId': 'Registration ID',
  'registration.field.gender': 'Gender',
  'registration.field.age': 'Age',
  'registration.field.phone': 'Phone number',
  'registration.field.genderPlaceholder': 'Select gender',
  'registration.gender.male': 'Male',
  'registration.gender.female': 'Female',
  'registration.gender.transgender': 'Transgender',
  'registration.action.search': 'Search',
  'registration.action.register': 'Register beneficiary',
  'registration.validation.required': 'This field is required.',
  'registration.validation.firstNameMin': 'Enter at least 3 characters.',
  'registration.validation.whitespace': 'Cannot be only spaces.',
  'registration.validation.age': 'Enter a valid age (1–120).',
  'registration.validation.phone': 'Enter a valid 10-digit phone number.',
  'registration.validation.searchCriteria':
    'Enter a name or registration ID to search.',
  'registration.toast.selected': 'Beneficiary selected for this call.',
  'registration.toast.registered': 'Beneficiary registered and selected.',
  'registration.toast.error': 'Something went wrong. Please try again.',
  'registration.toast.noCli': 'No caller number is available for this call.',
  'registration.toast.masterError': 'Could not load some form options.',
  'registration.section.identity': 'Personal details',
  'registration.section.address': 'Address & contact',
  'registration.field.title': 'Title',
  'registration.field.healthcareWorker': 'Healthcare worker?',
  'registration.field.yes': 'Yes',
  'registration.field.no': 'No',
  'registration.field.hcwType': 'Healthcare worker type',
  'registration.field.emergency': 'Emergency registration',
  'registration.field.dob': 'Date of birth',
  'registration.field.ageUnit': 'Age unit',
  'registration.field.relationship': 'Relationship',
  'registration.field.caste': 'Caste / community',
  'registration.field.maritalStatus': 'Marital status',
  'registration.field.fatherSpouse': 'Father / spouse name',
  'registration.field.education': 'Education',
  'registration.field.idType': 'ID type',
  'registration.field.idNumber': 'ID number',
  'registration.field.state': 'State',
  'registration.field.district': 'District',
  'registration.field.subDistrict': 'Sub-district / block',
  'registration.field.village': 'Village',
  'registration.field.houseNumber': 'House / door / flat no.',
  'registration.field.pincode': 'Pincode',
  'registration.field.alternateNumber': 'Alternate number',
  'registration.field.selectPlaceholder': 'Select',
  'registration.ageUnit.years': 'Years',
  'registration.ageUnit.months': 'Months',
  'registration.ageUnit.days': 'Days',
  'registration.action.next': 'Next',
  'registration.action.back': 'Back',
  'registration.validation.ageRange': 'Enter a valid age.',
  'registration.validation.idInvalid': 'Enter a valid ID number.',
  'registration.validation.pincode': 'Enter a valid 6-digit pincode.',

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
} as const;

/** Every translatable key in the app, derived from the English dictionary. */
export type TranslationKey = keyof typeof en;
