import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { Task } from '../../domain/tasks/task.model';
import { TasksBackend } from '../../domain/tasks/tasks-backend';
import { notImplemented } from './not-implemented';

@Injectable({ providedIn: 'root' })
export class RemoteTasksBackend extends TasksBackend {
  listOpen(): Observable<Task[]> {
    return notImplemented('TasksBackend.listOpen');
  }
  listForPatient(): Observable<Task[]> {
    return notImplemented('TasksBackend.listForPatient');
  }
  create(): Observable<Task> {
    return notImplemented('TasksBackend.create');
  }
  complete(): Observable<Task> {
    return notImplemented('TasksBackend.complete');
  }
  reopen(): Observable<Task> {
    return notImplemented('TasksBackend.reopen');
  }
}
