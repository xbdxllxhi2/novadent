import { Component, inject } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { Tooltip } from 'primeng/tooltip';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-theme-toggle',
  imports: [TranslocoModule, Tooltip],
  templateUrl: './theme-toggle.html',
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
}
