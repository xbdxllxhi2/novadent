import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthStore } from '../../core/auth/auth.store';
import { toIsoDate } from '../../core/i18n/formats';
import { BillingBackend } from '../../domain/billing/billing-backend';
import { ClinicalBackend } from '../../domain/clinical/clinical-backend';
import { formatSurfaces } from '../../domain/clinical/fdi';
import { ProceduresStore } from '../../domain/clinical/procedures.store';
import { PatientsBackend } from '../../domain/patients/patients-backend';
import { SchedulingBackend } from '../../domain/scheduling/scheduling-backend';
import { StaffStore } from '../../domain/staff/staff.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { LoadingBlock } from '../../shared/ui/loading-block';
import { MoneyPipe } from '../../shared/ui/money.pipe';
import { StatusTag, StatusTone } from '../../shared/ui/status-tag';
import { injectPatientId } from './patient-route';

export type TimelineKind =
  | 'appointment'
  | 'finding'
  | 'procedure'
  | 'planned'
  | 'document'
  | 'invoice'
  | 'payment'
  | 'note'
  | 'attachment';

export interface TimelineEvent {
  id: string;
  at: string;
  kind: TimelineKind;
  title: string;
  detail: string | null;
  doctorId: string | null;
  tone: StatusTone;
  link: string[] | null;
}

interface TimelineDay {
  date: string;
  events: TimelineEvent[];
}

const KIND_ICONS: Record<TimelineKind, string> = {
  appointment: 'pi-calendar',
  finding: 'pi-search',
  procedure: 'pi-check-circle',
  planned: 'pi-list-check',
  document: 'pi-file-edit',
  invoice: 'pi-receipt',
  payment: 'pi-wallet',
  note: 'pi-pencil',
  attachment: 'pi-image',
};

/**
 * Everything that happened to this patient, grouped by day, newest first: visits, findings and
 * completed procedures, planned work, prescriptions, invoices and payments, notes, files.
 * Each source is read only if the session may see it.
 */
@Component({
  selector: 'app-patient-timeline-tab',
  imports: [
    RouterLink,
    TranslocoModule,
    AppDatePipe,
    EmptyState,
    LoadingBlock,
    MoneyPipe,
    StatusTag,
  ],
  templateUrl: './patient-timeline-tab.html',
  host: { class: 'block' },
})
export class PatientTimelineTab {
  protected readonly staff = inject(StaffStore);
  protected readonly auth = inject(AuthStore);
  private readonly procedures = inject(ProceduresStore);
  private readonly scheduling = inject(SchedulingBackend);
  private readonly clinical = inject(ClinicalBackend);
  private readonly billing = inject(BillingBackend);
  private readonly patients = inject(PatientsBackend);
  private readonly patientId = injectPatientId();

  protected readonly events = signal<TimelineEvent[]>([]);
  protected readonly loading = signal(true);
  protected readonly filter = signal<TimelineKind | 'all'>('all');
  protected readonly icons = KIND_ICONS;
  protected readonly kinds: (TimelineKind | 'all')[] = [
    'all',
    'appointment',
    'procedure',
    'finding',
    'planned',
    'document',
    'invoice',
    'payment',
    'note',
    'attachment',
  ];

