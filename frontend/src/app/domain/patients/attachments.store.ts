import { Injectable, inject, signal } from '@angular/core';
import { NotifyService } from '../../core/notify/notify.service';
import type { Attachment, AttachmentInput } from './attachment.model';
import { PatientsBackend } from './patients-backend';

/** Files attached to the patient currently open. Blobs are fetched on demand and cached as URLs. */
@Injectable({ providedIn: 'root' })
export class AttachmentsStore {
  private readonly backend = inject(PatientsBackend);
  private readonly notify = inject(NotifyService);
  private readonly urls = new Map<string, string>();

  readonly patientId = signal<string | null>(null);
  readonly attachments = signal<Attachment[]>([]);
  readonly loading = signal(false);
  readonly uploading = signal(0);
  /** Object URLs by attachment id, filled lazily by `ensureUrl`. */
  readonly previewUrls = signal<ReadonlyMap<string, string>>(new Map());

  load(patientId: string): void {
    if (this.patientId() !== patientId) {
      this.attachments.set([]);
      this.revokeAll();
    }
    this.patientId.set(patientId);
    this.loading.set(true);
    this.backend.listAttachments(patientId).subscribe({
      next: (list) => {
        if (this.patientId() !== patientId) return;
        this.attachments.set(list);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.failure(e);
      },
    });
  }

  /** Fetches the blob once and exposes an object URL for previews and downloads. */
  ensureUrl(id: string): void {
    if (this.urls.has(id)) return;
    this.urls.set(id, '');
    this.backend.getAttachmentBlob(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.urls.set(id, url);
        this.previewUrls.update((m) => new Map(m).set(id, url));
      },
      error: () => this.urls.delete(id),
    });
  }

  upload(input: AttachmentInput, file: Blob, done?: (a: Attachment) => void): void {
    this.uploading.update((n) => n + 1);
    this.backend.addAttachment(input, file).subscribe({
      next: (a) => {
        this.uploading.update((n) => n - 1);
        this.attachments.update((list) => [a, ...list]);
        this.notify.success('notify.attachmentAdded', { name: a.fileName });
        done?.(a);
      },
      error: (e) => {
        this.uploading.update((n) => n - 1);
        this.notify.failure(e);
      },
    });
  }

  delete(id: string): void {
    this.backend.deleteAttachment(id).subscribe({
      next: () => {
        this.attachments.update((list) => list.filter((a) => a.id !== id));
        const url = this.urls.get(id);
        if (url) URL.revokeObjectURL(url);
        this.urls.delete(id);
        this.previewUrls.update((m) => {
          const next = new Map(m);
          next.delete(id);
          return next;
        });
        this.notify.success('notify.attachmentDeleted');
      },
      error: (e) => this.notify.failure(e),
    });
  }

  private revokeAll(): void {
    for (const url of this.urls.values()) if (url) URL.revokeObjectURL(url);
    this.urls.clear();
    this.previewUrls.set(new Map());
  }
}
