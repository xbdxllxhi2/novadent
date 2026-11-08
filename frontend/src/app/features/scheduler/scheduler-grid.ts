import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { PatientNamesStore } from '../../domain/patients/patient-names.store';
import type {
  Appointment,
  AppointmentStatus,
  BlockedTime,
} from '../../domain/scheduling/appointment.model';
import {
  addMinutes,
  hmFromMinutes,
  hoursFor,
  minutesOfDay,
  packLanes,
  parseHm,
  sameDay,
  SLOT_MINUTES,
  snapMinutes,
} from '../../domain/scheduling/slots';
import type { ClinicHours } from '../../domain/staff/staff.model';
import { AppointmentCard } from './appointment-card';
import type {
  Band,
  MoveRequest,
  PlacedAppointment,
  ResizeRequest,
  SchedulerColumn,
  SlotClick,
} from './scheduler-model';

interface DragState {
  kind: 'move' | 'resize';
  id: string;
  startX: number;
  startY: number;
  originStart: Date;
  originEnd: Date;
  originColumnIndex: number;
  /** Live preview. */
  dyMinutes: number;
  columnIndex: number;
  moved: boolean;
}

export const SLOT_HEIGHT = 28;

/**
 * Day/week grid. One column per doctor, chair, or day. Appointment cards are positioned
 * absolutely from their times; moving and resizing use raw pointer events so the maths is
 * identical in LTR and RTL (columns are resolved from their bounding boxes).
 */
@Component({
  selector: 'app-scheduler-grid',
  imports: [TranslocoModule, AppointmentCard],
  templateUrl: './scheduler-grid.html',
  host: { class: 'block overflow-auto rounded-xl border border-surface-700 bg-surface-900' },
})
export class SchedulerGrid {
  protected readonly patients = inject(PatientNamesStore);

  readonly columns = input.required<SchedulerColumn[]>();
  readonly appointments = input.required<Appointment[]>();
  readonly blockedTimes = input.required<BlockedTime[]>();
  readonly hours = input<ClinicHours | null>(null);
  readonly startMin = input.required<number>();
  readonly endMin = input.required<number>();
  readonly editable = input(true);
  readonly canCancel = input(false);

  readonly slotClick = output<SlotClick>();
  readonly cardClick = output<Appointment>();
  readonly move = output<MoveRequest>();
  readonly resize = output<ResizeRequest>();
  readonly statusChange = output<{ id: string; status: AppointmentStatus }>();
  readonly openPatient = output<string>();

  protected readonly slotHeight = SLOT_HEIGHT;
  protected readonly drag = signal<DragState | null>(null);
  private readonly columnEls = viewChildren<ElementRef<HTMLElement>>('columnEl');

  protected readonly totalMinutes = computed(() => this.endMin() - this.startMin());
  protected readonly bodyHeight = computed(
    () => (this.totalMinutes() / SLOT_MINUTES) * SLOT_HEIGHT,
  );
  protected readonly hourMarks = computed(() => {
    const marks: { top: number; label: string }[] = [];
    const first = Math.ceil(this.startMin() / 60) * 60;
    for (let m = first; m <= this.endMin(); m += 60)
      marks.push({ top: this.y(m), label: hmFromMinutes(m) });
    return marks;
  });

  /** Closed periods (outside opening hours) per column, as shaded bands. */
  protected readonly closedBands = computed<Map<string, Band[]>>(() => {
    const hours = this.hours();
    const map = new Map<string, Band[]>();
    for (const col of this.columns()) {
      const open = hours ? hoursFor(hours, col.day) : [];
      const bands: Band[] = [];
      let cursor = this.startMin();
      for (const r of [...open].sort((a, b) => parseHm(a.start) - parseHm(b.start))) {
        const s = parseHm(r.start);
        const e = parseHm(r.end);
        if (s > cursor) bands.push({ top: this.y(cursor), height: this.y(s) - this.y(cursor) });
        cursor = Math.max(cursor, e);
      }
      if (cursor < this.endMin())
        bands.push({ top: this.y(cursor), height: this.y(this.endMin()) - this.y(cursor) });
      map.set(col.key, bands);
    }
    return map;
  });

  protected readonly blockedBands = computed<Map<string, Band[]>>(() => {
    const map = new Map<string, Band[]>();
    for (const col of this.columns()) {
      const bands: Band[] = [];
      for (const b of this.blockedTimes()) {
        const s = new Date(b.start);
        const e = new Date(b.end);
        if (!sameDay(s, col.day) && !sameDay(addMinutes(e, -1), col.day)) continue;
        // A doctor column shows blocks for that doctor or for everyone; a chair column likewise.
        const applies = col.doctorId
          ? b.doctorId === null || b.doctorId === col.doctorId
          : b.chairId === null || b.chairId === col.chairId;
        if (!applies) continue;
        const sMin = sameDay(s, col.day) ? minutesOfDay(s) : this.startMin();
        const eMin = sameDay(addMinutes(e, -1), col.day)
          ? minutesOfDay(e) === 0
            ? 24 * 60
            : minutesOfDay(e)
          : this.endMin();
        bands.push({
          top: this.y(sMin),
          height: Math.max(SLOT_HEIGHT / 2, this.y(eMin) - this.y(sMin)),
          blocked: b,
        });
      }
      map.set(col.key, bands);
    }
    return map;
  });

