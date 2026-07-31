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

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucidePlus, lucideX } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SupervisorError } from '../../shared/supervisor-api';
import { SUP_SELECT_CLASS, SUP_TEXTAREA_CLASS } from '../../shared/supervisor-ui';
import {
  SmsParameterGroup,
  SmsParameterMap,
  SmsParameterValue,
  SmsTemplateRow,
  SmsTemplatesService,
  SmsType,
} from './sms-templates.service';

type ViewMode = 'list' | 'create' | 'view';

/**
 * Characters the legacy `smsTemplateValidatorWithCopyPaste` directive blocked
 * from the template textarea (typed or pasted).
 */
const BLOCKED_CHARS = /[~!@%^&*_+=[\]{}"`'|<>?]/;

/** The implicit parameter the legacy screen always appended. */
const PHONE_PARAMETER = 'SMS_PHONE_NO';

/**
 * Supervisor SMS templates (legacy `SmsTemplateComponent`): list the service's
 * SMS templates, view one with its parameter mappings, deactivate an active
 * one, and create a new template — `$$TOKEN$$` placeholders in the template
 * text become parameters that must each be mapped to a backend value before
 * submitting.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-sms-templates',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucideEye, lucidePlus, lucideX })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        @switch (mode()) {
          @case ('create') {
            {{ 'supSms.createTitle' | translate: lang() }}
          }
          @case ('view') {
            {{ 'supSms.viewTitle' | translate: lang() }}
          }
          @default {
            {{ 'supSms.listTitle' | translate: lang() }}
          }
        }
      </h1>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      <!-- List -->
      @if (mode() === 'list') {
        @if (loading()) {
          <p class="py-8 text-center text-sm text-muted-foreground">
            {{ 'supSms.loading' | translate: lang() }}
          </p>
        } @else {
          <div class="overflow-x-auto rounded-md border border-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supSms.sno' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supSms.templateName' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supSms.templateType' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supSms.template' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supSms.view' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supSms.actions' | translate: lang() }}
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (row of templates(); track row.smsTemplateID) {
                  <tr class="border-t border-border align-top">
                    <td class="px-3 py-2">{{ $index + 1 }}</td>
                    <td class="px-3 py-2">{{ row.smsTemplateName || '—' }}</td>
                    <td class="px-3 py-2">{{ row.smsType?.smsType || '—' }}</td>
                    <td class="max-w-md px-3 py-2">{{ row.smsTemplate || '—' }}</td>
                    <td class="px-3 py-2">
                      <button
                        z-button
                        type="button"
                        zType="ghost"
                        zSize="sm"
                        [attr.aria-label]="'supSms.view' | translate: lang()"
                        (click)="view(row)"
                      >
                        <ng-icon name="lucideEye" size="16" aria-hidden="true" />
                      </button>
                    </td>
                    <td class="px-3 py-2">
                      @if (!row.deleted) {
                        <button
                          z-button
                          type="button"
                          zType="outline"
                          zSize="sm"
                          (click)="deactivate(row)"
                        >
                          {{ 'supSms.deactivate' | translate: lang() }}
                        </button>
                      } @else {
                        <button z-button type="button" zType="outline" zSize="sm" [zDisabled]="true">
                          {{ 'supSms.deactivated' | translate: lang() }}
                        </button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="px-3 py-8 text-center text-muted-foreground">
                      {{ 'supSms.noRecords' | translate: lang() }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="mt-4 flex justify-end">
            <button z-button type="button" zType="default" (click)="openCreate()">
              {{ 'supSms.createNew' | translate: lang() }}
            </button>
          </div>
        }
      }

      <!-- Create -->
      @if (mode() === 'create') {
        <form [formGroup]="createForm" autocomplete="off" class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="sms-name" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supSms.templateName' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="sms-name" z-input class="w-full" maxlength="40" formControlName="templateName" />
          </div>
          <div>
            <label for="sms-type" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supSms.smsType' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <select id="sms-type" [class]="selectClass" formControlName="smsTypeID">
              <option [ngValue]="null" disabled>{{ 'supSms.select' | translate: lang() }}</option>
              @for (type of smsTypes(); track type.smsTypeID) {
                <option [ngValue]="type.smsTypeID">{{ type.smsType }}</option>
              }
            </select>
          </div>
          <div class="sm:col-span-2">
            <label for="sms-template" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supSms.template' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <textarea
              id="sms-template"
              [class]="textareaClass"
              rows="5"
              minlength="20"
              maxlength="500"
              formControlName="smsTemplate"
            ></textarea>
            <div class="mt-1 flex justify-between gap-4 text-xs">
              <span class="font-medium text-destructive">
                @if (createForm.controls.smsTemplate.hasError('blockedChars')) {
                  {{ 'supSms.invalidChars' | translate: lang() }}
                } @else if (
                  createForm.controls.smsTemplate.invalid && createForm.controls.smsTemplate.touched
                ) {
                  {{ 'supSms.min20' | translate: lang() }}
                }
              </span>
              <span class="whitespace-nowrap text-muted-foreground">{{ templateLength() }}/500</span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ 'supSms.paramHint' | translate: lang() }}
            </p>
          </div>

          @if (parametersExtracted()) {
            <div class="sm:col-span-2 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label for="sms-param" class="mb-1 block text-xs font-medium text-muted-foreground">
                  {{ 'supSms.selectParameter' | translate: lang() }}
                </label>
                <select id="sms-param" [class]="selectClass" formControlName="parameter">
                  <option [ngValue]="null" disabled>{{ 'supSms.select' | translate: lang() }}</option>
                  @for (parameter of remainingParameters(); track parameter) {
                    <option [ngValue]="parameter">{{ parameter }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="sms-vtype" class="mb-1 block text-xs font-medium text-muted-foreground">
                  {{ 'supSms.selectValueType' | translate: lang() }}
                </label>
                <select
                  id="sms-vtype"
                  [class]="selectClass"
                  formControlName="valueGroup"
                  (change)="onGroupChange()"
                >
                  <option [ngValue]="null" disabled>{{ 'supSms.select' | translate: lang() }}</option>
                  @for (group of parameterGroups(); track group.smsParameterType) {
                    <option [ngValue]="group">{{ group.smsParameterType }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="sms-value" class="mb-1 block text-xs font-medium text-muted-foreground">
                  {{ 'supSms.selectValue' | translate: lang() }}
                </label>
                <select id="sms-value" [class]="selectClass" formControlName="value">
                  <option [ngValue]="null" disabled>{{ 'supSms.select' | translate: lang() }}</option>
                  @for (value of groupValues(); track value.smsParameterID) {
                    <option [ngValue]="value">{{ value.smsParameterName }}</option>
                  }
                </select>
              </div>
              <div>
                <button z-button type="button" zType="secondary" (click)="addMapping()">
                  <ng-icon name="lucidePlus" size="16" aria-hidden="true" />
                  {{ 'supSms.add' | translate: lang() }}
                </button>
              </div>
            </div>

            @if (parameterMaps().length > 0) {
              <div class="sm:col-span-2 overflow-x-auto rounded-md border border-border">
                <table class="w-full text-left text-sm">
                  <thead class="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" class="px-3 py-2 font-medium">
                        {{ 'supSms.sno' | translate: lang() }}
                      </th>
                      <th scope="col" class="px-3 py-2 font-medium">
                        {{ 'supSms.parameter' | translate: lang() }}
                      </th>
                      <th scope="col" class="px-3 py-2 font-medium">
                        {{ 'supSms.valueType' | translate: lang() }}
                      </th>
                      <th scope="col" class="px-3 py-2 font-medium">
                        {{ 'supSms.value' | translate: lang() }}
                      </th>
                      <th scope="col" class="px-3 py-2 font-medium">
                        {{ 'supSms.actions' | translate: lang() }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of parameterMaps(); track $index) {
                      <tr class="border-t border-border">
                        <td class="px-3 py-2">{{ $index + 1 }}</td>
                        <td class="px-3 py-2">{{ item.smsParameterName }}</td>
                        <td class="px-3 py-2">{{ item.smsParameterType }}</td>
                        <td class="px-3 py-2">{{ item.smsParameterValue }}</td>
                        <td class="px-3 py-2">
                          <button
                            z-button
                            type="button"
                            zType="ghost"
                            zSize="sm"
                            [attr.aria-label]="'supSms.remove' | translate: lang()"
                            (click)="removeMapping($index)"
                          >
                            <ng-icon name="lucideX" size="16" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
            @if (remainingParameters().length > 0) {
              <p class="sm:col-span-2 text-xs text-muted-foreground">
                {{ 'supSms.mapAllParameters' | translate: lang() }}
              </p>
            }
          }

          <div class="sm:col-span-2 flex justify-between gap-2">
            <button z-button type="button" zType="outline" (click)="backToList()">
              {{ 'supSms.back' | translate: lang() }}
            </button>
            <div class="flex gap-2">
              @if (parametersExtracted()) {
                <button z-button type="button" zType="outline" (click)="cancelParameters()">
                  {{ 'supSms.cancel' | translate: lang() }}
                </button>
                <button
                  z-button
                  type="button"
                  zType="default"
                  [zLoading]="saving()"
                  [zDisabled]="remainingParameters().length > 0 || saving()"
                  (click)="save()"
                >
                  {{ 'supSms.submit' | translate: lang() }}
                </button>
              } @else {
                <button
                  z-button
                  type="button"
                  zType="default"
                  [zDisabled]="createForm.invalid"
                  (click)="extractParameters()"
                >
                  {{ 'supSms.continue' | translate: lang() }}
                </button>
              }
            </div>
          </div>
        </form>
      }

      <!-- View -->
      @if (mode() === 'view') {
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <span class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supSms.templateName' | translate: lang() }}
            </span>
            <p class="text-sm text-foreground">{{ viewRow()?.smsTemplateName || '—' }}</p>
          </div>
          <div>
            <span class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supSms.smsType' | translate: lang() }}
            </span>
            <p class="text-sm text-foreground">{{ viewRow()?.smsType?.smsType || '—' }}</p>
          </div>
          <div class="sm:col-span-2">
            <span class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supSms.template' | translate: lang() }}
            </span>
            <p class="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm text-foreground">
              {{ viewRow()?.smsTemplate || '—' }}
            </p>
          </div>
          @if (viewParameterMaps().length > 0) {
            <div class="sm:col-span-2 overflow-x-auto rounded-md border border-border">
              <table class="w-full text-left text-sm">
                <thead class="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'supSms.sno' | translate: lang() }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'supSms.parameter' | translate: lang() }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'supSms.valueType' | translate: lang() }}
                    </th>
                    <th scope="col" class="px-3 py-2 font-medium">
                      {{ 'supSms.value' | translate: lang() }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of viewParameterMaps(); track $index) {
                    <tr class="border-t border-border">
                      <td class="px-3 py-2">{{ $index + 1 }}</td>
                      <td class="px-3 py-2">{{ item.smsParameterName }}</td>
                      <td class="px-3 py-2">{{ item.smsParameterType }}</td>
                      <td class="px-3 py-2">{{ item.smsParameterValue }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          <div class="sm:col-span-2">
            <button z-button type="button" zType="outline" (click)="backToList()">
              {{ 'supSms.back' | translate: lang() }}
            </button>
          </div>
        </div>
      }
    </section>
  `,
})
export class SmsTemplatesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SmsTemplatesService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly selectClass = SUP_SELECT_CLASS;
  readonly textareaClass = SUP_TEXTAREA_CLASS;

  readonly mode = signal<ViewMode>('list');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly templates = signal<SmsTemplateRow[]>([]);
  /** SMS types still unused by an active template (legacy filter). */
  readonly smsTypes = signal<SmsType[]>([]);
  /** Parameter groups (value types) from `sms/getSMSParameters`. */
  readonly parameterGroups = signal<SmsParameterGroup[]>([]);
  /** Values of the currently selected parameter group. */
  readonly groupValues = signal<SmsParameterValue[]>([]);
  /** `$$TOKEN$$` parameters not yet mapped to a value. */
  readonly remainingParameters = signal<string[]>([]);
  readonly parameterMaps = signal<SmsParameterMap[]>([]);
  readonly parametersExtracted = signal(false);
  readonly templateLength = signal(0);

  readonly viewRow = signal<SmsTemplateRow | null>(null);
  readonly viewParameterMaps = computed(() => this.viewRow()?.smsParameterMaps ?? []);

  private loadReqId = 0;
  private viewReqId = 0;

  readonly createForm = this.fb.group({
    templateName: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(40)],
    }),
    smsTypeID: this.fb.control<number | null>(null, [Validators.required]),
    smsTemplate: this.fb.control('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(20),
        Validators.maxLength(500),
        // The legacy screen blocked these characters at input time.
        (control) =>
          typeof control.value === 'string' && BLOCKED_CHARS.test(control.value)
            ? { blockedChars: true }
            : null,
      ],
    }),
    parameter: this.fb.control<string | null>(null),
    valueGroup: this.fb.control<SmsParameterGroup | null>(null),
    value: this.fb.control<SmsParameterValue | null>(null),
  });

  ngOnInit(): void {
    this.createForm.controls.smsTemplate.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.templateLength.set(value?.length ?? 0));
    this.loadTemplates();
  }

  private psmID(): number | null {
    return this.authStore.currentRole()?.providerServiceMapID ?? null;
  }

  private serviceID(): number | null {
    return this.authStore.currentRole()?.serviceID ?? null;
  }

  private loadTemplates(): void {
    const reqId = ++this.loadReqId;
    this.loading.set(true);
    this.errorMessage.set('');
    this.service
      .getSMSTemplates(this.psmID())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          if (reqId !== this.loadReqId) {
            return;
          }
          this.loading.set(false);
          this.templates.set(rows);
        },
        error: (err: SupervisorError) => {
          if (reqId !== this.loadReqId) {
            return;
          }
          this.loading.set(false);
          this.templates.set([]);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }

  openCreate(): void {
    this.createForm.reset();
    this.createForm.controls.templateName.enable();
    this.createForm.controls.smsTemplate.enable();
    this.parametersExtracted.set(false);
    this.remainingParameters.set([]);
    this.parameterMaps.set([]);
    this.groupValues.set([]);
    this.errorMessage.set('');
    this.mode.set('create');

    // Legacy `getSMStypes`: hide types already used by an active template.
    const usedTypeIDs = new Set(
      this.templates()
        .filter((t) => !t.deleted)
        .map((t) => t.smsType?.smsTypeID)
        .filter((id): id is number => id != null),
    );
    this.service
      .getSMSTypes(this.serviceID())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => {
          const available = types.filter((t) => !usedTypeIDs.has(t.smsTypeID));
          this.smsTypes.set(available);
          if (available.length === 0) {
            this.errorMessage.set(this.i18n.instant('supSms.allTypesUsed'));
          }
        },
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
  }

  /**
   * Legacy `extractParameters`: pull the distinct `$$TOKEN$$` placeholders out
   * of the template text, always append `SMS_PHONE_NO`, then lock the name and
   * text while the parameters are mapped.
   */
  extractParameters(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const text = this.createForm.controls.smsTemplate.value ?? '';
    const tokens = text
      .replace(/[!?.,\n]/g, ' ')
      .split(' ')
      .filter((word) => word.startsWith('$$') && word.endsWith('$$') && word.length > 4)
      .map((word) => word.slice(2, -2));
    const parameters = [...new Set(tokens), PHONE_PARAMETER];

    this.remainingParameters.set(parameters);
    this.parameterMaps.set([]);
    this.parametersExtracted.set(true);
    this.errorMessage.set('');
    this.createForm.controls.templateName.disable();
    this.createForm.controls.smsTemplate.disable();

    this.service
      .getSMSParameters(this.serviceID())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groups) => this.parameterGroups.set(groups),
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
  }

  onGroupChange(): void {
    this.createForm.controls.value.setValue(null);
    this.groupValues.set(this.createForm.controls.valueGroup.value?.smsParameters ?? []);
  }

  addMapping(): void {
    const { parameter, valueGroup, value } = this.createForm.getRawValue();
    if (!parameter || !valueGroup || !value) {
      this.errorMessage.set(this.i18n.instant('supSms.paramIncomplete'));
      return;
    }
    this.errorMessage.set('');
    const userName = this.authStore.user()?.userName ?? null;
    this.parameterMaps.set([
      ...this.parameterMaps(),
      {
        createdBy: userName,
        modifiedBy: userName,
        smsParameterName: parameter,
        smsParameterType: valueGroup.smsParameterType,
        smsParameterID: value.smsParameterID,
        smsParameterValue: value.smsParameterName,
      },
    ]);
    this.remainingParameters.set(this.remainingParameters().filter((p) => p !== parameter));
    this.createForm.controls.parameter.setValue(null);
    this.createForm.controls.valueGroup.setValue(null);
    this.createForm.controls.value.setValue(null);
    this.groupValues.set([]);
  }

  removeMapping(index: number): void {
    const maps = [...this.parameterMaps()];
    const [removed] = maps.splice(index, 1);
    this.parameterMaps.set(maps);
    if (removed?.smsParameterName) {
      this.remainingParameters.set([...this.remainingParameters(), removed.smsParameterName]);
    }
  }

  /** Legacy `cancel`: unlock the text and drop the extraction state. */
  cancelParameters(): void {
    this.parametersExtracted.set(false);
    this.remainingParameters.set([]);
    this.parameterMaps.set([]);
    this.groupValues.set([]);
    this.errorMessage.set('');
    this.createForm.controls.templateName.enable();
    this.createForm.controls.smsTemplate.enable();
    this.createForm.controls.parameter.setValue(null);
    this.createForm.controls.valueGroup.setValue(null);
    this.createForm.controls.value.setValue(null);
  }

  save(): void {
    if (this.remainingParameters().length > 0) {
      return;
    }
    const { templateName, smsTypeID, smsTemplate } = this.createForm.getRawValue();
    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .saveSMSTemplate({
        createdBy: this.authStore.user()?.userName ?? null,
        providerServiceMapID: this.psmID(),
        smsParameterMaps: this.parameterMaps(),
        smsTemplate: smsTemplate?.trim() || null,
        smsTemplateName: templateName?.trim() || null,
        smsTypeID,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          toast.success(this.i18n.instant('supSms.saved'));
          this.backToList();
        },
        error: (err: SupervisorError) => {
          this.saving.set(false);
          this.errorMessage.set(err.errorMessage || this.i18n.instant('supSms.saveFailed'));
        },
      });
  }

  /** Legacy `ActivateDeactivate(row, true)`: POST the row back with `deleted` set. */
  deactivate(row: SmsTemplateRow): void {
    this.errorMessage.set('');
    this.service
      .updateSMSTemplate({
        ...row,
        deleted: true,
        modifiedBy: this.authStore.user()?.userName ?? null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          toast.success(this.i18n.instant('supSms.deactivatedSuccess'));
          this.loadTemplates();
        },
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
  }

  view(row: SmsTemplateRow): void {
    const reqId = ++this.viewReqId;
    this.errorMessage.set('');
    this.service
      .getFullSMSTemplate(row.providerServiceMapID ?? this.psmID(), row.smsTemplateID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (full) => {
          if (reqId !== this.viewReqId) {
            return;
          }
          this.viewRow.set(full ?? row);
          this.mode.set('view');
        },
        error: (err: SupervisorError) => {
          if (reqId === this.viewReqId) {
            this.errorMessage.set(err.errorMessage);
          }
        },
      });
  }

  backToList(): void {
    this.mode.set('list');
    this.viewRow.set(null);
    this.errorMessage.set('');
    this.cancelParameters();
    this.createForm.reset();
    this.loadTemplates();
  }
}
