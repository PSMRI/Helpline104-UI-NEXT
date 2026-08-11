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

import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';

import { AuthStore } from '../../../core/auth/auth.store';
import { ConfigService } from '../../../core/services/config.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SupervisorError } from '../../shared/supervisor-api';
import { SUP_SELECT_CLASS } from '../../shared/supervisor-ui';
import {
  KmCategory,
  KmFileEntry,
  KmSubCategory,
  KnowledgeManagementService,
  SubServiceType,
} from './knowledge-management.service';

/** Allowed upload extensions (legacy `valid_file_extensions`). */
const VALID_FILE_EXTENSIONS = ['msg', 'pdf', 'png', 'jpeg', 'jpg', 'doc', 'docx', 'xlsx', 'xls', 'csv', 'txt'];
/** Max upload size in MB (legacy `maxFileSize`). */
const MAX_FILE_SIZE_MB = 5;

/**
 * Knowledge management / content management (legacy
 * `KnowledgeManagementComponent`): pick a sub-service → category →
 * sub-category, upload a KM document against it (base64 inline), and browse
 * the sub-category's previously uploaded files.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-knowledge-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, TranslatePipe, ZardButtonComponent],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        {{ 'supKm.title' | translate: lang() }}
      </h1>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      <form [formGroup]="form" autocomplete="off" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label for="km-service" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supKm.selectService' | translate: lang() }}
            <span class="text-destructive">*</span>
          </label>
          <select id="km-service" [class]="selectClass" formControlName="subServiceID" (change)="onServiceChange()">
            <option [ngValue]="null" disabled>{{ 'supKm.select' | translate: lang() }}</option>
            @for (s of services(); track s.subServiceID) {
              <option [ngValue]="s.subServiceID">{{ s.subServiceName }}</option>
            }
          </select>
        </div>
        <div>
          <label for="km-category" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supKm.selectCategory' | translate: lang() }}
            <span class="text-destructive">*</span>
          </label>
          <select id="km-category" [class]="selectClass" formControlName="categoryID" (change)="onCategoryChange()">
            <option [ngValue]="null" disabled>{{ 'supKm.select' | translate: lang() }}</option>
            @for (c of categories(); track c.categoryID) {
              <option [ngValue]="c.categoryID">{{ c.categoryName }}</option>
            }
          </select>
        </div>
        <div>
          <label for="km-subcategory" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supKm.selectSubCategory' | translate: lang() }}
            <span class="text-destructive">*</span>
          </label>
          <select
            id="km-subcategory"
            [class]="selectClass"
            formControlName="subCategoryID"
            (change)="onSubCategoryChange()"
          >
            <option [ngValue]="null" disabled>{{ 'supKm.select' | translate: lang() }}</option>
            @for (s of subCategories(); track s.subCategoryID) {
              <option [ngValue]="s.subCategoryID">{{ s.subCategoryName }}</option>
            }
          </select>
        </div>
        <div>
          <label for="km-file" class="mb-1 block text-xs font-medium text-muted-foreground">
            {{ 'supKm.uploadFile' | translate: lang() }}
            ({{ 'supKm.sizeLimit' | translate: lang() }}: {{ maxFileSize }} {{ 'supKm.mb' | translate: lang() }},
            {{ 'supKm.supportedFormats' | translate: lang() }})
            <span class="text-destructive">*</span>
          </label>
          <input
            id="km-file"
            #fileInput
            type="file"
            class="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1 file:text-sm file:font-medium"
            (change)="onFileUpload($event)"
          />
          @if (invalidFileType()) {
            <p class="mt-1 text-xs font-medium text-destructive">
              {{ 'supKm.supportedFormats' | translate: lang() }}
            </p>
          }
          @if (noFileChosen()) {
            <p class="mt-1 text-xs font-medium text-destructive">
              {{ 'supKm.chooseFile' | translate: lang() }}
            </p>
          }
          @if (fileTooLarge()) {
            <p class="mt-1 text-xs font-medium text-destructive">
              {{ 'supKm.fileTooLarge' | translate: lang() }} {{ maxFileSize }}
              {{ 'supKm.mb' | translate: lang() }}
            </p>
          }
          @if (invalidFileName()) {
            <p class="mt-1 text-xs font-medium text-destructive">
              {{ 'supKm.invalidFileName' | translate: lang() }}
            </p>
          }
        </div>

        @if (uploadedFiles().length > 0) {
          <div class="sm:col-span-2 lg:col-span-4">
            <h2 class="mb-2 text-sm font-semibold text-foreground">
              {{ 'supKm.previousFiles' | translate: lang() }}
            </h2>
            <ul class="space-y-1 text-sm">
              @for (file of uploadedFiles(); track $index) {
                <li>
                  <a
                    class="text-primary underline-offset-2 hover:underline"
                    [href]="fileUrl(file)"
                    target="_blank"
                    rel="noopener noreferrer"
                    >{{ file.fileName }}{{ file.fileExtension }}</a
                  >
                  <span class="text-muted-foreground">
                    – {{ file.versionNo ?? '' }} {{ 'supKm.by' | translate: lang() }}
                    {{ file.createdBy ?? '' }}
                    @if (file.createdDate) {
                      {{ 'supKm.on' | translate: lang() }}
                      {{ file.createdDate | date: 'medium' }}
                    }
                  </span>
                </li>
              }
            </ul>
          </div>
        }

        <div class="sm:col-span-2 lg:col-span-4 flex justify-end">
          <button
            z-button
            type="button"
            zType="default"
            [zLoading]="saving()"
            [zDisabled]="form.invalid || !hasFile() || fileInvalid() || saving()"
            (click)="save()"
          >
            {{ 'supKm.save' | translate: lang() }}
          </button>
        </div>
      </form>
    </section>
  `,
})
export class KnowledgeManagementComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(KnowledgeManagementService);
  private readonly config = inject(ConfigService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly selectClass = SUP_SELECT_CLASS;
  readonly maxFileSize = MAX_FILE_SIZE_MB;

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly services = signal<SubServiceType[]>([]);
  readonly categories = signal<KmCategory[]>([]);
  readonly subCategories = signal<KmSubCategory[]>([]);
  /** Previously uploaded files of the selected sub-category. */
  readonly uploadedFiles = signal<KmFileEntry[]>([]);
  readonly hasFile = signal(false);

  readonly noFileChosen = signal(false);
  readonly fileTooLarge = signal(false);
  readonly invalidFileType = signal(false);
  readonly invalidFileName = signal(false);
  readonly fileInvalid = computed(() => this.fileTooLarge() || this.invalidFileType() || this.invalidFileName());

  private file: File | null = null;
  private fileContent: string | null = null;
  private categoriesReqId = 0;
  private subCategoriesReqId = 0;

  readonly form = this.fb.group({
    subServiceID: this.fb.control<number | null>(null, [Validators.required]),
    categoryID: this.fb.control<number | null>(null, [Validators.required]),
    subCategoryID: this.fb.control<number | null>(null, [Validators.required]),
  });

  ngOnInit(): void {
    this.service
      .getServiceTypes(this.psmID())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (services) => this.services.set(services),
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
  }

  private psmID(): number | null {
    return this.authStore.currentRole()?.providerServiceMapID ?? null;
  }

  fileUrl(file: KmFileEntry): string {
    return this.config.getOpenKmBaseURL() + (file.fileUID ?? '');
  }

  onServiceChange(): void {
    this.errorMessage.set('');
    const subServiceID = this.form.controls.subServiceID.value;
    this.form.controls.categoryID.setValue(null);
    this.form.controls.subCategoryID.setValue(null);
    this.categories.set([]);
    this.subCategories.set([]);
    this.uploadedFiles.set([]);
    if (subServiceID == null) {
      return;
    }
    const reqId = ++this.categoriesReqId;
    this.service
      .getCategories(subServiceID, this.psmID())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => {
          if (reqId !== this.categoriesReqId) {
            return;
          }
          this.categories.set(categories);
          if (categories.length === 0) {
            this.errorMessage.set(this.i18n.instant('supKm.noCategory'));
          }
        },
        error: (err: SupervisorError) => {
          if (reqId === this.categoriesReqId) {
            this.errorMessage.set(err.errorMessage);
          }
        },
      });
  }

  onCategoryChange(): void {
    this.errorMessage.set('');
    const categoryID = this.form.controls.categoryID.value;
    this.form.controls.subCategoryID.setValue(null);
    this.subCategories.set([]);
    this.uploadedFiles.set([]);
    if (categoryID == null) {
      return;
    }
    const reqId = ++this.subCategoriesReqId;
    this.service
      .getSubCategories(categoryID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (subCategories) => {
          if (reqId === this.subCategoriesReqId) {
            this.subCategories.set(subCategories);
          }
        },
        error: (err: SupervisorError) => {
          if (reqId === this.subCategoriesReqId) {
            this.errorMessage.set(err.errorMessage);
          }
        },
      });
  }

  onSubCategoryChange(): void {
    const subCategoryID = this.form.controls.subCategoryID.value;
    const match = this.subCategories().find((s) => s.subCategoryID === subCategoryID);
    this.uploadedFiles.set(match?.fileManger ?? []);
  }

  /** File validation ported from the legacy `readThis`/`checkExtension`. */
  onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.resetFile();
    const files = input.files;
    if (!files || files.length === 0) {
      this.noFileChosen.set(true);
      return;
    }
    const file = files[0];
    const parts = file.name.split('.');
    if (!parts[0]) {
      this.invalidFileName.set(true);
      return;
    }
    if (parts.length !== 2 || !VALID_FILE_EXTENSIONS.includes(parts[1].toLowerCase())) {
      this.invalidFileType.set(true);
      return;
    }
    if (file.size / 1000 / 1000 > MAX_FILE_SIZE_MB) {
      this.fileTooLarge.set(true);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      this.file = file;
      this.fileContent = typeof reader.result === 'string' ? reader.result : null;
      this.hasFile.set(true);
    };
    reader.readAsDataURL(file);
  }

  private resetFile(): void {
    this.file = null;
    this.fileContent = null;
    this.hasFile.set(false);
    this.noFileChosen.set(false);
    this.fileTooLarge.set(false);
    this.invalidFileType.set(false);
    this.invalidFileName.set(false);
  }

  save(): void {
    if (this.form.invalid || !this.file || this.fileInvalid()) {
      this.form.markAllAsTouched();
      return;
    }
    const { categoryID, subCategoryID } = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .uploadDocuments([
        {
          fileName: this.file.name,
          fileExtension: '.' + this.file.name.split('.')[1],
          providerServiceMapID: this.psmID(),
          userID: this.authStore.user()?.userID ?? null,
          ...(this.fileContent ? { fileContent: this.fileContent.split(',')[1] ?? '' } : {}),
          createdBy: this.authStore.user()?.userName ?? null,
          categoryID,
          subCategoryID,
        },
      ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (uploaded) => {
          this.saving.set(false);
          toast.success(this.i18n.instant('supKm.uploaded'));
          // Prepend the new file to the visible list (legacy behaviour).
          if (uploaded.length > 0) {
            this.uploadedFiles.set([uploaded[0], ...this.uploadedFiles()]);
          }
          this.resetFile();
          const input = this.fileInput()?.nativeElement;
          if (input) {
            input.value = '';
          }
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set(this.i18n.instant('supKm.uploadFailed'));
          const input = this.fileInput()?.nativeElement;
          if (input) {
            input.value = '';
          }
        },
      });
  }
}
