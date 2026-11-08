import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { Textarea } from 'primeng/textarea';
import { TASK_KINDS, TaskKind } from '../../domain/tasks/task.model';
import { TasksStore } from '../../domain/tasks/tasks.store';
import type { Patient } from '../../domain/patients/patient.model';
import { PatientName } from '../../shared/ui/patient-name';

/** A doctor's request to the reception about a patient. */
@Component({
  selector: 'app-task-dialog',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    Dialog,
    InputNumber,
    Select,
    SelectButton,
    Textarea,
    PatientName,
  ],
  templateUrl: './task-dialog.html',
})
export class TaskDialog {
  protected readonly store = inject(TasksStore);

  readonly visible = model(false);
  readonly patient = input.required<Patient>();
  readonly appointmentId = input<string | null>(null);

  protected readonly kind = signal<TaskKind>('schedule-followup');
  protected readonly details = signal('');
  protected readonly durationMinutes = signal(30);
  protected readonly delayDays = signal(7);
  protected readonly submitted = signal(false);

  protected readonly kinds = TASK_KINDS;
  protected readonly durations = [15, 30, 45, 60, 90];
  protected readonly valid = computed(
    () => this.kind() !== 'other' || this.details().trim().length > 0,
  );

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      this.submitted.set(false);
      this.kind.set('schedule-followup');
      this.details.set('');
      this.durationMinutes.set(30);
      this.delayDays.set(7);
    });
  }

  protected submit(): void {
    this.submitted.set(true);
    if (!this.valid()) return;
    const followup = this.kind() === 'schedule-followup';
    this.store.create(
      {
        patientId: this.patient().id,
        appointmentId: this.appointmentId(),
        kind: this.kind(),
        details: this.details(),
        durationMinutes: followup ? this.durationMinutes() : null,
        delayDays: followup ? this.delayDays() : null,
      },
      () => this.visible.set(false),
    );
  }
}
