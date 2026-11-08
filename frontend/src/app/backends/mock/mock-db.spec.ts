import { beforeEach, describe, expect, it } from 'vitest';
import type { Patient } from '../../domain/patients/patient.model';
import { MockDb } from './mock-db';
import { SEED_VERSION } from './seed';

describe('MockDb', () => {
  beforeEach(() => localStorage.clear());

  it('seeds on first use and records the seed version', () => {
    const db = new MockDb();
    expect(db.meta()?.seedVersion).toBe(SEED_VERSION);
    expect(db.collection<Patient>('patients').all().length).toBe(3);
    expect(db.collection('doctors').all()).toHaveLength(1);
    expect(db.collection('roles').all()).toHaveLength(5);
  });

  it('persists writes and returns clones', () => {
    const db = new MockDb();
    const patients = db.collection<Patient>('patients');
    const first = patients.all()[0];
    first.notes = 'mutated copy';
    expect(patients.get(first.id)?.notes).toBe('');
    patients.update(first.id, { notes: 'saved' });
    expect(new MockDb().collection<Patient>('patients').get(first.id)?.notes).toBe('saved');
  });

  it('counts sequences and reseeds on reset', () => {
    const db = new MockDb();
    const n1 = db.nextSequence('patientFile');
    const n2 = db.nextSequence('patientFile');
    expect(n2).toBe(n1 + 1);
    const patients = db.collection<Patient>('patients');
    patients.remove(patients.all()[0].id);
    const countAfterRemove = patients.all().length;
    db.reset();
    expect(db.collection('patients').all().length).toBe(countAfterRemove + 1);
    expect(db.nextSequence('patientFile')).toBe(n1);
  });

  it('reseeds when the stored version differs', () => {
    localStorage.setItem(
      'novadent.mock.meta',
      JSON.stringify({ seedVersion: -1, seededAt: '2020-01-01' }),
    );
    localStorage.setItem('novadent.mock.patients', '[]');
    const db = new MockDb();
    expect(db.collection('patients').all().length).toBeGreaterThan(0);
  });
});
