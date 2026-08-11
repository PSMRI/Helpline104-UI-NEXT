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

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePaperclip, lucidePencil } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SupervisorError } from '../../shared/supervisor-api';
import { SUP_SELECT_CLASS, SUP_TEXTAREA_CLASS } from '../../shared/supervisor-ui';
import { KmFileManager, NotificationCreateRequest, NotificationRow, ProviderRole } from './notification.models';
import { SupervisorNotificationService } from './notification.service';

type ViewMode = 'table' | 'create' | 'edit';

/** Allowed attachment extensions (legacy `valid_file_extensions`). */
const VALID_FILE_EXTENSIONS = ['msg', 'pdf', 'png', 'jpeg', 'jpg', 'doc', 'docx', 'xlsx', 'xls', 'csv', 'txt'];
/** Max attachment size in MB (legacy `maxFileSize`). */
const MAX_FILE_SIZE_MB = 5;

/**
 * Training resources admin (legacy `SupervisorTrainingResourcesComponent`):
 * list the KM training resources published in the current week, create one
 * per selected role (with an optional attachment sent inline as base64), edit
 * subject/message/attachment, and activate / deactivate.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-training-resources-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucidePaperclip, lucidePencil })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        @switch (mode()) {
          @case ('table') {
            {{ 'supTraining.listTitle' | translate: lang() }}
          }
          @case ('create') {
            {{ 'supTraining.title' | translate: lang() }}
          }
          @case ('edit') {
            {{ 'supTraining.editTitle' | translate: lang() }}
          }
        }
      </h1>

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      <!-- List -->
      @if (mode() === 'table') {
        @if (loading()) {
          <p class="py-8 text-center text-sm text-muted-foreground">
            {{ 'supTraining.loading' | translate: lang() }}
          </p>
        } @else {
          <div class="overflow-x-auto rounded-md border border-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supTraining.sno' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supTraining.type' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supTraining.role' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supTraining.subject' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supTraining.description' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supTraining.attachment' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supTraining.action' | translate: lang() }}
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (row of resources(); track row.notificationID) {
                  <tr class="border-t border-border align-top">
                    <td class="px-3 py-2">{{ $index + 1 }}</td>
                    <td class="px-3 py-2">{{ row.notificationType?.notificationType || '—' }}</td>
                    <td class="px-3 py-2">{{ row.role?.RoleName || '—' }}</td>
                    <td class="px-3 py-2">{{ row.notification || '—' }}</td>
                    <td class="px-3 py-2">{{ row.notificationDesc || '—' }}</td>
                    <td class="px-3 py-2">
                      @if (row.kmFileManager && row.kmFilePath) {
                        <a
                          class="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                          [href]="row.kmFilePath"
                          target="_blank"
                          rel="noopener noreferrer"
                          [title]="row.kmFileManager.fileName || ''"
                        >
                          <ng-icon name="lucidePaperclip" size="14" aria-hidden="true" />
                          {{ row.kmFileManager.fileName || '—' }}
                        </a>
                      } @else {
                        —
                      }
                    </td>
                    <td class="px-3 py-2">
                      <div class="flex items-center gap-2">
                        @if (!row.deleted) {
                          <button
                            z-button
                            type="button"
                            zType="ghost"
                            zSize="sm"
                            [attr.aria-label]="'supTraining.edit' | translate: lang()"
                            (click)="openEdit(row)"
                          >
                            <ng-icon name="lucidePencil" size="16" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            class="text-primary underline-offset-2 hover:underline"
                            (click)="setDeleted(row, true)"
                          >
                            {{ 'supTraining.deactivate' | translate: lang() }}
                          </button>
                        } @else {
                          <button
                            type="button"
                            class="text-primary underline-offset-2 hover:underline"
                            (click)="setDeleted(row, false)"
                          >
                            {{ 'supTraining.activate' | translate: lang() }}
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="px-3 py-8 text-center text-muted-foreground">
                      {{ 'supTraining.noRecords' | translate: lang() }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="mt-4 flex justify-end">
            <button z-button type="button" zType="default" (click)="openCreate()">
              {{ 'supTraining.createTitle' | translate: lang() }}
            </button>
          </div>
        }
      }

      <!-- Create / Edit share the same form shell -->
      @if (mode() !== 'table') {
        <form [formGroup]="form" autocomplete="off" class="grid gap-4 sm:grid-cols-2">
          @if (mode() === 'create') {
            <div>
              <span class="mb-1 block text-xs font-medium text-muted-foreground">
                {{ 'supTraining.selectRoles' | translate: lang() }}
                <span class="text-destructive">*</span>
              </span>
              <ul class="max-h-40 space-y-1 overflow-y-auto rounded-md border border-input px-3 py-2">
                @for (role of roles(); track role.roleID) {
                  <li>
                    <label class="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        class="h-4 w-4 rounded border-input text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        [checked]="selectedRoles().has(role.roleID)"
                        (change)="toggleRole(role.roleID)"
                      />
                      {{ role.roleName }}
                    </label>
                  </li>
                } @empty {
                  <li class="text-sm text-muted-foreground">
                    {{ 'supComm.noRoles' | translate: lang() }}
                  </li>
                }
              </ul>
            </div>
          }
          @if (mode() === 'edit' && editingHasFile()) {
            <div>
              <label for="tr-existing" class="mb-1 block text-xs font-medium text-muted-foreground">
                {{ 'supTraining.existingFile' | translate: lang() }}
              </label>
              <input id="tr-existing" z-input class="w-full" [value]="existingFileName()" disabled />
            </div>
          }
          <div>
            <label for="tr-subject" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supTraining.subject' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="tr-subject" z-input class="w-full" maxlength="200" formControlName="subject" />
            @if (form.controls.subject.invalid && form.controls.subject.touched) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supTraining.minFiveChars' | translate: lang() }}
              </p>
            }
          </div>
          <div class="sm:col-span-2">
            <label for="tr-message" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supTraining.message' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <textarea
              id="tr-message"
              [class]="textareaClass"
              rows="3"
              maxlength="300"
              formControlName="message"
            ></textarea>
            <div class="mt-1 flex justify-between text-xs">
              <span class="font-medium text-destructive">
                @if (form.controls.message.invalid && form.controls.message.touched) {
                  {{ 'supTraining.minFiveChars' | translate: lang() }}
                }
              </span>
              <span class="text-muted-foreground">{{ messageLength() }}/300</span>
            </div>
          </div>
          <div class="sm:col-span-2">
            <label for="tr-file" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supTraining.uploadFile' | translate: lang() }}
              ({{ 'supTraining.sizeLimit' | translate: lang() }}: {{ maxFileSize }}
              {{ 'supTraining.mb' | translate: lang() }}, {{ 'supTraining.supportedFormats' | translate: lang() }})
            </label>
            <input
              id="tr-file"
              type="file"
              class="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1 file:text-sm file:font-medium"
              (change)="onFileUpload($event)"
            />
            @if (invalidFileType()) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supTraining.supportedFormats' | translate: lang() }}
              </p>
            }
            @if (noFileChosen()) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supTraining.chooseFile' | translate: lang() }}
              </p>
            }
            @if (fileTooLarge()) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supTraining.fileTooLarge' | translate: lang() }} {{ maxFileSize }}
                {{ 'supTraining.mb' | translate: lang() }}
              </p>
            }
            @if (invalidFileName()) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supTraining.invalidFileName' | translate: lang() }}
              </p>
            }
          </div>
          <div class="sm:col-span-2 flex justify-between">
            <button z-button type="button" zType="outline" (click)="backToTable()">
              {{ 'supTraining.back' | translate: lang() }}
            </button>
            @if (mode() === 'create') {
              <button
                z-button
                type="button"
                zType="default"
                [zLoading]="saving()"
                [zDisabled]="form.invalid || selectedRoles().size === 0 || fileInvalid() || saving()"
                (click)="create()"
              >
                {{ 'supTraining.submit' | translate: lang() }}
              </button>
            } @else {
              <button
                z-button
                type="button"
                zType="default"
                [zLoading]="saving()"
                [zDisabled]="form.invalid || fileInvalid() || saving()"
                (click)="update()"
              >
                {{ 'supTraining.update' | translate: lang() }}
              </button>
            }
          </div>
        </form>
      }
    </section>
  `,
})
export class TrainingResourcesAdminComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SupervisorNotificationService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly textareaClass = SUP_TEXTAREA_CLASS;
  readonly selectClass = SUP_SELECT_CLASS;
  readonly maxFileSize = MAX_FILE_SIZE_MB;

  readonly mode = signal<ViewMode>('table');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly roles = signal<ProviderRole[]>([]);
  readonly selectedRoles = signal<ReadonlySet<number>>(new Set());
  readonly resources = signal<NotificationRow[]>([]);
  readonly messageLength = signal(0);
  readonly editingHasFile = signal(false);
  readonly existingFileName = signal('');

  readonly noFileChosen = signal(false);
  readonly fileTooLarge = signal(false);
  readonly invalidFileType = signal(false);
  readonly invalidFileName = signal(false);
  readonly fileInvalid = computed(() => this.fileTooLarge() || this.invalidFileType() || this.invalidFileName());

  /** The `KM` notification type id, resolved on init. */
  private notificationTypeID: number | null = null;
  private allRoleIDs: number[] = [];
  private editingRow: NotificationRow | null = null;
  private file: File | null = null;
  /** Data-URI content of the picked file (base64 after the comma). */
  private fileContent: string | null = null;

  readonly form = this.fb.group({
    subject: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(200)],
    }),
    message: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(300)],
    }),
  });

  ngOnInit(): void {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => {
      this.messageLength.set(v.message?.length ?? 0);
    });

    const psmID = this.psmID();
    this.loading.set(true);
    this.service
      .getNotificationTypes(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => {
          const km = types.find((t) => t.notificationType.toUpperCase() === 'KM');
          if (!km) {
            this.loading.set(false);
            this.errorMessage.set(this.i18n.instant('supComm.noNotificationTypes'));
            return;
          }
          this.notificationTypeID = km.notificationTypeID;
          this.loadRolesThenResources();
        },
        error: (err: SupervisorError) => {
          this.loading.set(false);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }

  private psmID(): number | null {
    return this.authStore.currentRole()?.providerServiceMapID ?? null;
  }

  private loadRolesThenResources(): void {
    this.service
      .getRoles(this.psmID())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (roles) => {
          this.roles.set(roles);
          this.allRoleIDs = roles.map((r) => r.roleID);
          if (roles.length === 0) {
            this.loading.set(false);
            this.errorMessage.set(this.i18n.instant('supComm.noRoles'));
            return;
          }
          this.loadResources();
        },
        error: (err: SupervisorError) => {
          this.loading.set(false);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }

  /** Current week's resources: today .. +7 days, all roles (legacy). */
  private loadResources(): void {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 0);
    this.loading.set(true);
    this.service
      .getSupervisorNotifications({
        providerServiceMapID: this.psmID(),
        notificationTypeID: this.notificationTypeID,
        roleIDs: this.allRoleIDs,
        validStartDate: start.toISOString(),
        validEndDate: end.toISOString(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.loading.set(false);
          this.resources.set(rows);
        },
        error: (err: SupervisorError) => {
          this.loading.set(false);
          this.resources.set([]);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }

  toggleRole(id: number): void {
    const next = new Set(this.selectedRoles());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.selectedRoles.set(next);
  }

  openCreate(): void {
    this.form.reset();
    this.selectedRoles.set(new Set());
    this.resetFile();
    this.errorMessage.set('');
    this.mode.set('create');
  }

  openEdit(row: NotificationRow): void {
    this.editingRow = row;
    this.resetFile();
    this.errorMessage.set('');
    this.editingHasFile.set(!!row.kmFileManagerID);
    this.existingFileName.set(row.kmFileManager?.fileName ?? '-');
    this.form.reset({
      subject: row.notification ?? '',
      message: row.notificationDesc ?? '',
    });
    this.mode.set('edit');
  }

  backToTable(): void {
    this.form.reset();
    this.resetFile();
    this.errorMessage.set('');
    this.mode.set('table');
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
    };
    reader.readAsDataURL(file);
  }

  private resetFile(): void {
    this.file = null;
    this.fileContent = null;
    this.noFileChosen.set(false);
    this.fileTooLarge.set(false);
    this.invalidFileType.set(false);
    this.invalidFileName.set(false);
  }

  private buildKmFileManager(validFrom: string, validUpto: string): KmFileManager | undefined {
    if (!this.file || !this.fileContent) {
      return undefined;
    }
    return {
      fileName: this.file.name,
      fileExtension: '.' + this.file.name.split('.')[1],
      providerServiceMapID: this.psmID(),
      userID: this.authStore.user()?.userID ?? null,
      validFrom,
      validUpto,
      fileContent: this.fileContent.split(',')[1] ?? '',
      createdBy: this.authStore.user()?.userName ?? null,
    };
  }

  create(): void {
    if (this.form.invalid || this.selectedRoles().size === 0 || this.fileInvalid()) {
      this.form.markAllAsTouched();
      return;
    }
    const { subject, message } = this.form.getRawValue();
    // Legacy validity window: today 00:00 to +20 years 23:59:59.
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setFullYear(end.getFullYear() + 20);
    end.setHours(23, 59, 59, 0);
    const validFrom = start.toISOString();
    const validTill = end.toISOString();

    const base: NotificationCreateRequest = {
      providerServiceMapID: this.psmID(),
      notificationTypeID: this.notificationTypeID,
      createdBy: this.authStore.user()?.userName ?? null,
      notification: subject.trim() || null,
      notificationDesc: message.trim() || null,
      validFrom,
      validTill,
      kmFileManager: this.buildKmFileManager(validFrom, validTill),
    };
    const body = [...this.selectedRoles()].map((roleID) => ({ ...base, roleID }));

    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .createNotifications(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          toast.success(this.i18n.instant('supTraining.created'));
          this.form.reset();
          this.selectedRoles.set(new Set());
          this.resetFile();
          this.loadResources();
        },
        error: (err: SupervisorError) => {
          this.saving.set(false);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }

  update(): void {
    const row = this.editingRow;
    if (!row || this.form.invalid || this.fileInvalid()) {
      this.form.markAllAsTouched();
      return;
    }
    const { subject, message } = this.form.getRawValue();
    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .updateNotification({
        providerServiceMapID: this.psmID(),
        notificationTypeID: row.notificationTypeID,
        notificationID: row.notificationID,
        roleID: row.roleID,
        notification: subject.trim() || null,
        notificationDesc: message.trim() || null,
        validFrom: row.validFrom ?? '',
        validTill: row.validTill ?? '',
        deleted: false,
        modifiedBy: this.authStore.user()?.userName ?? null,
        kmFileManager: this.buildKmFileManager(row.validFrom ?? '', row.validTill ?? ''),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          toast.success(this.i18n.instant('supTraining.updated'));
          this.backToTable();
          this.loadResources();
        },
        error: (err: SupervisorError) => {
          this.saving.set(false);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }

  /** Activate / deactivate by flipping `deleted` (legacy payload shape). */
  setDeleted(row: NotificationRow, deleted: boolean): void {
    this.errorMessage.set('');
    this.service
      .updateNotification({
        providerServiceMapID: this.psmID(),
        notificationTypeID: row.notificationTypeID,
        notificationID: row.notificationID,
        roleID: row.roleID,
        notification: row.notification ?? null,
        notificationDesc: row.notificationDesc ?? null,
        deleted,
        validFrom: row.validFrom ?? '',
        validTill: row.validTill ?? '',
        modifiedBy: this.authStore.user()?.userName ?? null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          toast.success(this.i18n.instant(deleted ? 'supTraining.deactivated' : 'supTraining.activated'));
          this.loadResources();
        },
        error: () => {
          this.errorMessage.set(
            this.i18n.instant(deleted ? 'supTraining.deactivateFailed' : 'supTraining.activateFailed'),
          );
        },
      });
  }
}
