import { Injectable } from '@angular/core';
import { BackendError } from '../../core/backend-error';
import { buildSeedData, SEED_VERSION } from './seed';

export interface Identified {
  id: string;
}

export type CollectionName =
  | 'patients'
  | 'clinicalNotes'
  | 'doctors'
  | 'chairs'
  | 'staffUsers'
  | 'roles'
  | 'clinicSettings'
  | 'appointments'
  | 'blockedTimes'
  | 'procedures'
  | 'chartEntries'
  | 'treatmentPlans'
  | 'invoices'
  | 'payments'
  | 'documents'
  | 'attachments'
  | 'tasks'
  | 'messages';

export const COLLECTION_NAMES: CollectionName[] = [
  'patients',
  'clinicalNotes',
  'doctors',
  'chairs',
  'staffUsers',
  'roles',
  'clinicSettings',
  'appointments',
  'blockedTimes',
  'procedures',
  'chartEntries',
  'treatmentPlans',
  'invoices',
  'payments',
  'documents',
  'attachments',
  'tasks',
  'messages',
];

export interface SeedData {
  collections: Record<CollectionName, Identified[]>;
  counters: Record<string, number>;
}

export interface MockMeta {
  seedVersion: number;
  seededAt: string;
}

const PREFIX = 'novodent.mock.';
const META_KEY = `${PREFIX}meta`;
const COUNTERS_KEY = `${PREFIX}counters`;

/**
 * localStorage-backed document store for the mock backends. Each collection is one key so writes
 * stay small; reads return clones so callers can never mutate the store by accident. Seeded on
 * first use and whenever the seed version changes.
 */
@Injectable({ providedIn: 'root' })
export class MockDb {
  private readonly cache = new Map<CollectionName, Identified[]>();

  constructor() {
    this.ensureSeeded();
  }

  collection<T extends Identified>(name: CollectionName): MockCollection<T> {
    return new MockCollection<T>(this, name);
  }

  meta(): MockMeta | null {
    return readJson<MockMeta>(META_KEY);
  }

  /** Next value of a named sequence (`patientFile`, `invoice-2026`), persisted. */
  nextSequence(name: string): number {
    const counters = readJson<Record<string, number>>(COUNTERS_KEY) ?? {};
    const next = (counters[name] ?? 0) + 1;
    counters[name] = next;
    writeJson(COUNTERS_KEY, counters);
    return next;
  }

  /** Clears every collection and reseeds. */
  reset(): void {
    // Attached files live in IndexedDB; drop them with the metadata (fire and forget).
    try {
      indexedDB.deleteDatabase('novodent-mock-files');
    } catch {
      // IndexedDB unavailable: nothing to clear.
    }
    for (const name of COLLECTION_NAMES) localStorage.removeItem(PREFIX + name);
    localStorage.removeItem(META_KEY);
    localStorage.removeItem(COUNTERS_KEY);
    this.cache.clear();
    this.seed();
  }

  /** @internal */
  readAll(name: CollectionName): Identified[] {
    let items = this.cache.get(name);
    if (!items) {
      items = readJson<Identified[]>(PREFIX + name) ?? [];
      this.cache.set(name, items);
    }
    return items;
  }

  /** @internal */
  writeAll(name: CollectionName, items: Identified[]): void {
    this.cache.set(name, items);
    writeJson(PREFIX + name, items);
  }

  private ensureSeeded(): void {
    const meta = this.meta();
    if (!meta || meta.seedVersion !== SEED_VERSION) {
      for (const name of COLLECTION_NAMES) localStorage.removeItem(PREFIX + name);
      localStorage.removeItem(COUNTERS_KEY);
      this.cache.clear();
      this.seed();
    }
  }

  private seed(): void {
    const data = buildSeedData(new Date());
    for (const name of COLLECTION_NAMES) this.writeAll(name, data.collections[name]);
    writeJson(COUNTERS_KEY, data.counters);
    writeJson(META_KEY, {
      seedVersion: SEED_VERSION,
      seededAt: new Date().toISOString(),
    } satisfies MockMeta);
  }
}

export class MockCollection<T extends Identified> {
  constructor(
    private readonly db: MockDb,
    private readonly name: CollectionName,
  ) {}

  all(): T[] {
    return structuredClone(this.db.readAll(this.name) as T[]);
  }

  get(id: string): T | undefined {
    const found = (this.db.readAll(this.name) as T[]).find((x) => x.id === id);
    return found ? structuredClone(found) : undefined;
  }

  /** Throws `notFound` so callers can rely on the result. */
  require(id: string): T {
    const found = this.get(id);
    if (!found) throw new BackendError('notFound', { id });
    return found;
  }

  where(predicate: (item: T) => boolean): T[] {
    return structuredClone((this.db.readAll(this.name) as T[]).filter(predicate));
  }

  insert(item: T): T {
    const items = [...(this.db.readAll(this.name) as T[]), structuredClone(item)];
    this.db.writeAll(this.name, items);
    return structuredClone(item);
  }

  update(id: string, patch: Partial<T> | ((current: T) => T)): T {
    const items = this.db.readAll(this.name) as T[];
    const index = items.findIndex((x) => x.id === id);
    if (index === -1) throw new BackendError('notFound', { id });
    const next =
      typeof patch === 'function'
        ? patch(structuredClone(items[index]))
        : { ...items[index], ...patch };
    const copy = [...items];
    copy[index] = structuredClone(next);
    this.db.writeAll(this.name, copy);
    return structuredClone(next);
  }

  /** Inserts or replaces by id. */
  upsert(item: T): T {
    return this.get(item.id) ? this.update(item.id, item) : this.insert(item);
  }

  remove(id: string): void {
    const items = this.db.readAll(this.name) as T[];
    this.db.writeAll(
      this.name,
      items.filter((x) => x.id !== id),
    );
  }
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new BackendError('storageQuota');
  }
}
