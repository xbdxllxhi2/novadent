import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-forbidden-page',
  imports: [TranslocoModule, RouterLink, Button],
  template: `
    <div class="flex min-h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <span class="flex h-12 w-12 items-center justify-center rounded-full bg-danger/12 text-danger"
        ><i class="pi pi-lock text-[20px]"></i
      ></span>
      <h1 class="text-[20px] font-semibold text-surface-100">
        {{ 'auth.forbiddenTitle' | transloco }}
      </h1>
      <p class="max-w-md text-caption text-surface-400">{{ 'auth.forbiddenBody' | transloco }}</p>
      <p-button
        [label]="'auth.backHome' | transloco"
        routerLink="/"
        icon="pi pi-home"
        [outlined]="true"
      />
    </div>
  `,
  host: { class: 'block min-h-full bg-surface-950' },
})
export class ForbiddenPage {}
