import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';
import { LocaleStore } from './core/i18n/locale.store';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, ConfirmDialog, TranslocoModule],
  templateUrl: './app.html',
  host: { class: 'block h-full' },
})
export class App {
  protected readonly locale = inject(LocaleStore);
  // Instantiated here so the `.dark` class effect runs from the first render.
  protected readonly theme = inject(ThemeService);
}
