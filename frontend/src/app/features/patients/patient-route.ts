import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import type { Signal } from '@angular/core';

/** The `:id` of the enclosing /patients/:id route, as a signal, for the tab components. */
export function injectPatientId(): Signal<string> {
  const route = inject(ActivatedRoute);
  const parent = route.parent ?? route;
  return toSignal(parent.paramMap.pipe(map((p) => p.get('id') ?? '')), {
    initialValue: parent.snapshot.paramMap.get('id') ?? '',
  });
}
