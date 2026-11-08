import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';
import type { Permission } from './permission.model';

/** Route-level permission check. Signed-in users lacking the permission land on /forbidden. */
export function permissionGuard(...anyOf: Permission[]): CanActivateFn {
  return () => {
    const auth = inject(AuthStore);
    if (auth.canAny(...anyOf)) return true;
    return inject(Router).createUrlTree(['/forbidden']);
  };
}
