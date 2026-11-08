/**
 * Surfaces in FDI-independent shorthand. Labels are resolved per tooth in the UI: O is occlusal on
 * posteriors and incisal (I) on anteriors; B is buccal on posteriors and vestibular/labial (V) on
 * anteriors; L is lingual on the lower arch and palatal (P) on the upper.
 */
export type Surface = 'M' | 'D' | 'O' | 'B' | 'L';
export const SURFACES: Surface[] = ['M', 'O', 'D', 'B', 'L'];

export type ToothCondition =
  | 'missing'
  | 'implant'
  | 'crown'
  | 'root-canal'
  | 'extraction-planned'
  | 'caries'
  | 'fracture'
  | 'bridge-pontic'
  | 'veneer'
  | 'filling'
  | 'sealant'
  | 'impacted'
  | 'mobility';

export const TOOTH_CONDITIONS: ToothCondition[] = [
  'caries',
  'filling',
  'fracture',
  'crown',
  'veneer',
  'root-canal',
  'implant',
  'bridge-pontic',
  'sealant',
  'missing',
  'extraction-planned',
  'impacted',
  'mobility',
];

/** Conditions that describe the whole tooth and clear any surface state. */
export const WHOLE_TOOTH_CONDITIONS: ReadonlySet<ToothCondition> = new Set([
  'missing',
  'implant',
  'crown',
  'root-canal',
  'extraction-planned',
  'bridge-pontic',
  'impacted',
  'mobility',
]);

export type ClinicalStatus = 'existing' | 'planned' | 'in-progress' | 'completed';
export const CLINICAL_STATUSES: ClinicalStatus[] = [
  'existing',
  'planned',
  'in-progress',
  'completed',
];

export type Dentition = 'permanent' | 'primary';

/**
 * Append-only clinical event. The chart is derived by folding entries in `recordedAt` order; a
 * voided entry is ignored. Surfaces empty = whole tooth.
 */
export interface ChartEntry {
  id: string;
  patientId: string;
  toothFdi: number;
  surfaces: Surface[];
  kind: 'condition' | 'procedure';
  condition: ToothCondition | null;
  procedureCode: string | null;
  status: ClinicalStatus;
  doctorId: string;
  recordedAt: string;
  planItemId: string | null;
  note: string | null;
  voided: boolean;
}

export type ChartEntryInput = Omit<ChartEntry, 'id' | 'recordedAt' | 'voided'>;

export interface SurfaceState {
  condition: ToothCondition | null;
  procedureCode: string | null;
  status: ClinicalStatus;
  entryId: string;
}

export interface ToothState {
  fdi: number;
  whole: SurfaceState | null;
  surfaces: Partial<Record<Surface, SurfaceState>>;
}

export type ChartState = Map<number, ToothState>;
