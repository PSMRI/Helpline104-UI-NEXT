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

import { Routes } from '@angular/router';

import { authGuard } from './app-modules/core/auth/auth.guard';
import { inboundGuard } from './app-modules/call/inbound.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./app-modules/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./app-modules/account-recovery/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    // Reached from the reset flow once security answers are validated (carries a
    // transactionId in memory); guarded inside the component, not by a route guard.
    path: 'set-password',
    loadComponent: () =>
      import('./app-modules/account-recovery/set-password.component').then(
        (m) => m.SetPasswordComponent,
      ),
  },
  {
    // First-login security-question setup, reached when login reports Status "New".
    path: 'set-security-questions',
    loadComponent: () =>
      import('./app-modules/account-recovery/set-security-questions.component').then(
        (m) => m.SetSecurityQuestionsComponent,
      ),
  },
  {
    path: 'role-selection',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./app-modules/role-selection/role-selection.component').then(
        (m) => m.RoleSelectionComponent,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./app-modules/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    // On-call workspace shell. Authenticated AND only while a call is connected
    // (inboundGuard); reaching it without an active call bounces to /dashboard.
    // The shell hosts a <router-outlet>; the role dispatcher (default) switches
    // to the role workspaces, and `hao` is the HAO (Health Assistant Officer)
    // service workspace reached once the caller is identified.
    path: 'innerpage',
    canActivate: [authGuard, inboundGuard],
    loadComponent: () =>
      import('./app-modules/call/innerpage/innerpage.component').then((m) => m.InnerpageComponent),
    children: [
      {
        // Default on-call view: the role dispatcher (placeholder for now).
        path: '',
        loadComponent: () =>
          import('./app-modules/call/innerpage/role-dispatcher.component').then(
            (m) => m.RoleDispatcherComponent,
          ),
      },
      {
        // Caller identification / beneficiary registration (RO workspace step 1).
        path: 'registration',
        loadComponent: () =>
          import('./app-modules/call/beneficiary/beneficiary-registration.component').then(
            (m) => m.BeneficiaryRegistrationComponent,
          ),
      },
      {
        // HAO (Health Assistant Officer) service workspace.
        path: 'hao',
        loadComponent: () =>
          import('./app-modules/call/hao/hao-workspace.component').then(
            (m) => m.HaoWorkspaceComponent,
          ),
      },
      {
        // MO (Medical Officer) case-sheet workspace.
        path: 'mo',
        loadComponent: () =>
          import('./app-modules/call/role-workspace/mo-workspace.component').then(
            (m) => m.MoWorkspaceComponent,
          ),
      },
      {
        // CO (Counselling Officer) case-sheet workspace.
        path: 'co',
        loadComponent: () =>
          import('./app-modules/call/role-workspace/co-workspace.component').then(
            (m) => m.CoWorkspaceComponent,
          ),
      },
      {
        // Counsellor (mental-health) case-sheet workspace.
        path: 'counsellor',
        loadComponent: () =>
          import('./app-modules/call/role-workspace/counsellor-workspace.component').then(
            (m) => m.CounsellorWorkspaceComponent,
          ),
      },
      {
        // SIO (Service Information Officer) service-catalogue workspace.
        path: 'sio',
        loadComponent: () =>
          import('./app-modules/call/role-workspace/sio-workspace.component').then(
            (m) => m.SioWorkspaceComponent,
          ),
      },
      {
        // Surveyor workspace (call-type reports host).
        path: 'surveyor',
        loadComponent: () =>
          import('./app-modules/call/role-workspace/surveyor-workspace.component').then(
            (m) => m.SurveyorWorkspaceComponent,
          ),
      },
      {
        // PD (Psychiatrist / Programme Division) case-sheet workspace.
        path: 'pd',
        loadComponent: () =>
          import('./app-modules/call/role-workspace/pd-workspace.component').then(
            (m) => m.PdWorkspaceComponent,
          ),
      },
    ],
  },
  {
    // Supervisor Activity Area: a sidebar shell hosting the supervisor
    // sections (activities, reports, configurations) as routed children.
    // Sections not yet migrated share the placeholder component.
    path: 'supervisor',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./app-modules/supervisor/supervisor-workspace.component').then(
        (m) => m.SupervisorWorkspaceComponent,
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./app-modules/supervisor/supervisor-home.component').then(
            (m) => m.SupervisorHomeComponent,
          ),
      },
      {
        // Block / unblock a caller number and review nuisance-call recordings.
        path: 'block-unblock',
        loadComponent: () =>
          import('./app-modules/supervisor/config/block-unblock.component').then(
            (m) => m.BlockUnblockComponent,
          ),
      },
      ...[
        ['agent-status', 'supervisor.nav.agentStatus'],
        ['quality-audit', 'supervisor.nav.qualityAudit'],
        ['upload-symptoms', 'supervisor.nav.uploadSymptoms'],
        ['sms-templates', 'supervisor.nav.smsTemplates'],
        ['diseases-summary', 'supervisor.nav.diseasesSummary'],
      ].map(([path, titleKey]) => ({
        path,
        data: { titleKey },
        loadComponent: () =>
          import('./app-modules/supervisor/supervisor-placeholder.component').then(
            (m) => m.SupervisorPlaceholderComponent,
          ),
      })),
    ],
  },
  {
    // Outbound campaign screens (worklist, on-call workspace, and the
    // supervisor search/reallocate management views).
    path: 'outbound',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'worklist', pathMatch: 'full' },
      {
        path: 'worklist',
        loadComponent: () =>
          import('./app-modules/outbound/outbound-worklist.component').then(
            (m) => m.OutboundWorklistComponent,
          ),
      },
      {
        path: 'workspace',
        loadComponent: () =>
          import('./app-modules/outbound/outbound-call-workspace.component').then(
            (m) => m.OutboundCallWorkspaceComponent,
          ),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./app-modules/outbound/outbound-search.component').then(
            (m) => m.OutboundSearchComponent,
          ),
      },
      {
        path: 'reallocate',
        loadComponent: () =>
          import('./app-modules/outbound/reallocate-calls.component').then(
            (m) => m.ReallocateCallsComponent,
          ),
      },
    ],
  },
  {
    // Post-logout landing for the dashboard logout / feedback links. Unguarded:
    // the session has already been cleared by the time the user lands here.
    path: 'feedback',
    loadComponent: () =>
      import('./app-modules/feedback/feedback.component').then((m) => m.FeedbackComponent),
  },
];
