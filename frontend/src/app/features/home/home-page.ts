import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { Message } from 'primeng/message';
import { AuthStore } from '../../core/auth/auth.store';
import { BillingStore } from '../../domain/billing/billing.store';
import { SchedulingStore } from '../../domain/scheduling/scheduling.store';
import { StaffBackend } from '../../domain/staff/staff-backend';
import { StaffStore } from '../../domain/staff/staff.store';
import { KpiTile } from '../../shared/ui/kpi-tile';
import { MoneyPipe } from '../../shared/ui/money.pipe';
import { PageHeader } from '../../shared/ui/page-header';
import { ReceptionTasks } from './reception-tasks';
import { TodayAgenda } from './today-agenda';

const STALE_SEED_DAYS = 14;

@Component({
  selector: 'app-home-page',
  imports: [
    TranslocoModule,
    RouterLink,
    Message,
    PageHeader,
    KpiTile,
    TodayAgenda,
    ReceptionTasks,
    MoneyPipe,
  ],
  templateUrl: './home-page.html',
  host: { class: 'block' },
})
export class HomePage implements OnInit {
  protected readonly auth = inject(AuthStore);
  protected readonly scheduling = inject(SchedulingStore);
  protected readonly billing = inject(BillingStore);
  protected readonly staff = inject(StaffStore);
  private readonly staffBackend = inject(StaffBackend);

  /** Demo data older than two weeks leaves today's agenda empty; nudge toward a reset. */
  protected readonly staleSeed = signal(false);

  protected readonly todayCount = computed(
    () => this.scheduling.appointments().filter((a) => a.status !== 'cancelled').length,
  );
  protected readonly inClinic = computed(
    () =>
      this.scheduling
        .appointments()
        .filter((a) => a.status === 'arrived' || a.status === 'in-chair').length,
  );
  protected readonly doneCount = computed(
    () => this.scheduling.appointments().filter((a) => a.status === 'done').length,
  );

  ngOnInit(): void {
    if (this.auth.can('appointment.read')) {
      this.scheduling.view.set('day');
      this.scheduling.goTo(new Date());
    }
    if (this.auth.can('invoice.read')) this.billing.loadOutstanding();
    this.staffBackend.demoDataInfo().subscribe({
      next: (info) => {
        if (!info) return;
        const ageDays = (Date.now() - new Date(info.seededAt).getTime()) / 86_400_000;
        this.staleSeed.set(ageDays > STALE_SEED_DAYS && this.auth.can('settings.manage'));
      },
    });
  }
}
