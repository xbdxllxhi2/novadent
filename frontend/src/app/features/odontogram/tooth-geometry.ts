import { isUpper, mesialSide } from '../../domain/clinical/fdi';
import type { Surface } from '../../domain/clinical/tooth.model';

export const CELL = 44;
export const TOOTH = 36;
const INNER = 11;

/** SVG polygon points for each of the five zones of a tooth cell whose top-left corner is (x, y). */
export function zonePaths(x: number, y: number, fdi: number): Record<Surface, string> {
  const s = TOOTH;
  const i = INNER;
  const top = `${x},${y} ${x + s},${y} ${x + s - i},${y + i} ${x + i},${y + i}`;
  const bottom = `${x},${y + s} ${x + s},${y + s} ${x + s - i},${y + s - i} ${x + i},${y + s - i}`;
  const left = `${x},${y} ${x + i},${y + i} ${x + i},${y + s - i} ${x},${y + s}`;
  const right = `${x + s},${y} ${x + s},${y + s} ${x + s - i},${y + s - i} ${x + s - i},${y + i}`;
  const center = `${x + i},${y + i} ${x + s - i},${y + i} ${x + s - i},${y + s - i} ${x + i},${y + s - i}`;

  // Upper arch: the outer (buccal) side faces up, the palatal side faces the midline below.
  // Lower arch: lingual faces up (toward the midline), buccal faces down.
  const buccal = isUpper(fdi) ? top : bottom;
  const lingual = isUpper(fdi) ? bottom : top;
  // Mesial faces the midline of the chart: viewer's right for quadrants 1/4 (and 5/8).
  const mesial = mesialSide(fdi) === 'right' ? right : left;
  const distal = mesialSide(fdi) === 'right' ? left : right;

  return { M: mesial, D: distal, O: center, B: buccal, L: lingual };
}

/** Centre of a cell. */
export function cellCenter(x: number, y: number): { cx: number; cy: number } {
  return { cx: x + TOOTH / 2, cy: y + TOOTH / 2 };
}
