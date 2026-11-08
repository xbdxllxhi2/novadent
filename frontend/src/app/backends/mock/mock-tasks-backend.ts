import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendError } from '../../core/backend-error';
import type { Patient } from '../../domain/patients/patient.model';
import type { Task, TaskInput } from '../../domain/tasks/task.model';
import { TasksBackend } from '../../domain/tasks/tasks-backend';
import { newId } from './ids';
import { respond } from './latency';
import { MockAuthBackend } from './mock-auth-backend';
import { MockDb } from './mock-db';

@Injectable({ providedIn: 'root' })
export class MockTasksBackend extends TasksBackend {
  private readonly db = inject(MockDb);
  private readonly auth = inject(MockAuthBackend);

  listOpen(): Observable<Task[]> {
    return respond(() => {
      this.auth.require('task.read');
      return this.db
        .collection<Task>('tasks')
        .where((t) => t.status === 'open')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }

  listForPatient(patientId: string): Observable<Task[]> {
    return respond(() => {
      this.auth.require('task.read', 'task.write');
      return this.db
        .collection<Task>('tasks')
        .where((t) => t.patientId === patientId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  }

  create(input: TaskInput): Observable<Task> {
    return respond(() => {
      const session = this.auth.require('task.write');
      this.db.collection<Patient>('patients').require(input.patientId);
      if (!input.details.trim() && input.kind === 'other')
        throw new BackendError('validation', { field: 'details' });
      return this.db.collection<Task>('tasks').insert({
        ...input,
        details: input.details.trim(),
        id: newId(),
        createdBy: session.user.id,
        createdByName: session.user.displayName,
        createdAt: new Date().toISOString(),
        status: 'open',
        doneBy: null,
        doneAt: null,
      });
    });
  }

  complete(id: string): Observable<Task> {
    return respond(() => {
      const session = this.auth.require('task.complete');
      return this.db
        .collection<Task>('tasks')
        .update(id, { status: 'done', doneBy: session.user.id, doneAt: new Date().toISOString() });
    });
  }

  reopen(id: string): Observable<Task> {
    return respond(() => {
      this.auth.require('task.complete', 'task.write');
      return this.db
        .collection<Task>('tasks')
        .update(id, { status: 'open', doneBy: null, doneAt: null });
    });
  }
}
