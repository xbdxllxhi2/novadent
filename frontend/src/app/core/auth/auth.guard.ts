import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';

/** Routed app requires a session; otherwise go to sign-in and come back afterwards. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStore);
  if (auth.loggedIn()) return true;
  return inject(Router).createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
};

/** Sign-in page is only for visitors without a session. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  return auth.loggedIn() ? inject(Router).createUrlTree(['/']) : true;
};
