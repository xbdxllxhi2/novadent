import { describe, expect, it } from 'vitest';
import {
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  PRIMARY_UPPER,
  formatSurfaces,
  isAnterior,
  isUpper,
  isValidFdi,
  mesialSide,
  surfaceLabel,
} from './fdi';

describe('fdi', () => {
  it('lists arches in viewer order, patient right first', () => {
    expect(PERMANENT_UPPER[0]).toBe(18);
    expect(PERMANENT_UPPER[15]).toBe(28);
    expect(PERMANENT_LOWER[0]).toBe(48);
    expect(PRIMARY_UPPER).toHaveLength(10);
  });

  it('classifies teeth', () => {
    expect(isUpper(16)).toBe(true);
    expect(isUpper(36)).toBe(false);
    expect(isUpper(55)).toBe(true);
    expect(isAnterior(13)).toBe(true);
    expect(isAnterior(14)).toBe(false);
    expect(isValidFdi(19)).toBe(false);
    expect(isValidFdi(85)).toBe(true);
  });

  it('puts mesial toward the midline', () => {
    expect(mesialSide(16)).toBe('right');
    expect(mesialSide(26)).toBe('left');
    expect(mesialSide(36)).toBe('left');
    expect(mesialSide(46)).toBe('right');
  });

  it('labels surfaces per tooth type', () => {
    expect(surfaceLabel(11, 'O')).toBe('I');
    expect(surfaceLabel(16, 'O')).toBe('O');
    expect(surfaceLabel(11, 'B')).toBe('V');
    expect(surfaceLabel(16, 'L')).toBe('P');
    expect(surfaceLabel(36, 'L')).toBe('L');
    expect(formatSurfaces(36, ['D', 'M', 'O'])).toBe('MOD');
  });
});
