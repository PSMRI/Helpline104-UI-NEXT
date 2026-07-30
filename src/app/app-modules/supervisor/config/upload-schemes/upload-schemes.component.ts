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
import { lucidePencil } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SupervisorError } from '../../shared/supervisor-api';
import { SUP_TEXTAREA_CLASS } from '../../shared/supervisor-ui';
import { SaveSchemeRequest, SchemeRow } from './upload-schemes.models';
import { UploadSchemesService } from './upload-schemes.service';

/** Allowed attachment extensions (legacy `valid_file_extensions`). */
const VALID_FILE_EXTENSIONS = [
  'msg',
  'pdf',
  'png',
  'jpeg',
  'jpg',
  'doc',
  'docx',
  'xlsx',
  'xls',
  'csv',
  'txt',
];
/** Max attachment size in MB (legacy `maxFileSize`). */
const MAX_FILE_SIZE_MB = 5;

/**
 * Upload schemes (legacy `SupervisorSchemeComponent`): list the health schemes
 * for the service, create a scheme with an attached document (base64 inline),
 * modify an existing scheme, and activate / deactivate.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-upload-schemes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucidePencil })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        @if (showTable()) {
          {{ 'supScheme.listTitle' | translate: lang() }}
        } @else {
          {{ 'supScheme.title' | translate: lang() }}
        }
      </h1>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      <!-- List -->
      @if (showTable()) {
        @if (loading()) {
          <p class="py-8 text-center text-sm text-muted-foreground">
            {{ 'supScheme.loading' | translate: lang() }}
          </p>
        } @else {
          <div class="overflow-x-auto rounded-md border border-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supScheme.sno' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supScheme.name' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supScheme.description' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supScheme.document' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supScheme.edit' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supScheme.action' | translate: lang() }}
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (scheme of schemes(); track scheme.schemeID) {
                  <tr class="border-t border-border align-top">
                    <td class="px-3 py-2">{{ $index + 1 }}</td>
                    <td class="px-3 py-2">{{ scheme.schemeName || '—' }}</td>
                    <td class="px-3 py-2">{{ scheme.schemeDesc || '—' }}</td>
                    <td class="px-3 py-2">
                      @if (scheme.kmFilePath) {
                        <a
                          class="text-primary underline-offset-2 hover:underline"
                          [href]="scheme.kmFilePath"
                          target="_blank"
                          rel="noopener noreferrer"
                          >{{ scheme.kmFileManager?.fileName || scheme.kmFilePath }}</a
                        >
                      } @else {
                        —
                      }
                    </td>
                    <td class="px-3 py-2">
                      @if (!scheme.deleted) {
                        <button
                          z-button
                          type="button"
                          zType="ghost"
                          zSize="sm"
                          [attr.aria-label]="'supScheme.edit' | translate: lang()"
                          (click)="openEdit(scheme)"
                        >
                          <ng-icon name="lucidePencil" size="16" aria-hidden="true" />
                        </button>
                      } @else {
                        —
                      }
                    </td>
                    <td class="px-3 py-2">
                      @if (scheme.deleted) {
                        <button
                          type="button"
                          class="text-primary underline-offset-2 hover:underline"
                          (click)="setDeleted(scheme, false)"
                        >
                          {{ 'supScheme.activate' | translate: lang() }}
                        </button>
                      } @else {
                        <button
                          type="button"
                          class="text-primary underline-offset-2 hover:underline"
                          (click)="setDeleted(scheme, true)"
                        >
                          {{ 'supScheme.deactivate' | translate: lang() }}
                        </button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="px-3 py-8 text-center text-muted-foreground">
                      {{ 'supScheme.noRecords' | translate: lang() }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="mt-4 flex justify-end">
            <button z-button type="button" zType="default" (click)="openCreate()">
              {{ 'supScheme.create' | translate: lang() }}
            </button>
          </div>
        }
      }

      <!-- Create / Modify form -->
      @if (!showTable()) {
        <form
          [formGroup]="form"
          autocomplete="off"
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div>
            <label for="sch-name" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supScheme.name' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="sch-name"
              z-input
              class="w-full"
              maxlength="100"
              formControlName="schemeName"
            />
            @if (form.controls.schemeName.invalid && form.controls.schemeName.touched) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supScheme.enterName' | translate: lang() }}
              </p>
            }
          </div>
          <div>
            <label for="sch-desc" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supScheme.description' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <textarea
              id="sch-desc"
              [class]="textareaClass"
              rows="1"
              maxlength="300"
              formControlName="schemeDesc"
            ></textarea>
            <div class="mt-1 flex justify-between text-xs">
              <span class="font-medium text-destructive">
                @if (form.controls.schemeDesc.invalid && form.controls.schemeDesc.touched) {
                  {{ 'supScheme.enterDescription' | translate: lang() }}
                }
              </span>
              <span class="text-muted-foreground">{{ descLength() }}/300</span>
            </div>
          </div>
          <div>
            <label for="sch-file" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supScheme.uploadFile' | translate: lang() }}
              ({{ 'supScheme.sizeLimit' | translate: lang() }}: {{ maxFileSize }}
              {{ 'supScheme.mb' | translate: lang() }},
              {{ 'supScheme.supportedFormats' | translate: lang() }})
            </label>
            <input
              id="sch-file"
              type="file"
              class="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1 file:text-sm file:font-medium"
              (change)="onFileUpload($event)"
            />
            @if (invalidFileType()) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supScheme.supportedFormats' | translate: lang() }}
              </p>
            }
            @if (noFileChosen()) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supScheme.chooseFile' | translate: lang() }}
              </p>
            }
            @if (fileTooLarge()) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supScheme.fileTooLarge' | translate: lang() }} {{ maxFileSize }}
                {{ 'supScheme.mb' | translate: lang() }}
              </p>
            }
            @if (invalidFileName()) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supScheme.invalidFileName' | translate: lang() }}
              </p>
            }
            @if (fileReadError()) {
              <p class="mt-1 text-xs font-medium text-destructive" role="alert">
                {{ 'supScheme.fileReadError' | translate: lang() }}
              </p>
            }
          </div>
          @if (existingFileName()) {
            <div>
              <label
                for="sch-existing"
                class="mb-1 block text-xs font-medium text-muted-foreground"
              >
                {{ 'supScheme.uploadedFile' | translate: lang() }}
              </label>
              <input
                id="sch-existing"
                z-input
                class="w-full"
                [value]="existingFileName()"
                disabled
              />
            </div>
          }
          <div class="sm:col-span-2 lg:col-span-3 flex justify-between">
            <button z-button type="button" zType="outline" (click)="backToTable()">
              {{ 'supScheme.back' | translate: lang() }}
            </button>
            <button
              z-button
              type="button"
              zType="default"
              [zLoading]="saving()"
              [zDisabled]="form.invalid || fileInvalid() || reading() || saving()"
              (click)="save()"
            >
              {{ (isCreate() ? 'supScheme.submit' : 'supScheme.modify') | translate: lang() }}
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class UploadSchemesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(UploadSchemesService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly textareaClass = SUP_TEXTAREA_CLASS;
  readonly maxFileSize = MAX_FILE_SIZE_MB;

  readonly showTable = signal(true);
  readonly isCreate = signal(true);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly schemes = signal<SchemeRow[]>([]);
  readonly descLength = signal(0);
  readonly existingFileName = signal('');

  readonly noFileChosen = signal(false);
  readonly fileTooLarge = signal(false);
  readonly invalidFileType = signal(false);
  readonly invalidFileName = signal(false);
  /** The attachment is being read as base64; the save must wait for it. */
  readonly reading = signal(false);
  /** The FileReader failed (onerror); the attachment could not be read. */
  readonly fileReadError = signal(false);
  readonly fileInvalid = computed(
    () =>
      this.fileTooLarge() ||
      this.invalidFileType() ||
      this.invalidFileName() ||
      this.fileReadError(),
  );

  private editingSchemeID: number | null = null;
  private editingKmFileManagerID: number | null = null;
  private file: File | null = null;
  private fileContent: string | null = null;
  /** Extension (no dot) resolved from the chosen file's last segment. */
  private fileExt: string | null = null;

  readonly form = this.fb.group({
    schemeName: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    schemeDesc: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(300)],
    }),
  });

  ngOnInit(): void {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => {
      this.descLength.set(v.schemeDesc?.length ?? 0);
    });
    this.loadSchemes();
  }

  private psmID(): number | null {
    return this.authStore.currentRole()?.providerServiceMapID ?? null;
  }

  private loadSchemes(): void {
    this.loading.set(true);
    this.service
      .getSchemeList(this.psmID())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (schemes) => {
          this.loading.set(false);
          this.schemes.set(schemes);
        },
        error: (err: SupervisorError) => {
          this.loading.set(false);
          this.schemes.set([]);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }

  openCreate(): void {
    this.isCreate.set(true);
    this.editingSchemeID = null;
    this.editingKmFileManagerID = null;
    this.existingFileName.set('');
    this.form.reset();
    this.resetFile();
    this.errorMessage.set('');
    // Name is editable only when creating (legacy disabled it on modify).
    this.form.controls.schemeName.enable();
    this.showTable.set(false);
  }

  openEdit(scheme: SchemeRow): void {
    this.isCreate.set(false);
    this.editingSchemeID = scheme.schemeID;
    this.editingKmFileManagerID = scheme.kmFileManagerID ?? null;
    this.existingFileName.set(scheme.kmFileManager?.fileName ?? '');
    this.form.reset({
      schemeName: scheme.schemeName ?? '',
      schemeDesc: scheme.schemeDesc ?? '',
    });
    this.resetFile();
    this.errorMessage.set('');
    this.form.controls.schemeName.disable();
    this.showTable.set(false);
  }

  backToTable(): void {
    this.form.reset();
    this.resetFile();
    this.existingFileName.set('');
    this.errorMessage.set('');
    this.showTable.set(true);
  }

  /** File validation ported from the legacy `onFileUpload`/`checkExtension`. */
  onFileUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.resetFile();
    const files = input.files;
    if (!files || files.length === 0) {
      this.noFileChosen.set(true);
      return;
    }
    const file = files[0];
    // Extension = the last dot-segment, so names with multiple dots
    // ("scheme.final.pdf") validate on ".pdf" rather than being rejected.
    const name = file.name;
    const lastDot = name.lastIndexOf('.');
    const baseName = lastDot > 0 ? name.slice(0, lastDot) : name;
    const ext = lastDot > 0 ? name.slice(lastDot + 1).toLowerCase() : '';
    if (!baseName) {
      this.invalidFileName.set(true);
      return;
    }
    if (!ext || !VALID_FILE_EXTENSIONS.includes(ext)) {
      this.invalidFileType.set(true);
      return;
    }
    if (file.size / 1000 / 1000 > MAX_FILE_SIZE_MB) {
      this.fileTooLarge.set(true);
      return;
    }
    // Read as base64. Block the save until the read completes (onload) and
    // surface a read failure (onerror) instead of silently saving no content.
    this.reading.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      this.file = file;
      this.fileExt = ext;
      this.fileContent = typeof reader.result === 'string' ? reader.result : null;
      this.reading.set(false);
    };
    reader.onerror = () => {
      this.reading.set(false);
      this.fileReadError.set(true);
    };
    reader.readAsDataURL(file);
  }

  private resetFile(): void {
    this.file = null;
    this.fileContent = null;
    this.fileExt = null;
    this.reading.set(false);
    this.noFileChosen.set(false);
    this.fileTooLarge.set(false);
    this.invalidFileType.set(false);
    this.invalidFileName.set(false);
    this.fileReadError.set(false);
  }

  save(): void {
    if (this.form.invalid || this.fileInvalid() || this.reading()) {
      this.form.markAllAsTouched();
      return;
    }
    const psmID = this.psmID();
    const userName = this.authStore.user()?.userName ?? null;
    const userID = this.authStore.user()?.userID ?? null;
    const { schemeName, schemeDesc } = this.form.getRawValue();

    // Legacy body: with a new file the attachment content rides along; without
    // one, the existing kmFileManagerID is preserved on modify.
    const body: SaveSchemeRequest =
      this.file && this.fileContent
        ? {
            providerServiceMapID: psmID,
            schemeName: schemeName.trim() || null,
            schemeDesc: schemeDesc.trim() || null,
            deleted: false,
            createdBy: userName,
            kmFileManager: {
              fileName: this.file.name,
              fileExtension: '.' + (this.fileExt ?? ''),
              providerServiceMapID: psmID,
              userID,
              fileContent: this.fileContent.split(',')[1] ?? '',
              createdBy: userName,
            },
            ...(this.editingSchemeID != null ? { schemeID: this.editingSchemeID } : {}),
          }
        : {
            providerServiceMapID: psmID,
            schemeName: schemeName.trim() || null,
            schemeDesc: schemeDesc.trim() || null,
            deleted: false,
            createdBy: userName,
            kmFileManager: {
              userID,
              createdBy: userName,
              deleted: false,
              providerServiceMapID: psmID,
            },
            ...(this.editingSchemeID != null ? { schemeID: this.editingSchemeID } : {}),
            ...(this.editingSchemeID != null && this.editingKmFileManagerID != null
              ? { kmFileManagerID: this.editingKmFileManagerID }
              : {}),
          };

    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .saveScheme(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          toast.success(
            this.i18n.instant(
              this.editingSchemeID != null ? 'supScheme.modified' : 'supScheme.stored',
            ),
          );
          this.editingSchemeID = null;
          this.editingKmFileManagerID = null;
          this.backToTable();
          this.loadSchemes();
        },
        error: (err: SupervisorError) => {
          this.saving.set(false);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }

  setDeleted(scheme: SchemeRow, deleted: boolean): void {
    this.errorMessage.set('');
    this.service
      .setDeleted(scheme.schemeID, deleted)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          toast.success(
            this.i18n.instant(deleted ? 'supScheme.deactivated' : 'supScheme.activated'),
          );
          this.loadSchemes();
        },
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
  }
}
