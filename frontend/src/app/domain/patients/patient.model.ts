export type AlertKind = 'allergy' | 'condition' | 'medication';
export type AlertSeverity = 'info' | 'warn' | 'danger';

export interface MedicalAlert {
  id: string;
  kind: AlertKind;
  label: string;
  severity: AlertSeverity;
}

export interface Patient {
  id: string;
  /** `P-000123`, allocated by the backend. */
  fileNumber: string;
  firstNameLatin: string;
  lastNameLatin: string;
  firstNameArabic: string;
  lastNameArabic: string;
  gender: 'M' | 'F';
  /** `YYYY-MM-DD` or null when unknown. */
  birthDate: string | null;
  /** E.164, `+222XXXXXXXX`. */
  phone: string;
  phone2: string | null;
  address: string | null;
  primaryDoctorId: string | null;
  alerts: MedicalAlert[];
  notes: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PatientInput = Omit<
  Patient,
  'id' | 'fileNumber' | 'archived' | 'createdAt' | 'updatedAt'
>;

export interface PatientSearchOptions {
  includeArchived?: boolean;
  limit?: number;
}

export interface ClinicalNote {
  id: string;
  patientId: string;
  doctorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export function emptyPatientInput(): PatientInput {
  return {
    firstNameLatin: '',
    lastNameLatin: '',
    firstNameArabic: '',
    lastNameArabic: '',
    gender: 'M',
    birthDate: null,
    phone: '',
    phone2: null,
    address: null,
    primaryDoctorId: null,
    alerts: [],
    notes: '',
  };
}
