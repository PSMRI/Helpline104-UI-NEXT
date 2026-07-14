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

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideDownload, lucideEye } from '@ng-icons/lucide';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../core/auth/auth.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { SUP_SELECT_CLASS } from '../shared/supervisor-ui';
import { ReportRunner } from './report-runner';
import { ReportResultsComponent } from './report-results.component';
import {
  ComplaintDetailRequest,
  DistrictOption,
  FeedbackNatureOption,
  FeedbackTypeOption,
  RoleOption,
  SubDistrictOption,
  VillageOption,
  WorkLocationOption,
} from './reports.models';
import { Crm104ReportKey, SupervisorReportsService } from './reports.service';
import {
  clampEndDate,
  maxEndFor,
  rangeEndIso,
  rangeStartIso,
  stateIDForRole,
  todayInput,
} from './reports.util';

/** Simple date-range services: service name → endpoint key + file name. */
const SIMPLE_SERVICES: Record<string, { key: Crm104ReportKey; fileName: string }> = {
  Registration: { key: 'registration', fileName: 'Registration_Service' },
  'Health Advisory Service': { key: 'healthAdvisory', fileName: 'Health_Advisory_Service' },
  'Counselling Service': { key: 'counselling', fileName: 'Counselling_Service' },
  'Medical Services': { key: 'medicalServices', fileName: 'Medical_Services' },
  Psychiatrist: { key: 'psychiatrist', fileName: 'Psychiatrist' },
  'Blood Request': { key: 'bloodRequest', fileName: 'Blood_Request' },
  'Organ Donation': { key: 'organDonation', fileName: 'Organ_Donation' },
  'Directory Services': { key: 'directoryServices', fileName: 'Directory_Services' },
  Prescription: { key: 'prescription', fileName: 'Prescription' },
  'Food Safety': { key: 'foodSafety', fileName: 'Food_Safety' },
  'Health Schemes': { key: 'healthSchemes', fileName: 'Health_Schemes' },
  'Epidemic Outbreak Service': { key: 'epidemic', fileName: 'Epidemic_Outbreak_Service' },
  Surveyor: { key: 'surveyor', fileName: 'Surveyor' },
};

const BRD_CRITERIAS = ['Component', 'Group', 'District Wise Component', 'District Wise Group'];
const CD_CRITERIAS = ['Guidelines', 'Category'];
const GRIEVANCE_TYPE_NAMES = ['Asha Complaints', 'Generic Complaint'];

/**
 * CRM call-type reports (legacy `SupervisorCalltypeReportsComponent`): pick a
 * sub-service and a date range, plus the service-specific filters (grievance
 * type, location cascade, skillset/office, blood-request or counselling search
 * criteria, feedback type/nature). Each service posts to its own 104-API
 * `crmReports/*ByDate` endpoint; Grievance Detail reuses the common API's
 * complaint-detail endpoint. All stream the generated workbook.
 */
