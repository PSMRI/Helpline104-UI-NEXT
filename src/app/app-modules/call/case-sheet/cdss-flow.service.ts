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

import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ZardDialogService } from '@common-ui/ui/dialog';

import { I18nService } from '../../core/i18n/i18n.service';
import { CdssDiseasesDialogComponent, CdssDiseasesDialogData } from './cdss-diseases-dialog.component';
import {
  CdssSymptomResultsDialogComponent,
  CdssSymptomResultsDialogData,
} from './cdss-symptom-results-dialog.component';
import { CdssSymptomsDialogComponent, CdssSymptomsDialogData } from './cdss-symptoms-dialog.component';
import {
  CdssDiagnosis,
  CdssDiseasesResult,
  CdssPatientContext,
  CdssSelection,
  CdssSymptomResultsResult,
  CdssSymptomsResult,
} from './cdss.models';

/**
 * Runs legacy's CDSS popup chain, the one `invokeDialog()` starts the moment
 * the agent picks a chief complaint: Symptoms → Symptom Results → Diseases,
 * with Back stepping to the previous popup and its state preserved.
 *
 * Resolves to the accepted {@link CdssSelection} when the agent saves at least
 * one disease, or `undefined` when they dismiss any step (or the backend has
 * nothing to offer for the complaint).
 */
@Injectable({ providedIn: 'root' })
export class CdssFlowService {
  private readonly dialog = inject(ZardDialogService);
  private readonly i18n = inject(I18nService);

  async run(patient: CdssPatientContext, questionnaireId: number, questions: readonly { question: string; isEmergency: boolean }[], loadDiagnoses: (selected: number) => Promise<CdssDiagnosis[]>): Promise<CdssSelection | undefined> {
    if (questions.length === 0) {
      return undefined;
    }

    // Outer loop: Symptoms. Re-entered when Symptom Results reports Back.
    for (;;) {
      const picked = await this.openSymptoms([...questions]);
      if (!picked) {
        return undefined;
      }

      const diagnoses = await loadDiagnoses(picked.questionIndex);
      if (diagnoses.length === 0) {
        return undefined;
      }

      let markedSymptoms: number[][] = diagnoses.map(() => []);
      let savedIndexes: number[] = [];
      let backToSymptoms = false;

      // Inner loop: Symptom Results ⇄ Diseases.
      while (!backToSymptoms) {
        const results = await this.openSymptomResults(diagnoses, markedSymptoms);
        if (!results) {
          return undefined;
        }
        if (results.action === 'back') {
          backToSymptoms = true;
          break;
        }
        markedSymptoms = results.markedSymptoms;

        const diseases = await this.openDiseases(diagnoses, markedSymptoms, savedIndexes);
        if (!diseases) {
          return undefined;
        }
        if (diseases.action === 'back') {
          continue;
        }
        savedIndexes = diseases.savedIndexes;
        return this.toSelection(diagnoses, markedSymptoms, savedIndexes);
      }
    }
  }

  private openSymptoms(questions: CdssSymptomsDialogData['questions']): Promise<CdssSymptomsResult> {
    const ref = this.dialog.create<CdssSymptomsDialogComponent, CdssSymptomsDialogData>({
      zTitle: this.i18n.instant('cdss.symptomsTitle'),
      zContent: CdssSymptomsDialogComponent,
      zData: { questions },
      zHideFooter: true,
      zMaskClosable: false,
      zWidth: '52rem',
    });
    return firstValueFrom(ref.afterClosed()) as Promise<CdssSymptomsResult>;
  }

  private openSymptomResults(diagnoses: CdssDiagnosis[], markedSymptoms: number[][]): Promise<CdssSymptomResultsResult> {
    const ref = this.dialog.create<CdssSymptomResultsDialogComponent, CdssSymptomResultsDialogData>({
      zTitle: this.i18n.instant('cdss.symptomResultsTitle'),
      zContent: CdssSymptomResultsDialogComponent,
      zData: { diagnoses, markedSymptoms },
      zHideFooter: true,
      zMaskClosable: false,
      zWidth: '52rem',
    });
    return firstValueFrom(ref.afterClosed()) as Promise<CdssSymptomResultsResult>;
  }

  private openDiseases(
    diagnoses: CdssDiagnosis[],
    markedSymptoms: number[][],
    savedIndexes: number[],
  ): Promise<CdssDiseasesResult> {
    const ref = this.dialog.create<CdssDiseasesDialogComponent, CdssDiseasesDialogData>({
      zTitle: this.i18n.instant('cdss.diseasesTitle'),
      zContent: CdssDiseasesDialogComponent,
      zData: { diagnoses, markedSymptoms, savedIndexes },
      zHideFooter: true,
      zMaskClosable: false,
      zWidth: '68rem',
    });
    return firstValueFrom(ref.afterClosed()) as Promise<CdssDiseasesResult>;
  }

  /**
   * Same shape the retired inline panel emitted, so the case sheet's
   * `onCdssSelection` keeps working unchanged: the ticked diseases with the
   * symptoms marked present, and their de-duplicated actions as the
   * recommended action.
   */
  private toSelection(diagnoses: CdssDiagnosis[], markedSymptoms: number[][], savedIndexes: number[]): CdssSelection {
    const saved = savedIndexes.map((index) => ({ diagnosis: diagnoses[index], marked: markedSymptoms[index] ?? [] }));
    return {
      diagnoses: saved.map(({ diagnosis, marked }) => ({
        disease: diagnosis.disease,
        symptoms: marked.map((i) => diagnosis.symptoms[i]).filter((s): s is string => !!s),
        action: diagnosis.action.join(', '),
      })),
      recommendedAction: Array.from(new Set(saved.flatMap(({ diagnosis }) => diagnosis.action)))
        .join('\n')
        .trim(),
    };
  }
}
