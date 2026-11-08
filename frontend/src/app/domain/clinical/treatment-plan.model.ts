import type { Surface } from './tooth.model';

export type PlanStatus = 'draft' | 'proposed' | 'accepted' | 'completed' | 'cancelled';
export const PLAN_STATUSES: PlanStatus[] = [
  'draft',
  'proposed',
  'accepted',
  'completed',
  'cancelled',
];

export type PlanItemStatus = 'planned' | 'in-progress' | 'completed' | 'cancelled';

export interface PlanItem {
  id: string;
  procedureCode: string;
  toothFdi: number | null;
  surfaces: Surface[];
  doctorId: string;
  /** Integer MRU, defaults to the catalog price and can be adjusted per plan. */
  price: number;
  status: PlanItemStatus;
  completedAt: string | null;
  chartEntryId: string | null;
  invoiceLineId: string | null;
}

export interface PlanPhase {
  id: string;
  title: string;
  order: number;
  items: PlanItem[];
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  title: string;
  status: PlanStatus;
  phases: PlanPhase[];
  acceptedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type PlanItemInput = Pick<
  PlanItem,
  'procedureCode' | 'toothFdi' | 'surfaces' | 'doctorId' | 'price'
>;

export function planTotal(plan: TreatmentPlan): number {
  return plan.phases.reduce(
    (sum, ph) =>
      sum + ph.items.filter((i) => i.status !== 'cancelled').reduce((s, i) => s + i.price, 0),
    0,
  );
}

export function planProgress(plan: TreatmentPlan): { done: number; total: number } {
  const items = plan.phases.flatMap((p) => p.items).filter((i) => i.status !== 'cancelled');
  return { done: items.filter((i) => i.status === 'completed').length, total: items.length };
}
