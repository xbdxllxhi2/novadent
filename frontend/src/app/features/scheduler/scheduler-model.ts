import type { Appointment, BlockedTime } from '../../domain/scheduling/appointment.model';

/** One vertical column of the grid: a doctor or a chair on a given day. */
export interface SchedulerColumn {
  key: string;
  /** `YYYY-MM-DD` of the day this column shows. */
  day: Date;
  doctorId: string | null;
  chairId: string | null;
  title: string;
  subtitle: string | null;
  color: string | null;
}

export interface PlacedAppointment {
  appointment: Appointment;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

export interface Band {
  top: number;
  height: number;
  blocked?: BlockedTime;
}

export interface SlotClick {
  column: SchedulerColumn;
  start: Date;
}

export interface MoveRequest {
  id: string;
  start: string;
  end: string;
  column: SchedulerColumn;
}

export interface ResizeRequest {
  id: string;
  end: string;
}
