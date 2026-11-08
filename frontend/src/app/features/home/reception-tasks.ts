import { Component, OnInit, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { AuthStore } from '../../core/auth/auth.store';
import { PatientNamesStore } from '../../domain/patients/patient-names.store';
import type { Task } from '../../domain/tasks/task.model';
import { TasksStore } from '../../domain/tasks/tasks.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { PatientName } from '../../shared/ui/patient-name';
import { StatusTag, StatusTone } from '../../shared/ui/status-tag';

const KIND_TONES: Record<Task['kind'], StatusTone> = {
  'schedule-followup': 'primary',
  invoice: 'warn',
  print: 'info',
  other: 'neutral',
};

/** Open requests from doctors, for whoever runs the front desk. */
@Component({
  selector: 'app-reception-tasks',
  imports: [RouterLink, TranslocoModule, Button, AppDatePipe, EmptyState, PatientName, StatusTag],
  templateUrl: './reception-tasks.html',
  host: { class: 'block' },
})
export class ReceptionTasks implements OnInit {
  protected readonly store = inject(TasksStore);
  protected readonly patients = inject(PatientNamesStore);
  protected readonly auth = inject(AuthStore);
  protected readonly tone = (k: Task['kind']) => KIND_TONES[k];

  constructor() {
    effect(() => this.patients.ensure(this.store.open().map((t) => t.patientId)));
  }

  ngOnInit(): void {
    this.store.loadOpen();
  }
}
