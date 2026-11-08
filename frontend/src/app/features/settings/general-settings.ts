import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { AuthStore } from '../../core/auth/auth.store';
import { APP_LANGS, AppLang, LocaleStore } from '../../core/i18n/locale.store';
import { TextScale, ThemeService } from '../../core/theme/theme.service';
import { ClinicSettingsStore } from '../../domain/staff/clinic-settings.store';

const LANG_LABELS: Record<AppLang, string> = { fr: 'Français', ar: 'العربية', en: 'English' };

@Component({
  selector: 'app-general-settings',
  imports: [FormsModule, TranslocoModule, Button, InputText, Select, SelectButton, ToggleSwitch],
  templateUrl: './general-settings.html',
  host: { class: 'flex flex-col gap-4' },
})
export class GeneralSettings {
  protected readonly settings = inject(ClinicSettingsStore);
  protected readonly locale = inject(LocaleStore);
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthStore);

  protected readonly name = signal('');
  protected readonly address = signal('');
  protected readonly phone = signal('');
  protected readonly canManage = computed(() => this.auth.can('settings.manage'));
  protected readonly langOptions = APP_LANGS.map((code) => ({ code, label: LANG_LABELS[code] }));
  protected readonly scaleOptions: { value: TextScale; labelKey: string }[] = [
    { value: 0.92, labelKey: 'settings.textSmall' },
    { value: 1, labelKey: 'settings.textNormal' },
    { value: 1.1, labelKey: 'settings.textLarge' },
  ];

  constructor() {
    effect(() => {
      const s = this.settings.settings();
      if (!s) return;
      this.name.set(s.name);
      this.address.set(s.address);
      this.phone.set(s.phone);
    });
  }

  protected save(): void {
    const s = this.settings.settings();
    if (!s) return;
    this.settings.save({
      ...s,
      name: this.name().trim(),
      address: this.address().trim(),
      phone: this.phone().trim(),
    });
  }
}
