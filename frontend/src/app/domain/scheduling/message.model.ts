/** A short note exchanged between reception and the doctor about one appointment. */
export interface AppointmentMessage {
  id: string;
  appointmentId: string;
  patientId: string;
  authorId: string;
  /** Denormalized so readers without staff access can show who wrote it. */
  authorName: string;
  body: string;
  createdAt: string;
}

export type MessageInput = Pick<AppointmentMessage, 'appointmentId' | 'patientId' | 'body'>;
