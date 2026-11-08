import { Observable } from 'rxjs';
import type { Task, TaskInput } from './task.model';

export abstract class TasksBackend {
  /** Every open request, oldest first. */
  abstract listOpen(): Observable<Task[]>;
  abstract listForPatient(patientId: string): Observable<Task[]>;
  abstract create(input: TaskInput): Observable<Task>;
  abstract complete(id: string): Observable<Task>;
  abstract reopen(id: string): Observable<Task>;
}
