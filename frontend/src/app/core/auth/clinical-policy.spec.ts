import { describe, expect, it } from 'vitest';
import { canEditChartEntry, canEditNote } from './clinical-policy';
import type { AuthSession, Role } from './permission.model';

function session(permissions: Role['permissions'], doctorId: string | null): AuthSession {
  return {
    user: { id: 'u', username: 'u', displayName: 'U', roleId: 'r', doctorId, active: true },
    role: { id: 'r', name: 'r', builtIn: false, locked: false, permissions },
    permissions,
    doctorId,
  };
}

describe('canEditChartEntry', () => {
  it('allows the recording doctor with chart.write', () => {
    expect(canEditChartEntry(session(['chart.write'], 'd1'), { doctorId: 'd1' })).toBe(true);
  });
  it('refuses another doctor without chart.manage', () => {
    expect(canEditChartEntry(session(['chart.write'], 'd2'), { doctorId: 'd1' })).toBe(false);
  });
  it("allows chart.manage on anyone's entry", () => {
    expect(
      canEditChartEntry(session(['chart.write', 'chart.manage'], null), { doctorId: 'd1' }),
    ).toBe(true);
  });
  it('refuses without chart.write even when owning', () => {
    expect(canEditChartEntry(session(['chart.read'], 'd1'), { doctorId: 'd1' })).toBe(false);
    expect(canEditChartEntry(null, { doctorId: 'd1' })).toBe(false);
  });
});

describe('canEditNote', () => {
  it('mirrors the chart rule with note.write', () => {
    expect(canEditNote(session(['note.write'], 'd1'), { doctorId: 'd1' })).toBe(true);
    expect(canEditNote(session(['note.write'], 'd2'), { doctorId: 'd1' })).toBe(false);
    expect(canEditNote(session(['note.write', 'chart.manage'], 'd2'), { doctorId: 'd1' })).toBe(
      true,
    );
  });
});
