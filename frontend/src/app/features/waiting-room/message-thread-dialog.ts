import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Textarea } from 'primeng/textarea';
import { AuthStore } from '../../core/auth/auth.store';
import type { Patient } from '../../domain/patients/patient.model';
import type { Appointment } from '../../domain/scheduling/appointment.model';
import { MessagesStore } from '../../domain/scheduling/messages.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { PatientName } from '../../shared/ui/patient-name';

/** Reception and doctor exchange short notes about one appointment. */
@Component({
  selector: 'app-message-thread-dialog',
  imports: [FormsModule, TranslocoModule, Button, Dialog, Textarea, AppDatePipe, PatientName],
  templateUrl: './message-thread-dialog.html',
})
export class MessageThreadDialog {
  protected readonly store = inject(MessagesStore);
  protected readonly auth = inject(AuthStore);

  readonly visible = model(false);
  readonly appointment = input<Appointment | null>(null);
  readonly patient = input<Patient | undefined>(undefined);

  protected readonly draft = signal('');
  protected readonly messages = computed(() => {
    const a = this.appointment();
    return a ? this.store.for(a.id) : [];
  });
  protected readonly canWrite = computed(() => this.auth.can('appointment.write'));

  constructor() {
    effect(() => {
      if (this.visible()) this.draft.set('');
    });
  }

  protected isMine(authorId: string): boolean {
    return this.auth.user()?.id === authorId;
  }

  protected send(): void {
    const a = this.appointment();
    const body = this.draft().trim();
    if (!a || !body) return;
    this.store.send({ appointmentId: a.id, patientId: a.patientId, body }, () =>
      this.draft.set(''),
    );
  }
}
