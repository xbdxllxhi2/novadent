import {
  ChartEntry,
  ChartState,
  SurfaceState,
  ToothState,
  WHOLE_TOOTH_CONDITIONS,
} from './tooth.model';

function stateOf(entry: ChartEntry): SurfaceState {
  return {
    condition: entry.condition,
    procedureCode: entry.procedureCode,
    status: entry.status,
    entryId: entry.id,
  };
}

/**
 * Folds append-only chart entries into the current state of every tooth. Later entries win per
 * surface; a whole-tooth entry (no surfaces) replaces the tooth's whole state and, for conditions
 * like `missing` or `extraction-planned` that make surfaces meaningless, clears the surfaces too.
 * Voided entries are skipped. `asOf` limits the fold to entries recorded up to that instant.
 */
export function deriveChart(entries: ChartEntry[], asOf?: string): ChartState {
  const chart: ChartState = new Map();
  const ordered = entries
    .filter((e) => !e.voided && (!asOf || e.recordedAt <= asOf))
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

  for (const entry of ordered) {
    let tooth = chart.get(entry.toothFdi);
    if (!tooth) {
      tooth = { fdi: entry.toothFdi, whole: null, surfaces: {} };
      chart.set(entry.toothFdi, tooth);
    }
    applyEntry(tooth, entry);
  }
  return chart;
}

function applyEntry(tooth: ToothState, entry: ChartEntry): void {
  const state = stateOf(entry);
  if (entry.surfaces.length === 0) {
    tooth.whole = state;
    const clearsSurfaces =
      entry.status !== 'planned' &&
      entry.condition !== null &&
      WHOLE_TOOTH_CONDITIONS.has(entry.condition);
    if (clearsSurfaces) tooth.surfaces = {};
    return;
  }
  for (const s of entry.surfaces) tooth.surfaces[s] = state;
}

/** Whether a tooth currently reads as absent (missing, or an extraction that was completed). */
export function isToothAbsent(tooth: ToothState | undefined): boolean {
  if (!tooth?.whole) return false;
  const w = tooth.whole;
  return (
    (w.condition === 'missing' && w.status !== 'planned') ||
    (w.condition === 'extraction-planned' && w.status === 'completed')
  );
}
