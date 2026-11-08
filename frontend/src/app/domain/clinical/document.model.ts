export type DocumentKind = 'prescription' | 'certificate';
export type CertificateType = 'sick-leave' | 'attendance';

/**
 * A printable clinical document written by a doctor: a prescription or a medical certificate.
 * The body is free text (the doctor writes what they want); certificates start from a template
 * the doctor can edit before saving.
 */
export interface ClinicalDocument {
  id: string;
  patientId: string;
  doctorId: string;
  kind: DocumentKind;
  certificateType: CertificateType | null;
  /** Sick-leave days, when relevant. */
  days: number | null;
  /** `YYYY-MM-DD` start of the sick leave, when relevant. */
  fromDate: string | null;
  body: string;
  issuedAt: string;
}

export type DocumentInput = Pick<
  ClinicalDocument,
  'patientId' | 'kind' | 'certificateType' | 'days' | 'fromDate' | 'body'
>;
