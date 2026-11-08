export interface LocalizedText {
  fr: string;
  ar: string;
  en: string;
}

export type ProcedureCategory =
  | 'diagnostic'
  | 'preventive'
  | 'restorative'
  | 'endo'
  | 'perio'
  | 'surgery'
  | 'prosthetic'
  | 'ortho'
  | 'other';

export const PROCEDURE_CATEGORIES: ProcedureCategory[] = [
  'diagnostic',
  'preventive',
  'restorative',
  'endo',
  'perio',
  'surgery',
  'prosthetic',
  'ortho',
  'other',
];

/** What a procedure is charted against. Drives the odontogram picker. */
export type ProcedureTarget = 'surface' | 'tooth' | 'arch' | 'mouth';

export interface Procedure {
  /** Clinic-local code such as `REST-COMP`. Stable identifier across the catalog. */
  code: string;
  name: LocalizedText;
  category: ProcedureCategory;
  /** Integer MRU. */
  defaultPrice: number;
  durationMinutes: number;
  appliesTo: ProcedureTarget;
  active: boolean;
}
