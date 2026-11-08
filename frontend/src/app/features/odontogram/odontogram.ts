import { Component, computed, input, model, output } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { isToothAbsent } from '../../domain/clinical/chart-derivation';
import { archTeeth, surfaceLabel } from '../../domain/clinical/fdi';
import type {
  ChartState,
  Dentition,
  Surface,
  SurfaceState,
  ToothState,
} from '../../domain/clinical/tooth.model';
import { CELL, TOOTH, cellCenter, zonePaths } from './tooth-geometry';

export interface ToothSelection {
  fdi: number;
  /** Empty = whole tooth. */
  surfaces: Surface[];
}

interface ZoneView {
  surface: Surface;
  points: string;
  cls: string;
  selected: boolean;
  label: string;
}

interface ToothView {
  fdi: number;
  x: number;
  y: number;
  cx: number;
  cy: number;
  labelY: number;
  zones: ZoneView[];
  absent: boolean;
  whole: SurfaceState | null;
  wholeCls: string;
  glyph: string | null;
  selected: boolean;
}

const UPPER_Y = 22;
const LOWER_Y = 96;
const MARGIN_X = 8;
const WIDTH = MARGIN_X * 2 + CELL * 16;
const HEIGHT = 156;

/** Short glyph for whole-tooth conditions that have no dedicated drawing. */
const GLYPHS: Partial<Record<string, string>> = {
  fracture: '#',
  veneer: 'V',
  sealant: 'S',
  impacted: 'I',
  mobility: 'M',
  caries: 'C',
  filling: 'F',
  'bridge-pontic': 'B',
};

/**
 * FDI odontogram as inline SVG. Patient's right is on the viewer's left; the host forces LTR so
 * the chart never mirrors under Arabic. Click a zone to select it, shift+click to add zones of
 * the same tooth, click the number to select the whole tooth.
 */
@Component({
  selector: 'app-odontogram',
  imports: [TranslocoModule],
  templateUrl: './odontogram.html',
  styleUrl: './odontogram.css',
  host: { class: 'block', dir: 'ltr', style: 'direction: ltr' },
})
export class Odontogram {
  readonly chart = input.required<ChartState>();
  readonly dentition = input<Dentition>('permanent');
  readonly readonly = input(false);
  readonly selection = model<ToothSelection | null>(null);
  readonly surfaceClick = output<{ fdi: number; surface: Surface }>();

  protected readonly viewBox = `0 0 ${WIDTH} ${HEIGHT}`;
  protected readonly midX = MARGIN_X + CELL * 8;

  protected readonly teeth = computed<ToothView[]>(() => {
    const dentition = this.dentition();
    const chart = this.chart();
    const sel = this.selection();
    const build = (fdis: number[], y: number, upper: boolean): ToothView[] => {
      const offset = MARGIN_X + ((16 - fdis.length) / 2) * CELL;
      return fdis.map((fdi, i) => {
        const x = offset + i * CELL + (CELL - TOOTH) / 2;
        const state = chart.get(fdi);
        const absent = isToothAbsent(state);
        const paths = zonePaths(x, y, fdi);
        const toothSelected = sel?.fdi === fdi;
        const zones: ZoneView[] = (['M', 'D', 'O', 'B', 'L'] as Surface[]).map((surface) => ({
          surface,
          points: paths[surface],
          cls: absent ? 'zone absent' : zoneClass(state?.surfaces[surface]),
          selected:
            toothSelected && (sel!.surfaces.length === 0 || sel!.surfaces.includes(surface)),
          label: surfaceLabel(fdi, surface),
        }));
        const { cx, cy } = cellCenter(x, y);
        const whole = state?.whole ?? null;
        return {
          fdi,
          x,
          y,
          cx,
          cy,
          labelY: upper ? y - 8 : y + TOOTH + 14,
          zones,
          absent,
          whole,
          wholeCls: whole ? `whole status-${whole.status}` : '',
          glyph:
            whole &&
            !absent &&
            !['implant', 'crown', 'root-canal', 'extraction-planned', 'missing'].includes(
              whole.condition ?? '',
            )
              ? (GLYPHS[whole.condition ?? ''] ?? null)
              : null,
          selected: toothSelected,
        };
      });
    };
    return [
      ...build(archTeeth(dentition, 'upper'), UPPER_Y, true),
      ...build(archTeeth(dentition, 'lower'), LOWER_Y, false),
    ];
  });

  protected onZoneClick(event: MouseEvent, fdi: number, surface: Surface): void {
    if (this.readonly()) return;
    event.stopPropagation();
    const current = this.selection();
    if (event.shiftKey && current && current.fdi === fdi) {
      const has = current.surfaces.includes(surface);
      const surfaces = has
        ? current.surfaces.filter((s) => s !== surface)
        : [...current.surfaces, surface];
      this.selection.set(surfaces.length ? { fdi, surfaces } : null);
    } else if (
      current &&
      current.fdi === fdi &&
      current.surfaces.length === 1 &&
      current.surfaces[0] === surface
    ) {
      this.selection.set(null);
    } else {
      this.selection.set({ fdi, surfaces: [surface] });
    }
    this.surfaceClick.emit({ fdi, surface });
  }

  protected onToothClick(event: MouseEvent, fdi: number): void {
    if (this.readonly()) return;
    event.stopPropagation();
    const current = this.selection();
    this.selection.set(
      current?.fdi === fdi && current.surfaces.length === 0 ? null : { fdi, surfaces: [] },
    );
  }

  protected clear(): void {
    if (!this.readonly()) this.selection.set(null);
  }
}

function zoneClass(state: SurfaceState | undefined): string {
  if (!state) return 'zone';
  const condition =
    state.condition === 'caries' ? 'caries' : state.condition === 'fracture' ? 'fracture' : '';
  return `zone status-${state.status} ${condition}`.trim();
}

export function toothStateOf(chart: ChartState, fdi: number): ToothState | undefined {
  return chart.get(fdi);
}
