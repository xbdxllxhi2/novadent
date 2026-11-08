import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { SelectButton } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { AuthStore } from '../../core/auth/auth.store';
import { HasPermission } from '../../core/auth/has-permission.directive';
import { formatInteger, toIsoDate } from '../../core/i18n/formats';
import { LocaleStore } from '../../core/i18n/locale.store';
import { NotifyService } from '../../core/notify/notify.service';
import { BillingStore } from '../../domain/billing/billing.store';
import type { DateRange } from '../../domain/scheduling/appointment.model';
import { addDays, startOfDay, startOfWeek } from '../../domain/scheduling/slots';
import { StaffStore } from '../../domain/staff/staff.store';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { EmptyState } from '../../shared/ui/empty-state';
import { MoneyPipe } from '../../shared/ui/money.pipe';
import { PageHeader } from '../../shared/ui/page-header';

type Preset = 'thisMonth' | 'lastMonth' | 'thisWeek' | 'custom';

@Component({
  selector: 'app-production-report-page',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    DatePicker,
    SelectButton,
    TableModule,
    HasPermission,
    AppDatePipe,
    EmptyState,
    MoneyPipe,
    PageHeader,
  ],
  templateUrl: './production-report-page.html',
  host: { class: 'block' },
})
export class ProductionReportPage implements OnInit {
  protected readonly store = inject(BillingStore);
  protected readonly staff = inject(StaffStore);
  protected readonly auth = inject(AuthStore);
  private readonly locale = inject(LocaleStore);
  private readonly transloco = inject(TranslocoService);
  private readonly notify = inject(NotifyService);

  protected readonly preset = signal<Preset>('thisMonth');
  protected readonly custom = signal<Date[] | null>(null);
  protected readonly presets: { value: Preset; labelKey: string }[] = [
    { value: 'thisMonth', labelKey: 'reports.thisMonth' },
    { value: 'lastMonth', labelKey: 'reports.lastMonth' },
    { value: 'thisWeek', labelKey: 'reports.thisWeek' },
    { value: 'custom', labelKey: 'reports.custom' },
  ];

  protected readonly range = computed<DateRange>(() => {
    const now = new Date();
    switch (this.preset()) {
      case 'thisMonth':
        return {
          from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
        };
      case 'lastMonth':
        return {
          from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
          to: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        };
      case 'thisWeek': {
        const from = startOfWeek(now);
        return { from: from.toISOString(), to: addDays(from, 7).toISOString() };
      }
      case 'custom': {
        const c = this.custom();
        const from = c?.[0] ? startOfDay(c[0]) : startOfDay(now);
        const to = c?.[1] ? addDays(startOfDay(c[1]), 1) : addDays(from, 1);
        return { from: from.toISOString(), to: to.toISOString() };
      }
    }
  });

  protected readonly totals = computed(() => {
    const rows = this.store.report();
    const invoiced = rows.reduce((s, r) => s + r.invoiced, 0);
    const collected = rows.reduce((s, r) => s + r.collected, 0);
    return {
      invoiceCount: rows.reduce((s, r) => s + r.invoiceCount, 0),
      invoiced,
      collected,
      rate: invoiced ? Math.round((collected / invoiced) * 100) : 0,
    };
  });

  ngOnInit(): void {
    this.reload();
  }

  protected setPreset(value: Preset): void {
    this.preset.set(value);
    if (value !== 'custom') this.reload();
  }

  protected setCustom(value: Date[] | null): void {
    this.custom.set(value);
    if (value && value[0] && value[1]) this.reload();
  }

  protected rate(invoiced: number, collected: number): string {
    return invoiced ? `${Math.round((collected / invoiced) * 100)} %` : '-';
  }

  protected exportCsv(): void {
    const header = [
      this.transloco.translate('common.doctor'),
      this.transloco.translate('reports.invoiceCount'),
      this.transloco.translate('reports.invoiced'),
      this.transloco.translate('reports.collected'),
    ];
    const rows = this.store
      .report()
      .map((r) => [
        this.staff.doctor(r.doctorId)?.nameLatin ?? r.doctorId,
        String(r.invoiceCount),
        String(r.invoiced),
        String(r.collected),
      ]);
    const csv = [header, ...rows]
      .map((cols) => cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-${toIsoDate(new Date(this.range().from))}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.notify.success('notify.exported');
  }

  protected readonly fmt = (n: number) => formatInteger(n, this.locale.locale());

  private reload(): void {
    this.store.loadReport(this.range());
  }
}
