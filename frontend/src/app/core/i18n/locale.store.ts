import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { PrimeNG } from 'primeng/config';
import { PRIMENG_TRANSLATIONS } from './primeng-translations';

export type AppLang = 'fr' | 'ar' | 'en';
export const APP_LANGS: AppLang[] = ['fr', 'ar', 'en'];
export const DEFAULT_LANG: AppLang = 'fr';

const STORAGE_KEY = 'app-lang';

/** BCP 47 tags used for Intl formatting. Arabic keeps Latin digits (clinical and monetary numbers
 *  in Mauritania are written in Western digits), which also keeps mixed tables readable. */
const INTL_LOCALES: Record<AppLang, string> = {
  fr: 'fr-MR',
  ar: 'ar-MR-u-nu-latn',
  en: 'en-MR',
};

/**
 * Active UI language: persisted, mirrored onto <html lang/dir> so Arabic flips the document to
 * RTL, and pushed into PrimeNG's translation table so date pickers and paginators follow.
 */
@Injectable({ providedIn: 'root' })
export class LocaleStore {
  private readonly transloco = inject(TranslocoService);
  private readonly primeng = inject(PrimeNG);

  readonly lang = signal<AppLang>(this.initial());
  readonly dir = computed<'rtl' | 'ltr'>(() => (this.lang() === 'ar' ? 'rtl' : 'ltr'));
  readonly locale = computed(() => INTL_LOCALES[this.lang()]);

  constructor() {
    this.apply(this.lang());
  }

  setLang(lang: AppLang): void {
    this.lang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage unavailable: the choice still applies for this tab.
    }
    this.apply(lang);
  }

  private apply(lang: AppLang): void {
    this.transloco.setActiveLang(lang);
    this.primeng.setTranslation(PRIMENG_TRANSLATIONS[lang]);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }

  private initial(): AppLang {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return APP_LANGS.includes(stored as AppLang) ? (stored as AppLang) : DEFAULT_LANG;
    } catch {
      return DEFAULT_LANG;
    }
  }
}
