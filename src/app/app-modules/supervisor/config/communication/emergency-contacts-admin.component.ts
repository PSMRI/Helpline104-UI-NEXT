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
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucidePlus, lucideX } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../../core/auth/auth.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { SupervisorError } from '../../shared/supervisor-api';
import { SUP_SELECT_CLASS } from '../../shared/supervisor-ui';
import {
  DesignationRow,
  EmergencyContactCreateRequest,
  EmergencyContactRow,
} from './notification.models';
import { SupervisorNotificationService } from './notification.service';

type ViewMode = 'table' | 'create' | 'edit';

/** Legacy contact-number pattern: digits, no leading zero. */
const NUMBER_PATTERN = /^[1-9][0-9]*$/;

/**
 * Emergency contacts admin (legacy `SupervisorEmergencyContactsComponent`):
 * list the service's emergency contacts, buffer new contacts locally (with
 * duplicate-number checks) before creating them in one call, edit a contact,
 * and activate / deactivate via the `deleted` flag.
 *
 * Standalone, OnPush + signals, Reactive Forms, ZardUI + Tailwind only.
 */
@Component({
  selector: 'app-emergency-contacts-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucidePencil, lucidePlus, lucideX })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <h1 class="mb-4 text-base font-semibold text-foreground">
        @switch (mode()) {
          @case ('table') {
            {{ 'supEmerg.listTitle' | translate: lang() }}
          }
          @case ('create') {
            {{ 'supEmerg.createTitle' | translate: lang() }}
          }
          @case ('edit') {
            {{ 'supEmerg.editTitle' | translate: lang() }}
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
            {{ 'supEmerg.loading' | translate: lang() }}
          </p>
        } @else {
          <div class="overflow-x-auto rounded-md border border-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supEmerg.sno' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supEmerg.contactName' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supEmerg.designation' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supEmerg.location' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supEmerg.contactNumber' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supEmerg.action' | translate: lang() }}
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (item of contacts(); track item.emergContactID) {
                  <tr class="border-t border-border align-top">
                    <td class="px-3 py-2">{{ $index + 1 }}</td>
                    <td class="px-3 py-2">{{ item.emergContactName || '—' }}</td>
                    <td class="px-3 py-2">{{ item.designation?.designationName || '—' }}</td>
                    <td class="px-3 py-2">{{ item.location || '—' }}</td>
                    <td class="px-3 py-2">{{ item.emergContactNo || '—' }}</td>
                    <td class="px-3 py-2">
                      <div class="flex items-center gap-2">
                        @if (!item.deleted) {
                          <button
                            z-button
                            type="button"
                            zType="ghost"
                            zSize="sm"
                            [attr.aria-label]="'supEmerg.edit' | translate: lang()"
                            (click)="openEdit(item)"
                          >
                            <ng-icon name="lucidePencil" size="16" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            class="text-primary underline-offset-2 hover:underline"
                            (click)="setDeleted(item, true)"
                          >
                            {{ 'supEmerg.deactivate' | translate: lang() }}
                          </button>
                        } @else {
                          <button
                            type="button"
                            class="text-primary underline-offset-2 hover:underline"
                            (click)="setDeleted(item, false)"
                          >
                            {{ 'supEmerg.activate' | translate: lang() }}
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="px-3 py-8 text-center text-muted-foreground">
                      {{ 'supEmerg.noRecords' | translate: lang() }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="mt-4 flex justify-end">
            <button z-button type="button" zType="default" (click)="openCreate()">
              {{ 'supEmerg.createTitle' | translate: lang() }}
            </button>
          </div>
        }
      }

      <!-- Create (buffered) -->
      @if (mode() === 'create') {
        <form
          [formGroup]="contactForm"
          autocomplete="off"
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label for="ec-name" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supEmerg.name' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="ec-name" z-input class="w-full" maxlength="15" formControlName="name" />
            @if (contactForm.controls.name.invalid && contactForm.controls.name.touched) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supEmerg.minThreeChars' | translate: lang() }}
              </p>
            }
          </div>
          <div>
            <label
              for="ec-designation"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'supEmerg.designation' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <select id="ec-designation" [class]="selectClass" formControlName="designationID">
              <option [ngValue]="null" disabled>
                {{ 'supEmerg.select' | translate: lang() }}
              </option>
              @for (d of designations(); track d.designationID) {
                <option [ngValue]="d.designationID">{{ d.designationName }}</option>
              }
            </select>
          </div>
          <div>
            <label for="ec-location" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supEmerg.location' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="ec-location"
              z-input
              class="w-full"
              maxlength="90"
              formControlName="location"
            />
            @if (contactForm.controls.location.invalid && contactForm.controls.location.touched) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supEmerg.minThreeChars' | translate: lang() }}
              </p>
            }
          </div>
          <div>
            <label for="ec-number" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supEmerg.mobileNumber' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="ec-number"
              z-input
              class="w-full"
              inputmode="numeric"
              maxlength="10"
              formControlName="contactNumber"
            />
            @if (
              contactForm.controls.contactNumber.invalid &&
              contactForm.controls.contactNumber.touched
            ) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supEmerg.tenDigits' | translate: lang() }}
              </p>
            }
          </div>
          <div class="sm:col-span-2 lg:col-span-4 flex justify-between">
            <button z-button type="button" zType="outline" (click)="backToTable()">
              {{ 'supEmerg.back' | translate: lang() }}
            </button>
            <button
              z-button
              type="button"
              zType="default"
              [zDisabled]="contactForm.invalid"
              (click)="addToBuffer()"
            >
              <ng-icon name="lucidePlus" size="16" aria-hidden="true" />
              {{ 'supEmerg.add' | translate: lang() }}
            </button>
          </div>
        </form>

        @if (buffer().length > 0) {
          <div class="mt-6 overflow-x-auto rounded-md border border-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supEmerg.sno' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supEmerg.contactName' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supEmerg.designation' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supEmerg.location' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supEmerg.contactNumber' | translate: lang() }}
                  </th>
                  <th scope="col" class="px-3 py-2 font-medium">
                    {{ 'supEmerg.action' | translate: lang() }}
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (item of buffer(); track $index) {
                  <tr class="border-t border-border align-top">
                    <td class="px-3 py-2">{{ $index + 1 }}</td>
                    <td class="px-3 py-2">{{ item.emergContactName }}</td>
                    <td class="px-3 py-2">{{ item.designationName }}</td>
                    <td class="px-3 py-2">{{ item.location }}</td>
                    <td class="px-3 py-2">{{ item.emergContactNo }}</td>
                    <td class="px-3 py-2">
                      <button
                        z-button
                        type="button"
                        zType="ghost"
                        zSize="sm"
                        [attr.aria-label]="'supEmerg.remove' | translate: lang()"
                        (click)="removeFromBuffer($index)"
                      >
                        <ng-icon name="lucideX" size="16" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="mt-4 flex justify-end">
            <button
              z-button
              type="button"
              zType="default"
              [zLoading]="saving()"
              [zDisabled]="saving()"
              (click)="createContacts()"
            >
              {{ 'supEmerg.createTitle' | translate: lang() }}
            </button>
          </div>
        }
      }

      <!-- Edit -->
      @if (mode() === 'edit') {
        <form
          [formGroup]="contactForm"
          autocomplete="off"
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label for="ec-e-name" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supEmerg.name' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input id="ec-e-name" z-input class="w-full" maxlength="15" formControlName="name" />
            @if (contactForm.controls.name.invalid && contactForm.controls.name.touched) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supEmerg.minThreeChars' | translate: lang() }}
              </p>
            }
          </div>
          <div>
            <label
              for="ec-e-designation"
              class="mb-1 block text-xs font-medium text-muted-foreground"
            >
              {{ 'supEmerg.designation' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <select id="ec-e-designation" [class]="selectClass" formControlName="designationID">
              <option [ngValue]="null" disabled>
                {{ 'supEmerg.select' | translate: lang() }}
              </option>
              @for (d of designations(); track d.designationID) {
                <option [ngValue]="d.designationID">{{ d.designationName }}</option>
              }
            </select>
          </div>
          <div>
            <label for="ec-e-location" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supEmerg.location' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="ec-e-location"
              z-input
              class="w-full"
              maxlength="90"
              formControlName="location"
            />
          </div>
          <div>
            <label for="ec-e-number" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'supEmerg.mobileNumber' | translate: lang() }}
              <span class="text-destructive">*</span>
            </label>
            <input
              id="ec-e-number"
              z-input
              class="w-full"
              inputmode="numeric"
              maxlength="10"
              formControlName="contactNumber"
            />
            @if (
              contactForm.controls.contactNumber.invalid &&
              contactForm.controls.contactNumber.touched
            ) {
              <p class="mt-1 text-xs font-medium text-destructive">
                {{ 'supEmerg.tenDigits' | translate: lang() }}
              </p>
            }
          </div>
          <div class="sm:col-span-2 lg:col-span-4 flex justify-between">
            <button z-button type="button" zType="outline" (click)="backToTable()">
              {{ 'supEmerg.back' | translate: lang() }}
            </button>
            <button
              z-button
              type="button"
              zType="default"
              [zLoading]="saving()"
              [zDisabled]="contactForm.invalid || saving()"
              (click)="update()"
            >
              {{ 'supEmerg.update' | translate: lang() }}
            </button>
          </div>
        </form>
      }
    </section>
  `,
})
export class EmergencyContactsAdminComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SupervisorNotificationService);
  private readonly authStore = inject(AuthStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lang = this.i18n.language;
  readonly selectClass = SUP_SELECT_CLASS;

  readonly mode = signal<ViewMode>('table');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly contacts = signal<EmergencyContactRow[]>([]);
  readonly designations = signal<DesignationRow[]>([]);
  readonly buffer = signal<EmergencyContactCreateRequest[]>([]);

  /** The `Emergency Contact` notification type id, resolved on init. */
  private notificationTypeID: number | null = null;
  private editingRow: EmergencyContactRow | null = null;
  private editingOriginalNumber: string | null = null;

  readonly contactForm = this.fb.group({
    name: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(15)],
    }),
    designationID: this.fb.control<number | null>(null, [Validators.required]),
    location: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(90)],
    }),
    contactNumber: this.fb.control('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(10),
        Validators.pattern(NUMBER_PATTERN),
      ],
    }),
  });

  ngOnInit(): void {
    const psmID = this.psmID();
    this.service
      .getDesignations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (designations) => this.designations.set(designations),
        error: (err: SupervisorError) => this.errorMessage.set(err.errorMessage),
      });
    this.loading.set(true);
    this.service
      .getNotificationTypes(psmID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => {
          const match = types.find((t) => t.notificationType === 'Emergency Contact');
          if (!match) {
            this.loading.set(false);
            this.errorMessage.set(this.i18n.instant('supComm.noNotificationTypes'));
            return;
          }
          this.notificationTypeID = match.notificationTypeID;
          this.loadContacts();
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

  private loadContacts(): void {
    this.loading.set(true);
    this.service
      .getEmergencyContacts(this.psmID(), this.notificationTypeID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.loading.set(false);
          this.contacts.set(rows);
        },
        error: (err: SupervisorError) => {
          this.loading.set(false);
          this.contacts.set([]);
          this.errorMessage.set(err.errorMessage);
        },
      });
  }

  openCreate(): void {
    this.contactForm.reset();
    this.buffer.set([]);
    this.errorMessage.set('');
    this.mode.set('create');
  }

  openEdit(row: EmergencyContactRow): void {
    this.editingRow = row;
    this.editingOriginalNumber = row.emergContactNo ?? null;
    this.errorMessage.set('');
    this.contactForm.reset({
      name: row.emergContactName ?? '',
      designationID: row.designation?.designationID ?? null,
      location: row.location?.trim() ?? '',
      contactNumber: row.emergContactNo ?? '',
    });
    this.mode.set('edit');
  }

  backToTable(): void {
    this.contactForm.reset();
    this.buffer.set([]);
    this.errorMessage.set('');
    this.mode.set('table');
  }

  /** Buffer a contact locally, rejecting duplicates (legacy `push2buffer`). */
  addToBuffer(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }
    const { name, designationID, location, contactNumber } = this.contactForm.getRawValue();
    const duplicate =
      this.buffer().some((b) => b.emergContactNo === contactNumber) ||
      this.contacts().some((c) => c.emergContactNo === contactNumber);
    if (duplicate) {
      toast.info(this.i18n.instant('supEmerg.duplicateNumber'));
      this.contactForm.reset();
      return;
    }
    const designation = this.designations().find((d) => d.designationID === designationID);
    this.buffer.set([
      ...this.buffer(),
      {
        providerServiceMapID: this.psmID(),
        notificationTypeID: this.notificationTypeID,
        createdBy: this.authStore.user()?.userName ?? null,
        designationID,
        emergContactName: name.trim() || null,
        location: location.trim() || null,
        emergContactNo: contactNumber,
        designationName: designation?.designationName ?? null,
      },
    ]);
    this.contactForm.reset();
  }

  removeFromBuffer(index: number): void {
    this.buffer.set(this.buffer().filter((_, i) => i !== index));
  }

  createContacts(): void {
    const body = this.buffer();
    if (body.length === 0) {
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .createEmergencyContacts(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          toast.success(this.i18n.instant('supEmerg.created'));
          this.buffer.set([]);
          this.backToTable();
          this.loadContacts();
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set(this.i18n.instant('supEmerg.createFailed'));
        },
      });
  }

  update(): void {
    const row = this.editingRow;
    if (!row || this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }
    const { name, designationID, location, contactNumber } = this.contactForm.getRawValue();
    // Legacy duplicate check: a CHANGED number must not collide with the list.
    if (
      contactNumber !== this.editingOriginalNumber &&
      this.contacts().some((c) => c.emergContactNo === contactNumber)
    ) {
      toast.info(this.i18n.instant('supEmerg.duplicateNumber'));
      return;
    }
    // The legacy screen mutated the row and POSTed it whole.
    const body: EmergencyContactRow = {
      ...row,
      emergContactName: name.trim() || undefined,
      designationID: designationID ?? undefined,
      emergContactNo: contactNumber,
      location: location.trim() || undefined,
    };
    this.saving.set(true);
    this.errorMessage.set('');
    this.service
      .updateEmergencyContact(body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          toast.success(this.i18n.instant('supEmerg.edited'));
          this.backToTable();
          this.loadContacts();
        },
        error: () => {
          this.saving.set(false);
          this.errorMessage.set(this.i18n.instant('supEmerg.editFailed'));
        },
      });
  }

  /** Activate / deactivate by flipping `deleted` on the whole row (legacy). */
  setDeleted(row: EmergencyContactRow, deleted: boolean): void {
    this.errorMessage.set('');
    this.service
      .updateEmergencyContact({ ...row, deleted })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          toast.success(this.i18n.instant(deleted ? 'supEmerg.deactivated' : 'supEmerg.activated'));
          this.loadContacts();
        },
        error: () => {
          this.errorMessage.set(
            this.i18n.instant(deleted ? 'supEmerg.deactivateFailed' : 'supEmerg.activateFailed'),
          );
        },
      });
  }
}