@Component({
  selector: 'app-call-type-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NgIcon,
    TranslatePipe,
    ZardButtonComponent,
    ZardInputDirective,
    ReportResultsComponent,
  ],
  viewProviders: [provideIcons({ lucideDownload, lucideEye })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h3 class="mb-4 text-base font-semibold text-foreground">
        {{ 'supReports.callTypeReports.title' | translate: lang() }}
      </h3>

      @if (runner.errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">
          {{ runner.errorMessage() }}
        </p>
      }

      <form [formGroup]="form" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label for="ct-start" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.startDate' | translate: lang() }}
          </label>
          <input
            id="ct-start"
            type="date"
            [class]="selectClass"
            formControlName="startDate"
            [max]="maxDate"
            (change)="onStartChange()"
          />
        </div>
        <div>
          <label for="ct-end" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.endDate' | translate: lang() }}
          </label>
          <input
            id="ct-end"
            type="date"
            [class]="selectClass"
            formControlName="endDate"
            [min]="form.controls.startDate.value"
            [max]="endMax()"
          />
        </div>
        <div>
          <label for="ct-service" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.service' | translate: lang() }}
          </label>
          <select
            id="ct-service"
            [class]="selectClass"
            formControlName="service"
            (change)="onServiceChange()"
          >
            <option [ngValue]="null" disabled>
              {{ 'supReports.filter.select' | translate: lang() }}
            </option>
            @for (service of services(); track service) {
              <option [ngValue]="service">{{ service }}</option>
            }
          </select>
        </div>

        @if (service() === 'Grievance') {
          <div>
            <label for="ct-grtype" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supReports.filter.type' | translate: lang() }}
            </label>
            <select id="ct-grtype" [class]="selectClass" formControlName="grievanceType">
              <option [ngValue]="'all'">{{ 'supReports.all' | translate: lang() }}</option>
              @for (type of grievanceTypes(); track type.feedbackTypeID) {
                <option [ngValue]="type.feedbackTypeID">{{ type.feedbackTypeName }}</option>
              }
            </select>
          </div>
        }

        @if (service() === 'Blood Request Detail') {
          <div>
            <label for="ct-brd" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supReports.filter.searchCriteria' | translate: lang() }}
            </label>
            <select
              id="ct-brd"
              [class]="selectClass"
              formControlName="searchCriteriaBRD"
              (change)="onBrdCriteriaChange()"
            >
              <option [ngValue]="null" disabled>
                {{ 'supReports.filter.select' | translate: lang() }}
              </option>
              @for (criteria of brdCriterias; track criteria) {
                <option [ngValue]="criteria">{{ criteria }}</option>
              }
            </select>
          </div>
        }

        @if (service() === 'Counselling Service Detail') {
          <div>
            <label for="ct-cd" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supReports.filter.reportOn' | translate: lang() }}
            </label>
            <select id="ct-cd" [class]="selectClass" formControlName="searchCriteriaCD">
              <option [ngValue]="null" disabled>
                {{ 'supReports.filter.select' | translate: lang() }}
              </option>
              @for (criteria of cdCriterias; track criteria) {
                <option [ngValue]="criteria">{{ criteria }}</option>
              }
            </select>
          </div>
        }

        @if (showLocationCascade()) {
          <div>
            <label for="ct-district" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supReports.filter.district' | translate: lang() }}
            </label>
            <select
              id="ct-district"
              [class]="selectClass"
              formControlName="districtID"
              (change)="onDistrictChange()"
            >
              <option [ngValue]="null">
                {{ 'supReports.filter.select' | translate: lang() }}
              </option>
              @for (district of districts(); track district.districtID) {
                <option [ngValue]="district.districtID">{{ district.districtName }}</option>
              }
            </select>
          </div>
          <div>
            <label for="ct-block" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supReports.filter.subDistrict' | translate: lang() }}
            </label>
            <select
              id="ct-block"
              [class]="selectClass"
              formControlName="subDistrictID"
              (change)="onSubDistrictChange()"
            >
              <option [ngValue]="null">
                {{ 'supReports.filter.select' | translate: lang() }}
              </option>
              @for (block of subDistricts(); track block.blockID) {
                <option [ngValue]="block.blockID">{{ block.blockName }}</option>
              }
            </select>
          </div>
          <div>
            <label for="ct-village" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supReports.filter.village' | translate: lang() }}
            </label>
            <select id="ct-village" [class]="selectClass" formControlName="villageID">
              <option [ngValue]="null">
                {{ 'supReports.filter.select' | translate: lang() }}
              </option>
              @for (village of villages(); track village.districtBranchID) {
                <option [ngValue]="village.districtBranchID">{{ village.villageName }}</option>
              }
            </select>
          </div>
        }

        @if (service() === 'Medical Services Detail') {
          <div>
            <label for="ct-role" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supReports.filter.skillset' | translate: lang() }}
            </label>
            <select id="ct-role" [class]="selectClass" formControlName="roleID">
              <option [ngValue]="null">
                {{ 'supReports.filter.select' | translate: lang() }}
              </option>
              @for (role of roles(); track role.roleID) {
                <option [ngValue]="role.roleID">{{ role.roleName }}</option>
              }
            </select>
          </div>
          <div>
            <label for="ct-office" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supReports.filter.office' | translate: lang() }}
            </label>
            <select id="ct-office" [class]="selectClass" formControlName="workLocationID">
              <option [ngValue]="null">
                {{ 'supReports.filter.select' | translate: lang() }}
              </option>
              @for (location of workLocations(); track location.pSAddMapID) {
                <option [ngValue]="location.pSAddMapID">{{ location.locationName }}</option>
              }
            </select>
          </div>
        }

        @if (service() === 'Grievance Detail') {
          <div>
            <label for="ct-fbtype" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supReports.filter.feedbackType' | translate: lang() }}
            </label>
            <select
              id="ct-fbtype"
              [class]="selectClass"
              formControlName="feedbackType"
              (change)="onFeedbackTypeChange()"
            >
              <option [ngValue]="null">
                {{ 'supReports.filter.select' | translate: lang() }}
              </option>
              @for (type of feedbackTypes(); track type.feedbackTypeID) {
                <option [ngValue]="type">{{ type.feedbackTypeName }}</option>
              }
            </select>
          </div>
          <div>
            <label for="ct-fbnature" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supReports.filter.feedbackNature' | translate: lang() }}
            </label>
            <select id="ct-fbnature" [class]="selectClass" formControlName="feedbackNatureID">
              <option [ngValue]="null">
                {{ 'supReports.filter.select' | translate: lang() }}
              </option>
              @for (nature of feedbackNatures(); track $index) {
                <option [ngValue]="nature.m_feedbackNature?.[0]?.feedbackNatureID">
                  {{ nature.m_feedbackNature?.[0]?.feedbackNature }}
                </option>
              }
            </select>
          </div>
        }

        <div>
          <label for="ct-agent" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supReports.filter.agentId' | translate: lang() }}
          </label>
          <input
            id="ct-agent"
            z-input
            formControlName="agentID"
            [placeholder]="'supReports.filter.agentId' | translate: lang()"
          />
        </div>
      </form>

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button
          z-button
          type="button"
          [zLoading]="runner.loading()"
          [zDisabled]="form.invalid"
          (click)="view()"
        >
          <ng-icon name="lucideEye" size="16" aria-hidden="true" />
          {{ 'supReports.view' | translate: lang() }}
        </button>
        <button
          z-button
          type="button"
          zType="outline"
          [zLoading]="runner.exporting()"
          [zDisabled]="form.invalid"
          (click)="export()"
        >
          <ng-icon name="lucideDownload" size="16" aria-hidden="true" />
          {{ 'supReports.export' | translate: lang() }}
        </button>
      </div>

      <app-report-results [runner]="runner" />
    </section>
  `,
})
export class CallTypeReportsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service_ = inject(SupervisorReportsService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly selectClass = SUP_SELECT_CLASS;
  readonly maxDate = todayInput();
  readonly brdCriterias = BRD_CRITERIAS;
  readonly cdCriterias = CD_CRITERIAS;
  readonly runner = new ReportRunner(this.i18n, this.destroyRef);

  readonly form = this.fb.group({
    startDate: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    endDate: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    service: this.fb.control<string | null>(null, Validators.required),
    grievanceType: this.fb.control<number | 'all'>('all', { nonNullable: true }),
    searchCriteriaBRD: this.fb.control<string | null>(null),
    searchCriteriaCD: this.fb.control<string | null>(null),
    districtID: this.fb.control<number | null>(null),
    subDistrictID: this.fb.control<number | null>(null),
    villageID: this.fb.control<number | null>(null),
    roleID: this.fb.control<number | null>(null),
    workLocationID: this.fb.control<number | null>(null),
    feedbackType: this.fb.control<FeedbackTypeOption | null>(null),
    feedbackNatureID: this.fb.control<number | null>(null),
    agentID: this.fb.control<string>('', { nonNullable: true }),
  });

  readonly endMax = signal(this.maxDate);
  readonly service = signal<string | null>(null);
  readonly services = signal<string[]>([]);
  readonly grievanceTypes = signal<FeedbackTypeOption[]>([]);
  readonly feedbackTypes = signal<FeedbackTypeOption[]>([]);
  readonly feedbackNatures = signal<FeedbackNatureOption[]>([]);
  readonly districts = signal<DistrictOption[]>([]);
  readonly subDistricts = signal<SubDistrictOption[]>([]);
  readonly villages = signal<VillageOption[]>([]);
  readonly roles = signal<RoleOption[]>([]);
  readonly workLocations = signal<WorkLocationOption[]>([]);

  /** District cascade shows for the detail services (legacy conditionals). */
  readonly showLocationCascade = computed(() => {
    const service = this.service();
    if (service === 'Medical Services Detail') {
      return true;
    }
    if (service === 'Blood Request Detail') {
      const criteria = this.brdCriteria();
      return criteria === 'Component' || criteria === 'Group';
    }
    return false;
  });

  private readonly brdCriteria = signal<string | null>(null);

  private readonly providerServiceMapID = computed(
    () => this.authStore.currentRole()?.providerServiceMapID ?? null,
  );

  ngOnInit(): void {
    const psmID = this.providerServiceMapID();
    this.service_
      .getServices(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.services.set(this.buildServiceOptions(list)),
        error: () => this.services.set(this.buildServiceOptions([])),
      });
    this.service_
      .getFeedbackTypes(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => {
          this.feedbackTypes.set(types);
          this.grievanceTypes.set(
            types.filter((t) => GRIEVANCE_TYPE_NAMES.includes(t.feedbackTypeName ?? '')),
          );
        },
        error: () => undefined,
      });
    this.service_
      .getRoles(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (roles) => this.roles.set(roles), error: () => undefined });
    this.service_
      .getWorkLocations(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (list) => this.workLocations.set(list), error: () => undefined });
    const stateID = stateIDForRole(this.authStore.privileges(), this.authStore.currentRole());
    if (stateID != null) {
      this.service_
        .getDistricts(stateID)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (list) => this.districts.set(list), error: () => undefined });
    }
  }

  /**
   * Build the service dropdown the legacy way: `beneficiary/get/services`
   * minus the screening services, `Service Improvements` renamed to
   * `Grievance`, a "Detail" variant appended after specific services, and the
   * fixed Registration / Prescription / Surveyor entries.
   */
  private buildServiceOptions(list: { subServiceName?: string }[]): string[] {
    const options: string[] = ['Registration'];
    for (const item of list) {
      let name = item.subServiceName ?? '';
      if (name === 'Service Improvements') {
        name = 'Grievance';
      }
      if (!name || name === 'HyperTension Screening' || name === 'Diabetic Screening') {
        continue;
      }
      options.push(name);
      if (name === 'Medical Services') {
        options.push('Medical Services Detail');
      } else if (name === 'Counselling Service') {
        options.push('Counselling Service Detail');
      } else if (name === 'Blood Request') {
        options.push('Blood Request Detail');
      } else if (name === 'Grievance') {
        options.push('Grievance Detail');
      }
    }
    options.push('Prescription', 'Surveyor');
    return options;
  }

  onStartChange(): void {
    const { startDate, endDate } = this.form.getRawValue();
    this.endMax.set(maxEndFor(startDate, this.maxDate));
    const clamped = clampEndDate(startDate, endDate, this.maxDate);
    if (clamped) {
      this.form.patchValue({ endDate: clamped });
    }
  }

  /** Reset the service-specific filters when the service changes (legacy). */
  onServiceChange(): void {
    this.service.set(this.form.controls.service.value);
    this.brdCriteria.set(null);
    this.form.patchValue({
      grievanceType: 'all',
      searchCriteriaBRD: null,
      searchCriteriaCD: null,
      districtID: null,
      subDistrictID: null,
      villageID: null,
      roleID: null,
      workLocationID: null,
      feedbackType: null,
      feedbackNatureID: null,
    });
    this.subDistricts.set([]);
    this.villages.set([]);
    this.feedbackNatures.set([]);
  }

  onBrdCriteriaChange(): void {
    this.brdCriteria.set(this.form.controls.searchCriteriaBRD.value);
    this.form.patchValue({ districtID: null, subDistrictID: null, villageID: null });
  }

  onDistrictChange(): void {
    const districtID = this.form.controls.districtID.value;
    this.form.patchValue({ subDistrictID: null, villageID: null });
    this.subDistricts.set([]);
    this.villages.set([]);
    if (districtID != null) {
      this.service_
        .getSubDistricts(districtID)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (list) => this.subDistricts.set(list), error: () => undefined });
    }
  }

  onSubDistrictChange(): void {
    const blockID = this.form.controls.subDistrictID.value;
    this.form.patchValue({ villageID: null });
    this.villages.set([]);
    if (blockID != null) {
      this.service_
        .getVillages(blockID)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (list) => this.villages.set(list), error: () => undefined });
    }
  }

  onFeedbackTypeChange(): void {
    const type = this.form.controls.feedbackType.value;
    this.form.patchValue({ feedbackNatureID: null });
    this.feedbackNatures.set([]);
    if (type?.feedbackTypeID != null) {
      this.service_
        .getFeedbackNatureTypes(this.providerServiceMapID(), type.feedbackTypeID)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (list) => this.feedbackNatures.set(list), error: () => undefined });
    }
  }

  view(): void {
    const request = this.request();
    if (request) {
      this.runner.view(request);
    } else {
      this.runner.errorMessage.set(this.i18n.instant('supReports.unsupportedReport'));
    }
  }

  export(): void {
    const request = this.request();
    if (request) {
      this.runner.export(request, this.fileName());
    } else {
      this.runner.errorMessage.set(this.i18n.instant('supReports.unsupportedReport'));
    }
  }

  private fileName(): string {
    const service = this.form.controls.service.value ?? '';
    const simple = SIMPLE_SERVICES[service];
    if (simple) {
      return simple.fileName;
    }
    switch (service) {
      case 'Medical Services Detail':
        return 'Medical_Services_Detail';
      case 'Counselling Service Detail':
        return 'Counselling_Service_Detail';
      case 'Blood Request Detail':
        return 'Blood_Request_Detail';
      case 'Grievance':
        return 'Grievance';
      case 'Grievance Detail':
        return 'Grievance_Detail';
      default:
        return service.replace(/ /g, '_') || 'Call_Type_Report';
    }
  }

  /** Build the legacy per-service request (the big `searchReports` switch). */
  private request(): Observable<Blob> | null {
    const value = this.form.getRawValue();
    const service = value.service ?? '';
    const psmID = this.providerServiceMapID();
    const start = rangeStartIso(value.startDate);
    const end = rangeEndIso(value.endDate);
    const agentID = value.agentID ? value.agentID : undefined;

    const simple = SIMPLE_SERVICES[service];
    if (simple) {
      return this.service_.getCrm104Report(simple.key, {
        providerServiceMapID: psmID,
        startDateTime: start,
        endDateTime: end,
        agentID,
        fileName: simple.fileName,
      });
    }

    switch (service) {
      case 'Medical Services Detail':
        return this.service_.getCrm104Report('medicalAdvise', {
          startDateTime: start,
          endDateTime: end,
          providerServiceMapID: psmID,
          roleID: value.roleID,
          locationID: value.workLocationID,
          districtID: value.districtID,
          subDistrictID: value.subDistrictID,
          villageID: value.villageID,
          fileName: 'Medical_Services_Detail',
        });
      case 'Counselling Service Detail':
        return this.service_.getCrm104Report('mentalHealth', {
          startDateTime: start,
          endDateTime: end,
          providerServiceMapID: psmID,
          searchCriteria: value.searchCriteriaCD,
          fileName: 'Counselling_Service_Detail',
        });
      case 'Blood Request Detail':
        return this.service_.getCrm104Report('bloodRequestDetail', {
          startDateTime: start,
          endDateTime: end,
          providerServiceMapID: psmID,
          searchCriteria: value.searchCriteriaBRD,
          districtID: value.districtID,
          subDistrictID: value.subDistrictID,
          villageID: value.villageID,
          fileName: 'Blood_Request_Detail',
        });
      case 'Grievance':
        return this.service_.getCrm104Report('grievance', {
          providerServiceMapID: psmID,
          startDateTime: start,
          endDateTime: end,
          agentID: value.agentID ? value.agentID : null,
          feedbackTypeID: value.grievanceType === 'all' ? undefined : value.grievanceType,
          fileName: 'Grievance',
        });
      case 'Grievance Detail': {
        // The legacy screen posts an ARRAY to the complaint-detail endpoint:
        // one entry per feedback type when none is selected, else one entry.
        const requests: ComplaintDetailRequest[] = [];
        const selected = value.feedbackType;
        const types = selected ? [selected] : this.feedbackTypes();
        for (const type of types) {
          requests.push({
            startDate: start,
            endDate: end,
            providerServiceMapID: psmID,
            feedbackTypeID: type.feedbackTypeID ?? null,
            feedbackNatureID: selected ? value.feedbackNatureID : null,
            feedbackTypeName: type.feedbackTypeName ?? null,
            fileName: 'Grievance_Detail',
          });
        }
        return this.service_.getComplaintDetailReport(requests);
      }
      default:
        return null;
    }
  }
}
