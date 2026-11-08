import { Injectable, effect, signal } from '@angular/core';

const STORAGE_KEY = 'theme';
const SCALE_KEY = 'type-scale';

export type TextScale = 0.92 | 1 | 1.1;

/**
 * Resolves the stored preference the same way index.html's pre-paint script does. Light is the
 * default; `prefers-color-scheme` is deliberately not consulted so the app looks like the scheme
 * it was designed in until someone opts into the other one.
 */
function storedPrefersDark(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark';
  } catch {
    return false;
  }
}

function storedScale(): TextScale {
  try {
    const v = Number(localStorage.getItem(SCALE_KEY));
    return v === 0.92 || v === 1.1 ? v : 1;
  } catch {
    return 1;
  }
}

/** Owns the `.dark` class and the `--type-scale` variable on <html>. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(storedPrefersDark());
  readonly textScale = signal<TextScale>(storedScale());

  constructor() {
    effect(() => {
      document.documentElement.classList.toggle('dark', this.isDark());
      this.syncThemeColor();
    });
    effect(() => {
      document.documentElement.style.setProperty('--type-scale', String(this.textScale()));
    });
  }

  toggle(): void {
    this.setDark(!this.isDark());
  }

  setDark(dark: boolean): void {
    this.isDark.set(dark);
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    } catch {
      // Storage unavailable (private mode, quota): the choice still applies for this tab.
    }
  }

  setTextScale(scale: TextScale): void {
    this.textScale.set(scale);
    try {
      localStorage.setItem(SCALE_KEY, String(scale));
    } catch {
      // Same as above.
    }
  }

  /** Keeps `<meta name="theme-color">` on the live page color so browser chrome matches. */
  private syncThemeColor(): void {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) return;
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue('--p-surface-950')
      .trim();
    if (color) meta.content = color;
  }
}