  protected readonly placed = computed<Map<string, PlacedAppointment[]>>(() => {
    const map = new Map<string, PlacedAppointment[]>();
    for (const col of this.columns()) {
      const inColumn = this.appointments().filter((a) => {
        if (a.status === 'cancelled') return false;
        if (!sameDay(new Date(a.start), col.day)) return false;
        if (col.doctorId && a.doctorId !== col.doctorId) return false;
        if (col.chairId && a.chairId !== col.chairId) return false;
        return true;
      });
      const lanes = packLanes(inColumn);
      map.set(
        col.key,
        inColumn.map((a) => {
          const sMin = minutesOfDay(a.start);
          const eMin = Math.max(
            sMin + SLOT_MINUTES,
            minutesOfDay(a.end) === 0 ? 24 * 60 : minutesOfDay(a.end),
          );
          const placement = lanes.get(a.id) ?? { lane: 0, lanes: 1 };
          return {
            appointment: a,
            top: this.y(sMin),
            height: this.y(eMin) - this.y(sMin),
            ...placement,
          };
        }),
      );
    }
    return map;
  });

  protected y(minutes: number): number {
    return ((minutes - this.startMin()) / SLOT_MINUTES) * SLOT_HEIGHT;
  }

  protected previewStyle(id: string): Record<string, string> | null {
    const d = this.drag();
    if (!d || d.id !== id) return null;
    if (d.kind === 'resize') return { height: 'var(--preview-h)' };
    return {
      transform: `translateY(${(d.dyMinutes / SLOT_MINUTES) * SLOT_HEIGHT}px)`,
      opacity: '0.85',
      zIndex: '30',
    };
  }

  protected previewHeight(p: PlacedAppointment): number {
    const d = this.drag();
    if (!d || d.id !== p.appointment.id || d.kind !== 'resize') return p.height;
    const endMin = minutesOfDay(d.originEnd) + d.dyMinutes;
    const startMin = minutesOfDay(d.originStart);
    return Math.max(
      SLOT_HEIGHT,
      this.y(Math.max(startMin + SLOT_MINUTES, endMin)) - this.y(startMin),
    );
  }

  protected onColumnClick(event: MouseEvent, column: SchedulerColumn, el: HTMLElement): void {
    if (!this.editable()) return;
    if ((event.target as HTMLElement).closest('app-appointment-card')) return;
    const rect = el.getBoundingClientRect();
    const minutes =
      this.startMin() + Math.floor((event.clientY - rect.top) / SLOT_HEIGHT) * SLOT_MINUTES;
    const start = new Date(column.day);
    start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    this.slotClick.emit({ column, start });
  }

  // Pointer-driven move and resize -------------------------------------------------------------

  protected startMove(event: PointerEvent, placed: PlacedAppointment, columnIndex: number): void {
    if (!this.editable() || event.button !== 0) return;
    this.beginDrag('move', event, placed, columnIndex);
  }

  protected startResize(event: PointerEvent, placed: PlacedAppointment, columnIndex: number): void {
    if (!this.editable() || event.button !== 0) return;
    event.stopPropagation();
    this.beginDrag('resize', event, placed, columnIndex);
  }

  private beginDrag(
    kind: 'move' | 'resize',
    event: PointerEvent,
    placed: PlacedAppointment,
    columnIndex: number,
  ): void {
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    this.drag.set({
      kind,
      id: placed.appointment.id,
      startX: event.clientX,
      startY: event.clientY,
      originStart: new Date(placed.appointment.start),
      originEnd: new Date(placed.appointment.end),
      originColumnIndex: columnIndex,
      dyMinutes: 0,
      columnIndex,
      moved: false,
    });
    const onMove = (e: PointerEvent) => this.updateDrag(e);
    const onUp = (e: PointerEvent) => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
      this.endDrag(e, placed);
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  }

  private updateDrag(event: PointerEvent): void {
    const d = this.drag();
    if (!d) return;
    const dy = event.clientY - d.startY;
    const dyMinutes = snapMinutes((dy / SLOT_HEIGHT) * SLOT_MINUTES);
    let columnIndex = d.columnIndex;
    if (d.kind === 'move') {
      const els = this.columnEls();
      const hit = els.findIndex((ref) => {
        const r = ref.nativeElement.getBoundingClientRect();
        return event.clientX >= r.left && event.clientX < r.right;
      });
      if (hit >= 0) columnIndex = hit;
    }
    const moved = d.moved || Math.abs(dy) > 4 || columnIndex !== d.originColumnIndex;
    this.drag.set({ ...d, dyMinutes, columnIndex, moved });
  }

  private endDrag(event: PointerEvent, placed: PlacedAppointment): void {
    const d = this.drag();
    this.drag.set(null);
    if (!d) return;
    if (!d.moved) {
      if (d.kind === 'move') this.cardClick.emit(placed.appointment);
      return;
    }
    if (d.kind === 'resize') {
      const end = addMinutes(d.originEnd, d.dyMinutes);
      const minEnd = addMinutes(d.originStart, SLOT_MINUTES);
      const finalEnd = end < minEnd ? minEnd : end;
      if (finalEnd.getTime() !== d.originEnd.getTime())
        this.resize.emit({ id: d.id, end: finalEnd.toISOString() });
      return;
    }
    const column = this.columns()[d.columnIndex];
    if (!column) return;
    const duration = (d.originEnd.getTime() - d.originStart.getTime()) / 60_000;
    const start = new Date(column.day);
    const originMinutes = minutesOfDay(d.originStart) + d.dyMinutes;
    const clamped = Math.min(Math.max(originMinutes, 0), 24 * 60 - duration);
    start.setHours(Math.floor(clamped / 60), clamped % 60, 0, 0);
    const end = addMinutes(start, duration);
    const unchanged =
      start.getTime() === d.originStart.getTime() &&
      column.doctorId === (placed.appointment.doctorId ?? null) &&
      (column.chairId === null || column.chairId === placed.appointment.chairId);
    if (unchanged && d.columnIndex === d.originColumnIndex) return;
    this.move.emit({ id: d.id, start: start.toISOString(), end: end.toISOString(), column });
  }
}
