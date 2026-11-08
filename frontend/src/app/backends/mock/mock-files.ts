import { Injectable } from '@angular/core';
import { BackendError } from '../../core/backend-error';

const DB_NAME = 'novadent-mock-files';
const STORE = 'files';

/**
 * Binary store for the mock backend. localStorage cannot hold images, IndexedDB can (hundreds of
 * MB). The real backend will put files in object storage and keep the metadata in PostgreSQL.
 */
@Injectable({ providedIn: 'root' })
export class MockFileStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  async put(id: string, blob: Blob): Promise<void> {
    const db = await this.open();
    await this.run(db.transaction(STORE, 'readwrite').objectStore(STORE).put(blob, id));
  }

  async get(id: string): Promise<Blob> {
    const db = await this.open();
    const blob = await this.run<Blob | undefined>(
      db.transaction(STORE, 'readonly').objectStore(STORE).get(id),
    );
    if (!blob) throw new BackendError('notFound', { id });
    return blob;
  }

  async delete(id: string): Promise<void> {
    const db = await this.open();
    await this.run(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id));
  }

  async clear(): Promise<void> {
    const db = await this.open();
    await this.run(db.transaction(STORE, 'readwrite').objectStore(STORE).clear());
  }

  private open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new BackendError('unknown'));
      });
    }
    return this.dbPromise;
  }

  private run<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new BackendError('unknown'));
    });
  }
}
