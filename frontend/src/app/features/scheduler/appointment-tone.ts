import type { AppointmentStatus } from '../../domain/scheduling/appointment.model';
import type { StatusTone } from '../../shared/ui/status-tag';

/** Status to colour tone, documented in novodent-preset.ts. */
export function appointmentTone(status: AppointmentStatus): StatusTone {
  switch (status) {
    case 'scheduled':
      return 'neutral';
    case 'confirmed':
      return 'info';
    case 'arrived':
      return 'warn';
    case 'in-chair':
      return 'primary';
    case 'done':
      return 'success';
    case 'no-show':
      return 'danger';
    case 'cancelled':
      return 'neutral';
  }
}
