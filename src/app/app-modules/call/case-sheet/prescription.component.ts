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
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucidePlus, lucidePill, lucideTrash2 } from '@ng-icons/lucide';
import { toast } from 'ngx-sonner';

import { ZardButtonComponent } from '@common-ui/ui/button';
import { ZardInputDirective } from '@common-ui/ui/input';

import { AuthStore } from '../../core/auth/auth.store';
import { CallStore } from '../call.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PrescriptionService } from './prescription.service';
import {
  Drug,
  PrescribedLine,
  PrescriptionError,
  PrescriptionRecord,
  STRENGTH_NA,
  SavePrescriptionRequest,
} from './prescription.models';

/** Shared Tailwind classes for native `<select>` controls (no custom CSS). */
const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

const DIAGNOSIS_MAX = 300;

/** Optional-field validator: if present, the trimmed value must be >= `min`. */
function optionalMinLength(min: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '') as string;
    const len = value.trim().length;
    return len > 0 && len < min
      ? { minlength: { requiredLength: min, actualLength: len } }
      : null;
  };
}

/**
 * Prescription step of the HAO/MO case sheet, shown after the case-sheet /
 * CDSS step. The agent records a provisional diagnosis, adds one or more drug
 * lines (drug → group → strength → route → frequency → days → remarks) into a
 * working list, then saves; the created prescription id is emitted to the
 * parent via {@link saved}. Prior prescriptions for the beneficiary are shown
 * on demand.
 *
 * Rebuilt from the legacy `prescriptionComponent` dialog as an inline,
 * standalone panel: OnPush + signals + Reactive Forms, ZardUI + Tailwind
 * utilities (no custom CSS, no jQuery, no Bootstrap). Call/agent context
 * (beneficiary, call id, service, user) is read from the AuthStore/CallStore
 * the same way as beneficiary registration.
 */
