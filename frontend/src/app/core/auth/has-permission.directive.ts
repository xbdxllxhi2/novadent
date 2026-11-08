import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthStore } from './auth.store';
import type { Permission } from './permission.model';

/**
 * Structural directive that renders its host only when the session holds the permission.
 * Accepts one permission or a list (any of). Usage: `*appHasPermission="'invoice.void'"`.
 */
@Directive({ selector: '[appHasPermission]' })
export class HasPermission {
  private readonly auth = inject(AuthStore);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);
  private rendered = false;

  readonly appHasPermission = input.required<Permission | Permission[]>();

  constructor() {
    effect(() => {
      const value = this.appHasPermission();
      const allowed = Array.isArray(value) ? this.auth.canAny(...value) : this.auth.can(value);
      if (allowed && !this.rendered) {
        this.container.createEmbeddedView(this.template);
        this.rendered = true;
      } else if (!allowed && this.rendered) {
        this.container.clear();
        this.rendered = false;
      }
    });
  }
}
