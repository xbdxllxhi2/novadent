import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { AuthStore } from '../../core/auth/auth.store';
import { normalizeText } from '../../core/text/normalize';
import {
  PROCEDURE_CATEGORIES,
  Procedure,
  ProcedureTarget,
} from '../../domain/clinical/procedure.model';
import { ProceduresStore } from '../../domain/clinical/procedures.store';
import { LocalizedPipe } from '../../shared/ui/localized.pipe';
import { MoneyPipe } from '../../shared/ui/money.pipe';
import { StatusTag } from '../../shared/ui/status-tag';

@Component({
  selector: 'app-procedures-settings',
  imports: [
    FormsModule,
    TranslocoModule,
    Button,
    Dialog,
    IconField,
    InputIcon,
    InputNumber,
    InputText,
    Select,
    TableModule,
    ToggleSwitch,
    LocalizedPipe,
    MoneyPipe,
    StatusTag,
  ],
  templateUrl: './procedures-settings.html',
  host: { class: 'block' },
})
export class ProceduresSettings implements OnInit {
  protected readonly store = inject(ProceduresStore);
  protected readonly auth = inject(AuthStore);

  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly isNew = signal(false);
  protected readonly draft = signal<Procedure>(emptyProcedure());
  protected readonly categories = PROCEDURE_CATEGORIES;
  protected readonly targets: ProcedureTarget[] = ['surface', 'tooth', 'arch', 'mouth'];
  protected readonly canManage = computed(() => this.auth.can('procedure.manage'));

  protected readonly filtered = computed(() => {
    const q = normalizeText(this.query());
    const list = this.store.procedures();
    return q
      ? list.filter((p) =>
          normalizeText(`${p.code} ${p.name.fr} ${p.name.ar} ${p.name.en}`).includes(q),
        )
      : list;
  });

  ngOnInit(): void {
    if (!this.store.loaded()) this.store.load();
  }

  protected edit(p?: Procedure): void {
    this.isNew.set(!p);
    this.draft.set(p ? structuredClone(p) : emptyProcedure());
    this.open.set(true);
  }

  protected patch(patch: Partial<Procedure>): void {
    this.draft.update((d) => ({ ...d, ...patch }));
  }

  protected targetKey(target: ProcedureTarget): string {
    return `procedures.target${target.charAt(0).toUpperCase()}${target.slice(1)}`;
  }

  protected patchName(lang: 'fr' | 'ar' | 'en', value: string): void {
    this.draft.update((d) => ({ ...d, name: { ...d.name, [lang]: value } }));
  }

  protected save(): void {
    const d = this.draft();
    if (!d.code.trim() || !d.name.fr.trim()) return;
    this.store.save({ ...d, code: d.code.trim().toUpperCase() }, () => this.open.set(false));
  }
}

function emptyProcedure(): Procedure {
  return {
    code: '',
    name: { fr: '', ar: '', en: '' },
    category: 'restorative',
    defaultPrice: 0,
    durationMinutes: 30,
    appliesTo: 'tooth',
    active: true,
  };
}
