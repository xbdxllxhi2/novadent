import { describe, expect, it } from 'vitest';
import { deriveChart, isToothAbsent } from './chart-derivation';
import type { ChartEntry } from './tooth.model';

let seq = 0;
function entry(partial: Partial<ChartEntry> & Pick<ChartEntry, 'toothFdi' | 'status'>): ChartEntry {
  seq += 1;
  return {
    id: `e${seq}`,
    patientId: 'p',
    surfaces: [],
    kind: 'condition',
    condition: null,
    procedureCode: null,
    doctorId: 'd',
    recordedAt: `2026-01-${String(seq).padStart(2, '0')}T10:00:00.000Z`,
    planItemId: null,
    note: null,
    voided: false,
    ...partial,
  };
}

describe('deriveChart', () => {
  it('later entries win per surface and leave other surfaces alone', () => {
    const chart = deriveChart([
      entry({ toothFdi: 36, surfaces: ['M', 'O'], condition: 'caries', status: 'existing' }),
      entry({
        toothFdi: 36,
        surfaces: ['O'],
        procedureCode: 'COMP-1',
        kind: 'procedure',
        condition: 'filling',
        status: 'completed',
      }),
    ]);
    const t = chart.get(36)!;
    expect(t.surfaces.M?.condition).toBe('caries');
    expect(t.surfaces.O?.condition).toBe('filling');
    expect(t.surfaces.O?.status).toBe('completed');
  });

  it('a completed missing tooth clears its surfaces', () => {
    const chart = deriveChart([
      entry({ toothFdi: 16, surfaces: ['O'], condition: 'caries', status: 'existing' }),
      entry({ toothFdi: 16, condition: 'missing', status: 'existing' }),
    ]);
    const t = chart.get(16)!;
    expect(t.whole?.condition).toBe('missing');
    expect(Object.keys(t.surfaces)).toHaveLength(0);
    expect(isToothAbsent(t)).toBe(true);
  });

  it('a planned extraction keeps surfaces and does not read as absent', () => {
    const chart = deriveChart([
      entry({ toothFdi: 46, surfaces: ['D'], condition: 'caries', status: 'existing' }),
      entry({ toothFdi: 46, condition: 'extraction-planned', status: 'planned' }),
    ]);
    const t = chart.get(46)!;
    expect(t.surfaces.D?.condition).toBe('caries');
    expect(isToothAbsent(t)).toBe(false);
  });

  it('skips voided entries and honours asOf', () => {
    const e1 = entry({ toothFdi: 11, surfaces: ['B'], condition: 'caries', status: 'existing' });
    const e2 = entry({
      toothFdi: 11,
      surfaces: ['B'],
      condition: 'filling',
      status: 'completed',
      voided: true,
    });
    const e3 = entry({ toothFdi: 11, surfaces: ['B'], condition: 'veneer', status: 'completed' });
    expect(deriveChart([e1, e2, e3]).get(11)!.surfaces.B?.condition).toBe('veneer');
    expect(deriveChart([e1, e2, e3], e1.recordedAt).get(11)!.surfaces.B?.condition).toBe('caries');
  });
});
