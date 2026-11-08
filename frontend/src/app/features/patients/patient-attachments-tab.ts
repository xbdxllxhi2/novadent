import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { AuthStore } from '../../core/auth/auth.store';
import { allTeeth } from '../../domain/clinical/fdi';
import {
  ATTACHMENT_KINDS,
  Attachment,
  AttachmentKind,
  MAX_ATTACHMENT_BYTES,
  isImage,
  isPdf,
} from '../../domain/patients/attachment.model';
import { AttachmentsStore } from '../../domain/patients/attachments.store';
import { NotifyService } from '../../core/notify/notify.service';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { StatusTag } from '../../shared/ui/status-tag';
import { injectPatientId } from './patient-route';

const ACCEPT = 'image/*,application/pdf';

/** X-rays, photos, consents and other files of the patient, with inline preview. */
@Component({
  selector: 'app-patient-attachments-tab',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    Dialog,
    InputText,
    Select,
    SelectButton,
    AppDatePipe,
    EmptyState,
    StatusTag,
  ],
  templateUrl: './patient-attachments-tab.html',
  host: { class: 'block' },
})
export class PatientAttachmentsTab {
  protected readonly store = inject(AttachmentsStore);
  protected readonly auth = inject(AuthStore);
  private readonly notify = inject(NotifyService);
  private readonly confirm = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);
  protected readonly patientId = injectPatientId();

  protected readonly kind = signal<AttachmentKind>('xray');
  protected readonly note = signal('');
  protected readonly toothFdi = signal<number | null>(null);
  protected readonly dragging = signal(false);
  protected readonly filter = signal<AttachmentKind | 'all'>('all');
  protected readonly viewing = signal<Attachment | null>(null);

  protected readonly kinds = ATTACHMENT_KINDS;
  protected readonly accept = ACCEPT;
  protected readonly teethOptions = allTeeth('permanent').map((fdi) => ({
    fdi,
    label: String(fdi),
  }));
  protected readonly canWrite = computed(() => this.auth.can('attachment.write'));
  protected readonly filterOptions = computed<(AttachmentKind | 'all')[]>(() => [
    'all',
    ...ATTACHMENT_KINDS,
  ]);
  protected readonly visibleAttachments = computed(() => {
    const f = this.filter();
    return f === 'all'
      ? this.store.attachments()
      : this.store.attachments().filter((a) => a.kind === f);
  });
  protected readonly isImage = isImage;
  protected readonly isPdf = isPdf;

  constructor() {
    effect(() => {
      const id = this.patientId();
      if (id) this.store.load(id);
    });
    // Thumbnails: fetch the bytes of images as they appear.
    effect(() => {
      for (const a of this.store.attachments()) if (isImage(a)) this.store.ensureUrl(a.id);
    });
  }

  protected url(a: Attachment): string | undefined {
    return this.store.previewUrls().get(a.id);
  }

  protected onFiles(list: FileList | null): void {
    if (!list) return;
    for (const file of Array.from(list)) this.uploadOne(file);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    if (this.canWrite()) this.onFiles(event.dataTransfer?.files ?? null);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (this.canWrite()) this.dragging.set(true);
  }

  protected open(a: Attachment): void {
    this.store.ensureUrl(a.id);
    this.viewing.set(a);
  }

  protected askDelete(a: Attachment): void {
    this.confirm.confirm({
      header: this.transloco.translate('common.delete'),
      message: this.transloco.translate('attachments.deleteConfirm', { name: a.fileName }),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.store.delete(a.id);
        if (this.viewing()?.id === a.id) this.viewing.set(null);
      },
    });
  }

  protected formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  private uploadOne(file: File): void {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      this.notify.warn('attachments.tooLarge', { name: file.name });
      return;
    }
    const ok = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!ok) {
      this.notify.warn('attachments.unsupported', { name: file.name });
      return;
    }
    this.store.upload(
      {
        patientId: this.patientId(),
        kind: this.kind(),
        fileName: file.name,
        mimeType: file.type,
        note: this.note().trim() || null,
        toothFdi: this.toothFdi(),
      },
      file,
      () => this.note.set(''),
    );
  }
}
