import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { DatePicker } from 'primeng/datepicker';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { Skeleton } from 'primeng/skeleton';
import { Tag } from 'primeng/tag';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Tooltip } from 'primeng/tooltip';
import { AuthStore } from '../../core/auth/auth.store';
import { NotifyService } from '../../core/notify/notify.service';
import { DemoDataInfo, StaffBackend } from '../../domain/staff/staff-backend';
import { AppDatePipe } from '../../shared/ui/app-date.pipe';
import { StatusTag } from '../../shared/ui/status-tag';

/** Seed info and reset, plus a small component gallery to eyeball the preset in both schemes. */
@Component({
  selector: 'app-demo-data-settings',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    Checkbox,
    DatePicker,
    InputText,
    Message,
    Select,
    SelectButton,
    Skeleton,
    Tag,
    ToggleSwitch,
    Tooltip,
    AppDatePipe,
    StatusTag,
  ],
  templateUrl: './demo-data-settings.html',
  host: { class: 'flex flex-col gap-4' },
})
export class DemoDataSettings implements OnInit {
  private readonly backend = inject(StaffBackend);
  private readonly confirm = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);
  private readonly notify = inject(NotifyService);
  protected readonly auth = inject(AuthStore);

  protected readonly info = signal<DemoDataInfo | null>(null);
  protected readonly resetting = signal(false);
  protected readonly canManage = computed(() => this.auth.can('settings.manage'));

  // Gallery state
  protected readonly galleryToggle = signal(true);
  protected readonly galleryCheck = signal(true);
  protected readonly galleryChoice = signal('a');
  protected readonly galleryDate = signal<Date | null>(new Date());
  protected readonly galleryOptions = ['a', 'b', 'c'];

  ngOnInit(): void {
    this.backend.demoDataInfo().subscribe({ next: (i) => this.info.set(i) });
  }

  protected askReset(): void {
    this.confirm.confirm({
      header: this.transloco.translate('settings.resetDemo'),
      message: this.transloco.translate('settings.resetDemoConfirm'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.reset(),
    });
  }

  private reset(): void {
    this.resetting.set(true);
    this.backend.resetDemoData().subscribe({
      next: () => {
        // Reload from the root: a deep route may not resolve under the desktop shell.
        location.assign(document.baseURI);
      },
      error: (e) => {
        this.resetting.set(false);
        this.notify.failure(e);
      },
    });
  }
}
