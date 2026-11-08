import { Component, computed, inject, input } from '@angular/core';
import { LocaleStore } from '../../core/i18n/locale.store';

export interface NamedPatient {
  firstNameLatin: string;
  lastNameLatin: string;
  firstNameArabic: string;
  lastNameArabic: string;
}

/** Latin and Arabic names, the active script first and the other one muted beside it. */
@Component({
  selector: 'app-patient-name',
  templateUrl: './patient-name.html',
  host: { class: 'inline-flex min-w-0 items-baseline gap-2' },
})
export class PatientName {
  private readonly locale = inject(LocaleStore);
  readonly patient = input.required<NamedPatient>();
  /** Hide the secondary script (compact lists). */
  readonly compact = input(false);

  protected readonly latin = computed(() =>
    `${this.patient().firstNameLatin} ${this.patient().lastNameLatin}`.trim(),
  );
  protected readonly arabic = computed(() =>
    `${this.patient().firstNameArabic} ${this.patient().lastNameArabic}`.trim(),
  );
  protected readonly arabicFirst = computed(() => this.locale.lang() === 'ar');
}

export function patientDisplayName(p: NamedPatient, lang: string): string {
  const latin = `${p.firstNameLatin} ${p.lastNameLatin}`.trim();
  const arabic = `${p.firstNameArabic} ${p.lastNameArabic}`.trim();
  return lang === 'ar' ? arabic || latin : latin || arabic;
}