  protected readonly days = computed<TimelineDay[]>(() => {
    const f = this.filter();
    const list = this.events().filter((e) => f === 'all' || e.kind === f);
    const map = new Map<string, TimelineEvent[]>();
    for (const e of list) {
      const day = toIsoDate(new Date(e.at));
      map.set(day, [...(map.get(day) ?? []), e]);
    }
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, events]) => ({ date, events: events.sort((a, b) => b.at.localeCompare(a.at)) }));
  });

  constructor() {
    if (!this.procedures.loaded()) this.procedures.load();
    effect(() => {
      const id = this.patientId();
      if (id) this.load(id);
    });
  }

  private load(patientId: string): void {
    this.loading.set(true);
    const can = (p: Parameters<AuthStore['can']>[0]) => this.auth.can(p);
    const safe = <T>(allowed: boolean, source: () => import('rxjs').Observable<T[]>) =>
      allowed ? source().pipe(catchError(() => of([] as T[]))) : of([] as T[]);

    forkJoin({
      appointments: safe(can('appointment.read'), () => this.scheduling.listForPatient(patientId)),
      entries: safe(can('chart.read'), () => this.clinical.listChartEntries(patientId)),
      plans: safe(can('plan.read'), () => this.clinical.listPlans(patientId)),
      documents: safe(can('document.read'), () => this.clinical.listDocuments(patientId)),
      invoices: safe(can('invoice.read'), () => this.billing.listInvoices({ patientId })),
      notes: safe(can('note.read'), () => this.patients.listNotes(patientId)),
      attachments: safe(can('attachment.read'), () => this.patients.listAttachments(patientId)),
    }).subscribe(({ appointments, entries, plans, documents, invoices, notes, attachments }) => {
      const events: TimelineEvent[] = [];
      const procName = (code: string | null) =>
        code ? (this.procedures.get(code)?.name.fr ?? code) : '';

      for (const a of appointments) {
        if (a.status === 'cancelled') continue;
        events.push({
          id: `a-${a.id}`,
          at: a.start,
          kind: 'appointment',
          title: a.reason,
          detail: `apptStatus.${a.status}`,
          doctorId: a.doctorId,
          tone: a.status === 'done' ? 'success' : a.status === 'no-show' ? 'danger' : 'neutral',
          link: null,
        });
      }
      for (const e of entries) {
        if (e.voided) continue;
        const where = e.surfaces.length
          ? `${e.toothFdi} ${formatSurfaces(e.toothFdi, e.surfaces)}`
          : `${e.toothFdi}`;
        const label =
          e.kind === 'procedure'
            ? procName(e.procedureCode)
            : e.condition
              ? `conditions.${e.condition}`
              : '';
        const kind: TimelineKind =
          e.status === 'completed'
            ? 'procedure'
            : e.status === 'planned' || e.status === 'in-progress'
              ? 'planned'
              : 'finding';
        events.push({
          id: `e-${e.id}`,
          at: e.recordedAt,
          kind,
          title: `${where} · ${label}`,
          detail: e.note,
          doctorId: e.doctorId,
          tone: kind === 'procedure' ? 'primary' : kind === 'planned' ? 'warn' : 'info',
          link: ['/patients', patientId, 'chart'],
        });
      }
      for (const p of plans) {
        events.push({
          id: `p-${p.id}`,
          at: p.createdAt,
          kind: 'planned',
          title: p.title,
          detail: `planStatus.${p.status}`,
          doctorId: null,
          tone: 'neutral',
          link: ['/patients', patientId, 'plans'],
        });
        if (p.acceptedAt)
          events.push({
            id: `pa-${p.id}`,
            at: p.acceptedAt,
            kind: 'planned',
            title: p.title,
            detail: 'planStatus.accepted',
            doctorId: null,
            tone: 'primary',
            link: ['/patients', patientId, 'plans'],
          });
      }
      for (const d of documents) {
        events.push({
          id: `d-${d.id}`,
          at: d.issuedAt,
          kind: 'document',
          title:
            d.kind === 'prescription' ? 'documents.kindPrescription' : 'documents.kindCertificate',
          detail: d.body.split('\n')[0] ?? null,
          doctorId: d.doctorId,
          tone: 'info',
          link: ['/print/document', d.id],
        });
      }
      for (const inv of invoices) {
        events.push({
          id: `i-${inv.id}`,
          at: inv.issuedAt,
          kind: 'invoice',
          title: inv.number,
          detail: `invoiceStatus.${inv.status}`,
          doctorId: null,
          tone: inv.status === 'paid' ? 'success' : inv.status === 'void' ? 'neutral' : 'warn',
          link: ['/billing/invoices', inv.id],
        });
      }
      for (const n of notes) {
        events.push({
          id: `n-${n.id}`,
          at: n.createdAt,
          kind: 'note',
          title: n.body.length > 120 ? n.body.slice(0, 120) + '...' : n.body,
          detail: null,
          doctorId: n.doctorId,
          tone: 'neutral',
          link: ['/patients', patientId, 'notes'],
        });
      }
      for (const f of attachments) {
        events.push({
          id: `f-${f.id}`,
          at: f.createdAt,
          kind: 'attachment',
          title: f.note || f.fileName,
          detail: `attachmentKind.${f.kind}`,
          doctorId: null,
          tone: 'neutral',
          link: ['/patients', patientId, 'attachments'],
        });
      }

      // Payments need one call per invoice; keep it to the invoices we have.
      const paymentCalls = invoices.map((inv) =>
        this.billing.listPayments(inv.id).pipe(catchError(() => of([]))),
      );
      const finish = () => {
        this.events.set(events);
        this.loading.set(false);
      };
      if (paymentCalls.length === 0) {
        finish();
        return;
      }
      forkJoin(paymentCalls).subscribe((lists) => {
        lists.flat().forEach((pay) => {
          if (pay.voided) return;
          const inv = invoices.find((i) => i.id === pay.invoiceId);
          events.push({
            id: `pay-${pay.id}`,
            at: pay.paidAt,
            kind: 'payment',
            title: inv?.number ?? '',
            detail: `payMethod.${pay.method}`,
            doctorId: null,
            tone: 'success',
            link: inv ? ['/billing/invoices', inv.id] : null,
            ...{ amount: pay.amount },
          } as TimelineEvent & { amount: number });
        });
        finish();
      });
    });
  }

  /** Detail strings that are translation keys start with a namespace; plain text is shown as is. */
  protected isKey(detail: string | null): boolean {
    return !!detail && /^[a-zA-Z]+\.[a-zA-Z-]+$/.test(detail);
  }

  protected amountOf(e: TimelineEvent): number | null {
    return (e as TimelineEvent & { amount?: number }).amount ?? null;
  }
}
