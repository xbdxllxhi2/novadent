export type AttachmentKind = 'xray' | 'photo' | 'consent' | 'lab' | 'document';
export const ATTACHMENT_KINDS: AttachmentKind[] = ['xray', 'photo', 'consent', 'lab', 'document'];

/** Metadata of a file attached to the patient record. Bytes live in the file store. */
export interface Attachment {
  id: string;
  patientId: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  /** Bytes. */
  size: number;
  note: string | null;
  toothFdi: number | null;
  uploadedBy: string;
  createdAt: string;
}

export type AttachmentInput = Pick<
  Attachment,
  'patientId' | 'kind' | 'fileName' | 'mimeType' | 'note' | 'toothFdi'
>;

export const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export function isImage(a: Pick<Attachment, 'mimeType'>): boolean {
  return a.mimeType.startsWith('image/');
}

export function isPdf(a: Pick<Attachment, 'mimeType'>): boolean {
  return a.mimeType === 'application/pdf';
}
