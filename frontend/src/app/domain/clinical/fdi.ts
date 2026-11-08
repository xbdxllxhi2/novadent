import type { Dentition, Surface } from './tooth.model';

/**
 * FDI two-digit notation. The first digit is the quadrant (1 upper right, 2 upper left, 3 lower
 * left, 4 lower right for permanent teeth; 5 to 8 for primary), the second is the position from
 * the midline. Arrays are in VIEWER order: the patient's right is on the viewer's left.
 */
export const PERMANENT_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const PERMANENT_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const PRIMARY_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const PRIMARY_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

export function archTeeth(dentition: Dentition, arch: 'upper' | 'lower'): number[] {
  if (dentition === 'permanent') return arch === 'upper' ? PERMANENT_UPPER : PERMANENT_LOWER;
  return arch === 'upper' ? PRIMARY_UPPER : PRIMARY_LOWER;
}

export function allTeeth(dentition: Dentition): number[] {
  return [...archTeeth(dentition, 'upper'), ...archTeeth(dentition, 'lower')];
}

export function quadrant(fdi: number): number {
  return Math.floor(fdi / 10);
}

export function position(fdi: number): number {
  return fdi % 10;
}

export function isUpper(fdi: number): boolean {
  const q = quadrant(fdi);
  return q === 1 || q === 2 || q === 5 || q === 6;
}

export function isPrimaryTooth(fdi: number): boolean {
  return quadrant(fdi) >= 5;
}

/** Incisors and canines (positions 1 to 3). */
export function isAnterior(fdi: number): boolean {
  return position(fdi) <= 3;
}

export function isValidFdi(fdi: number): boolean {
  return allTeeth('permanent').includes(fdi) || allTeeth('primary').includes(fdi);
}

/**
 * Where the mesial side sits in viewer space. Quadrants 1 and 4 (patient's right, viewer's left)
 * have mesial toward the midline on the viewer's right; quadrants 2 and 3 the opposite.
 */
export function mesialSide(fdi: number): 'left' | 'right' {
  const q = quadrant(fdi);
  return q === 1 || q === 4 || q === 5 || q === 8 ? 'right' : 'left';
}

/** Human label for a surface on this tooth (O/I, B/V, L/P). Returns a translation key suffix. */
export function surfaceLabel(fdi: number, surface: Surface): string {
  switch (surface) {
    case 'O':
      return isAnterior(fdi) ? 'I' : 'O';
    case 'B':
      return isAnterior(fdi) ? 'V' : 'B';
    case 'L':
      return isUpper(fdi) ? 'P' : 'L';
    default:
      return surface;
  }
}

/** Mesial to distal order for display, e.g. "MOD". */
export function formatSurfaces(fdi: number, surfaces: Surface[]): string {
  const order: Surface[] = ['M', 'O', 'D', 'B', 'L'];
  return [...surfaces]
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((s) => surfaceLabel(fdi, s))
    .join('');
}