@Component({
  selector: 'app-prescription',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgIcon, TranslatePipe, ZardButtonComponent, ZardInputDirective],
  viewProviders: [provideIcons({ lucidePill, lucidePlus, lucidePencil, lucideTrash2 })],
  template: `
    <section class="rounded-lg border border-border bg-card p-5 sm:p-6">
      <header class="mb-4 flex items-center gap-2">
        <ng-icon name="lucidePill" size="18" class="text-primary" aria-hidden="true" />
        <h3 class="text-sm font-semibold text-foreground">
          {{ 'prescription.title' | translate: lang() }}
        </h3>
      </header>

      <!-- Patient header (read-only context) -->
      <dl class="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
        <div>
          <dt class="text-xs text-muted-foreground">
            {{ 'prescription.patient' | translate: lang() }}
          </dt>
          <dd class="font-medium text-foreground">{{ patientName() || '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">
            {{ 'prescription.age' | translate: lang() }}
          </dt>
          <dd class="font-medium text-foreground">{{ age() ?? '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-muted-foreground">
            {{ 'prescription.gender' | translate: lang() }}
          </dt>
          <dd class="font-medium text-foreground">{{ gender() || '—' }}</dd>
        </div>
      </dl>

      @if (!hasContext()) {
        <p class="mb-4 rounded-md border border-dashed border-border py-3 text-center text-sm text-muted-foreground">
          {{ 'prescription.noContext' | translate: lang() }}
        </p>
      }

      @if (errorMessage()) {
        <p class="mb-3 text-sm font-medium text-destructive" role="alert">{{ errorMessage() }}</p>
      }

      <!-- Provisional diagnosis (whole prescription) -->
      <div class="mb-4">
        <label for="rx-diagnosis" class="mb-1 block text-sm font-medium text-foreground">
          {{
            (provisionalDiagnosis()
              ? 'prescription.diagnosisProvisional'
              : 'prescription.diagnosisInformation'
            ) | translate: lang()
          }}
          <span class="text-destructive">*</span>
        </label>
        <textarea
          id="rx-diagnosis"
          z-input
          rows="2"
          class="w-full"
          [maxlength]="diagnosisMax"
          [formControl]="diagnosis"
          [attr.aria-invalid]="diagnosis.invalid && diagnosis.touched"
        ></textarea>
        <div class="mt-0.5 flex justify-between text-xs text-muted-foreground">
          @if (diagnosis.invalid && diagnosis.touched) {
            <span class="text-destructive">{{ 'prescription.diagnosisRequired' | translate: lang() }}</span>
          } @else {
            <span></span>
          }
          <span>{{ diagnosis.value.length }}/{{ diagnosisMax }}</span>
        </div>
      </div>

      <!-- Add-a-drug line -->
      <form [formGroup]="lineForm" (ngSubmit)="addLine()" autocomplete="off">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label for="rx-drug" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'prescription.drug' | translate: lang() }} *
            </label>
            <select
              id="rx-drug"
              formControlName="drugName"
              [class]="selectClass"
              [attr.aria-invalid]="ctrlInvalid('drugName')"
              (change)="onDrugNameChange()"
            >
              <option [ngValue]="null" disabled>
                {{ 'prescription.selectDrug' | translate: lang() }}
              </option>
              @for (name of drugNames(); track name) {
                <option [ngValue]="name">{{ name }}</option>
              }
            </select>
          </div>

          <div>
            <label for="rx-group" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'prescription.drugGroup' | translate: lang() }} *
            </label>
            <select
              id="rx-group"
              formControlName="drugMapID"
              [class]="selectClass"
              [attr.aria-invalid]="ctrlInvalid('drugMapID')"
            >
              <option [ngValue]="null" disabled>
                {{ 'prescription.selectGroup' | translate: lang() }}
              </option>
              @for (g of groupOptions(); track g.drugMapID) {
                <option [ngValue]="g.drugMapID">{{ g.drugGroupName || g.drugName }}</option>
              }
            </select>
          </div>

          <div>
            <label for="rx-strength" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'prescription.strength' | translate: lang() }} *
            </label>
            <select
              id="rx-strength"
              formControlName="strength"
              [class]="selectClass"
              [attr.aria-invalid]="ctrlInvalid('strength')"
            >
              <option [ngValue]="null" disabled>
                {{ 'prescription.selectStrength' | translate: lang() }}
              </option>
              @for (s of strengths(); track s) {
                <option [ngValue]="s">{{ s }}</option>
              }
            </select>
          </div>

          <div>
            <label for="rx-route" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'prescription.route' | translate: lang() }}
            </label>
            <input id="rx-route" z-input class="w-full" formControlName="route" maxlength="30" />
          </div>

          <div>
            <label for="rx-frequency" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'prescription.frequency' | translate: lang() }} *
            </label>
            <select
              id="rx-frequency"
              formControlName="frequency"
              [class]="selectClass"
              [attr.aria-invalid]="ctrlInvalid('frequency')"
            >
              <option [ngValue]="null" disabled>
                {{ 'prescription.selectFrequency' | translate: lang() }}
              </option>
              @for (f of frequencies(); track f) {
                <option [ngValue]="f">{{ f }}</option>
              }
            </select>
          </div>

          <div>
            <label for="rx-days" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'prescription.noOfDays' | translate: lang() }} *
            </label>
            <input
              id="rx-days"
              z-input
              class="w-full"
              formControlName="noOfDays"
              inputmode="numeric"
              maxlength="2"
              [attr.aria-invalid]="ctrlInvalid('noOfDays')"
            />
            @if (lineForm.controls.noOfDays.invalid && lineForm.controls.noOfDays.touched) {
              <p class="mt-0.5 text-xs text-destructive">
                {{ 'prescription.noOfDaysError' | translate: lang() }}
              </p>
            }
          </div>

          <div class="lg:col-span-2">
            <label for="rx-remarks" class="mb-1 block text-xs font-medium text-muted-foreground">
              {{ 'prescription.remarks' | translate: lang() }}
            </label>
            <input id="rx-remarks" z-input class="w-full" formControlName="remarks" maxlength="150" />
            @if (lineForm.controls.remarks.invalid && lineForm.controls.remarks.touched) {
              <p class="mt-0.5 text-xs text-destructive">
                {{ 'prescription.remarksError' | translate: lang() }}
              </p>
            }
          </div>

          <div class="flex items-end">
            <button z-button type="submit" zType="outline" [zDisabled]="lineForm.invalid || !hasContext()">
              <ng-icon name="lucidePlus" size="16" aria-hidden="true" />
              {{ 'prescription.addDrug' | translate: lang() }}
            </button>
          </div>
        </div>
      </form>

      <!-- Current prescription list -->
      <div class="mt-5">
        <h4 class="mb-2 text-sm font-medium text-foreground">
          {{ 'prescription.current' | translate: lang() }}
        </h4>
        @if (lines().length === 0) {
          <p class="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            {{ 'prescription.empty' | translate: lang() }}
          </p>
        } @else {
          <div class="overflow-x-auto rounded-md border border-border">
            <table class="w-full text-left text-sm">
              <thead class="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th class="px-3 py-2 font-medium">{{ 'prescription.drug' | translate: lang() }}</th>
                  <th class="px-3 py-2 font-medium">{{ 'prescription.strength' | translate: lang() }}</th>
                  <th class="px-3 py-2 font-medium">{{ 'prescription.frequency' | translate: lang() }}</th>
                  <th class="px-3 py-2 font-medium">{{ 'prescription.noOfDays' | translate: lang() }}</th>
                  <th class="px-3 py-2 font-medium">{{ 'prescription.remarks' | translate: lang() }}</th>
                  <th class="px-3 py-2 text-right font-medium">{{ 'prescription.action' | translate: lang() }}</th>
                </tr>
              </thead>
              <tbody>
                @for (line of lines(); track $index; let i = $index) {
                  <tr class="border-t border-border">
                    <td class="px-3 py-2">
                      <span class="font-medium text-foreground">{{ line.drugName }}</span>
                      @if (line.drugGroupName) {
                        <span class="block text-xs text-muted-foreground">{{ line.drugGroupName }}</span>
                      }
                    </td>
                    <td class="px-3 py-2">{{ line.strength === strengthNA ? '—' : line.strength }}</td>
                    <td class="px-3 py-2">{{ line.frequency }}</td>
                    <td class="px-3 py-2">{{ line.noOfDays }}</td>
                    <td class="px-3 py-2">{{ line.remarks || '—' }}</td>
                    <td class="px-3 py-2">
                      <div class="flex justify-end gap-1">
                        <button
                          type="button"
                          class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          [attr.aria-label]="'prescription.edit' | translate: lang()"
                          (click)="editLine(i)"
                        >
                          <ng-icon name="lucidePencil" size="15" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          class="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          [attr.aria-label]="'prescription.remove' | translate: lang()"
                          (click)="removeLine(i)"
                        >
                          <ng-icon name="lucideTrash2" size="15" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <button z-button type="button" zType="default" [zLoading]="saving()" [zDisabled]="!canSave()" (click)="save()">
              {{ 'prescription.save' | translate: lang() }}
            </button>
          </div>
        }
      </div>

      <!-- History -->
      <div class="mt-5 border-t border-border pt-4">
        <button z-button type="button" zType="ghost" (click)="toggleHistory()">
          {{ (showHistory() ? 'prescription.hideHistory' : 'prescription.showHistory') | translate: lang() }}
        </button>
        @if (showHistory()) {
          <div class="mt-3">
            @if (history().length === 0) {
              <p class="text-sm text-muted-foreground">{{ 'prescription.noHistory' | translate: lang() }}</p>
            } @else {
              <div class="overflow-x-auto rounded-md border border-border">
                <table class="w-full text-left text-sm">
                  <thead class="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th class="px-3 py-2 font-medium">{{ 'prescription.prescriptionId' | translate: lang() }}</th>
                      <th class="px-3 py-2 font-medium">{{ 'prescription.diagnosisProvisional' | translate: lang() }}</th>
                      <th class="px-3 py-2 font-medium">{{ 'prescription.drug' | translate: lang() }}</th>
                      <th class="px-3 py-2 font-medium">{{ 'prescription.createdDate' | translate: lang() }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (rec of history(); track $index) {
                      <tr class="border-t border-border align-top">
                        <td class="px-3 py-2">{{ rec.prescriptionID ?? '—' }}</td>
                        <td class="px-3 py-2">{{ rec.diagnosisProvided || '—' }}</td>
                        <td class="px-3 py-2">
                          @for (d of rec.prescribedDrugs ?? []; track $index) {
                            <span class="block">{{ d.drugName }}</span>
                          }
                        </td>
                        <td class="px-3 py-2">{{ rec.createdDate || '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class PrescriptionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly rx = inject(PrescriptionService);
  private readonly authStore = inject(AuthStore);
  private readonly callStore = inject(CallStore);
  private readonly i18n = inject(I18nService);
  private readonly destroyRef = inject(DestroyRef);

  /** Patient display context (from the case sheet). */
  readonly patientName = input('');
  readonly age = input<number | null>(null);
  readonly gender = input('');
  /** Initial provisional diagnosis (e.g. from CDSS), agent-editable. */
  readonly initialDiagnosis = input('');
  /** Label toggle: provisional diagnosis (true) vs "information given" (false). */
  readonly provisionalDiagnosis = input(true);

  /** Emits the created prescription id after a successful save. */
  readonly saved = output<number>();

  readonly lang = this.i18n.language;
  readonly selectClass = SELECT_CLASS;
  readonly diagnosisMax = DIAGNOSIS_MAX;
  readonly strengthNA = STRENGTH_NA;

  readonly diagnosis = this.fb.control('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(DIAGNOSIS_MAX)],
  });

  readonly lineForm = this.fb.group({
    drugName: this.fb.control<string | null>(null, Validators.required),
    drugMapID: this.fb.control<number | null>(null, Validators.required),
    strength: this.fb.control<string | null>(null, Validators.required),
    route: this.fb.control('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
    frequency: this.fb.control<string | null>(null, Validators.required),
    noOfDays: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[1-9][0-9]?$/)],
    }),
    remarks: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.maxLength(150), optionalMinLength(2)],
    }),
  });

  readonly drugs = signal<Drug[]>([]);
  readonly strengths = signal<string[]>([]);
  readonly frequencies = signal<string[]>([]);
  readonly lines = signal<PrescribedLine[]>([]);
  readonly history = signal<PrescriptionRecord[]>([]);
  readonly showHistory = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  /** Drug name currently selected in the line form (drives the group list). */
  private readonly selectedDrugName = signal<string | null>(null);

  readonly drugNames = computed(() => {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const d of this.drugs()) {
      if (!seen.has(d.drugName)) {
        seen.add(d.drugName);
        names.push(d.drugName);
      }
    }
    return names;
  });

  readonly groupOptions = computed(() =>
    this.drugs().filter((d) => d.drugName === this.selectedDrugName()),
  );

  readonly hasContext = computed(() => this.callStore.beneficiaryId() !== null);

  ngOnInit(): void {
    this.diagnosis.setValue(this.initialDiagnosis());
    if (!this.hasContext()) {
      return;
    }
    this.loadMasters();
    this.loadHistory();
  }

  /** `true`/`null` for a line control's `aria-invalid` (only once touched). */
  ctrlInvalid(name: keyof typeof this.lineForm.controls): true | null {
    const c = this.lineForm.controls[name];
    return c.invalid && c.touched ? true : null;
  }

  /** Whether the prescription can be saved. */
  canSave(): boolean {
    return (
      this.hasContext() &&
      !this.saving() &&
      this.diagnosis.valid &&
      this.lines().length > 0
    );
  }

  onDrugNameChange(): void {
    const name = this.lineForm.controls.drugName.value;
    this.selectedDrugName.set(name);
    const groups = this.drugs().filter((d) => d.drugName === name);
    // Auto-select when a drug maps to exactly one group; else clear the choice.
    this.lineForm.controls.drugMapID.setValue(groups.length === 1 ? groups[0].drugMapID : null);
  }

  addLine(): void {
    if (this.lineForm.invalid) {
      this.lineForm.markAllAsTouched();
      return;
    }
    const v = this.lineForm.getRawValue();
    const drug = this.drugs().find((d) => d.drugMapID === v.drugMapID);
    if (!drug) {
      return;
    }
    const line: PrescribedLine = {
      drugMapID: drug.drugMapID,
      drugName: drug.drugName,
      drugGroupName: drug.drugGroupName,
      strength: v.strength ?? '',
      route: v.route.trim(),
      frequency: v.frequency ?? '',
      noOfDays: v.noOfDays.trim(),
      remarks: v.remarks.trim(),
    };
    this.lines.update((list) => [...list, line]);
    // Surface the diagnosis requirement now that the agent is building a
    // prescription (Save stays disabled until it is filled).
    this.diagnosis.markAsTouched();
    this.resetLineForm();
  }

  /** Move a line back into the form for editing (removed from the list). */
  editLine(index: number): void {
    const line = this.lines()[index];
    if (!line) {
      return;
    }
    this.selectedDrugName.set(line.drugName);
    this.lineForm.reset({
      drugName: line.drugName,
      drugMapID: line.drugMapID,
      strength: line.strength,
      route: line.route,
      frequency: line.frequency,
      noOfDays: line.noOfDays,
      remarks: line.remarks,
    });
    this.removeLine(index);
  }

  removeLine(index: number): void {
    this.lines.update((list) => list.filter((_, i) => i !== index));
  }

  toggleHistory(): void {
    this.showHistory.update((v) => !v);
  }

  save(): void {
    if (!this.canSave()) {
      return;
    }
    const role = this.authStore.currentRole();
    const user = this.authStore.user();
    const createdBy = user?.userName ?? '';
    const payload: SavePrescriptionRequest = {
      userID: user?.userID ?? null,
      beneficiaryRegID: this.callStore.beneficiaryId(),
      benCallID: this.callStore.callId(),
      createdBy,
      providerServiceMapID: role?.providerServiceMapID ?? null,
      diagnosisProvided: this.diagnosis.value.trim(),
      // Legacy stores the first line's remarks as the prescription-level remark.
      remarks: this.lines()[0]?.remarks.trim() || null,
      prescribedDrugs: this.lines().map((l) => ({
        drugMapID: l.drugMapID,
        dosage: l.strength === STRENGTH_NA ? '' : l.strength,
        drugRoute: l.route,
        noOfDays: l.noOfDays,
        frequency: l.frequency,
        timeToConsume: null,
        sideEffects: null,
        deleted: false,
        createdBy,
      })),
    };

    this.saving.set(true);
    this.errorMessage.set('');
    this.rx
      .savePrescription(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.saving.set(false);
          const id = res.prescriptionID;
          toast.success(
            id != null
              ? this.i18n.instant('prescription.savedPrefix') + id
              : this.i18n.instant('prescription.saved'),
          );
          if (id != null) {
            this.saved.emit(id);
          }
          this.lines.set([]);
          this.diagnosis.reset('');
          this.resetLineForm();
          this.loadHistory();
        },
        error: (err: PrescriptionError) => {
          this.saving.set(false);
          const msg = err.errorMessage || this.i18n.instant('prescription.saveError');
          this.errorMessage.set(msg);
          toast.error(msg);
        },
      });
  }

  private resetLineForm(): void {
    this.lineForm.reset({
      drugName: null,
      drugMapID: null,
      strength: null,
      route: '',
      frequency: null,
      noOfDays: '',
      remarks: '',
    });
    this.selectedDrugName.set(null);
  }

  private loadMasters(): void {
    const role = this.authStore.currentRole();
    this.rx
      .getDrugList(role?.providerServiceMapID ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (drugs) => {
          this.drugs.set(drugs);
        },
        error: (err: PrescriptionError) => {
          this.errorMessage.set(err.errorMessage || this.i18n.instant('prescription.loadError'));
        },
      });

    this.rx
      .getStrengths(role?.serviceProviderID ?? null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        // Append the legacy "Not Applicable" option (saved as an empty dosage).
        next: (list) => this.strengths.set([...list, STRENGTH_NA]),
        error: () => this.strengths.set([STRENGTH_NA]),
      });

    this.rx
      .getFrequencies()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.frequencies.set(list),
        error: () => this.frequencies.set([]),
      });
  }

  private loadHistory(): void {
    this.rx
      .getPrescriptionList(this.callStore.beneficiaryId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.history.set(list),
        error: () => this.history.set([]),
      });
  }
}
