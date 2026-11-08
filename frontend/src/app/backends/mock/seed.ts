import { PERMISSIONS, Permission, Role } from '../../core/auth/permission.model';
import type {
  Invoice,
  InvoiceLine,
  Payment,
  PaymentMethod,
} from '../../domain/billing/invoice.model';
import { statusFor } from '../../domain/billing/invoice-math';
import type { ClinicalDocument } from '../../domain/clinical/document.model';
import type { Task } from '../../domain/tasks/task.model';
import type { AppointmentMessage } from '../../domain/scheduling/message.model';
import type { Procedure } from '../../domain/clinical/procedure.model';
import { ChartEntry, Surface, ToothCondition } from '../../domain/clinical/tooth.model';
import type { PlanItem, TreatmentPlan } from '../../domain/clinical/treatment-plan.model';
import type { ClinicalNote, Patient } from '../../domain/patients/patient.model';
import {
  Appointment,
  AppointmentStatus,
  BlockedTime,
} from '../../domain/scheduling/appointment.model';
import { addDays, hoursFor, parseHm, startOfDay } from '../../domain/scheduling/slots';
import type { Chair, ClinicSettings, Doctor, StaffUser } from '../../domain/staff/staff.model';
import type { SeedData } from './mock-db';
import { SeededRandom } from './seed-random';

/** Bump when the seed shape changes; MockDb reseeds on mismatch. */
export const SEED_VERSION = 3;

/** Stable ids for fixed entities so mocks and tests can reference them. */
export const SEED_IDS = {
  doctors: { ahmed: 'doctor-ahmed', fatimetou: 'doctor-fatimetou', lemine: 'doctor-lemine' },
  chairs: ['chair-1', 'chair-2', 'chair-3'],
  roles: {
    owner: 'role-owner',
    dentist: 'role-dentist',
    assistant: 'role-assistant',
    receptionist: 'role-receptionist',
    accountant: 'role-accountant',
  },
  users: {
    owner: 'user-owner',
    dentist: 'user-dentist',
    dentist2: 'user-dentist-2',
    assistant: 'user-assistant',
    receptionist: 'user-receptionist',
    accountant: 'user-accountant',
  },
} as const;

/** Procedures are keyed by code; the mock store needs an `id`, which is the code. */
export type StoredProcedure = Procedure & { id: string };

const ALL: Permission[] = [...PERMISSIONS];

export const SEED_ROLES: Role[] = [
  { id: SEED_IDS.roles.owner, name: 'roles.owner', builtIn: true, locked: true, permissions: ALL },
  {
    id: SEED_IDS.roles.dentist,
    name: 'roles.dentist',
    builtIn: true,
    locked: false,
    permissions: [
      'patient.read',
      'patient.write',
      'appointment.read',
      'appointment.write',
      'appointment.cancel',
      'chart.read',
      'chart.write',
      'plan.read',
      'plan.write',
      'plan.accept',
      'note.read',
      'note.write',
      'document.read',
      'document.write',
      'attachment.read',
      'attachment.write',
      'task.read',
      'task.write',
      'procedure.read',
      'invoice.read',
      'report.production',
      'settings.read',
    ],
  },
  {
    id: SEED_IDS.roles.assistant,
    name: 'roles.assistant',
    builtIn: true,
    locked: false,
    permissions: [
      'patient.read',
      'appointment.read',
      'appointment.write',
      'chart.read',
      'plan.read',
      'note.read',
      'document.read',
      'attachment.read',
      'attachment.write',
      'task.read',
      'task.complete',
      'procedure.read',
    ],
  },
  {
    id: SEED_IDS.roles.receptionist,
    name: 'roles.receptionist',
    builtIn: true,
    locked: false,
    permissions: [
      'patient.read',
      'patient.write',
      'patient.archive',
      'appointment.read',
      'appointment.write',
      'appointment.cancel',
      'appointment.block',
      'plan.read',
      'document.read',
      'attachment.read',
      'attachment.write',
      'task.read',
      'task.complete',
      'procedure.read',
      'invoice.read',
      'invoice.write',
      'payment.write',
      'settings.read',
    ],
  },
  {
    id: SEED_IDS.roles.accountant,
    name: 'roles.accountant',
    builtIn: true,
    locked: false,
    permissions: [
      'patient.read',
      'invoice.read',
      'invoice.write',
      'invoice.void',
      'payment.write',
      'payment.void',
      'report.production',
      'report.export',
      'settings.read',
    ],
  },
];

const DOCTORS: Doctor[] = [
  {
    id: SEED_IDS.doctors.ahmed,
    nameLatin: 'Dr Ahmed Ould Sidi',
    nameArabic: 'د. أحمد ولد سيدي',
    color: '#237A78',
    specialty: 'Omnipratique',
    active: true,
  },
  {
    id: SEED_IDS.doctors.fatimetou,
    nameLatin: 'Dr Fatimetou Mint Brahim',
    nameArabic: 'د. فاطمتو منت إبراهيم',
    color: '#7C6FCD',
    specialty: 'Endodontie',
    active: true,
  },
  {
    id: SEED_IDS.doctors.lemine,
    nameLatin: 'Dr Mohamed Lemine Ould Cheikh',
    nameArabic: 'د. محمد لمين ولد الشيخ',
    color: '#C97D27',
    specialty: 'Chirurgie orale',
    active: true,
  },
];

const CHAIRS: Chair[] = SEED_IDS.chairs.map((id, i) => ({
  id,
  name: `Fauteuil ${i + 1}`,
  order: i + 1,
  active: true,
}));

const USERS: StaffUser[] = [
  {
    id: SEED_IDS.users.owner,
    username: 'ahmed',
    displayName: 'Ahmed Ould Sidi',
    roleId: SEED_IDS.roles.owner,
    doctorId: SEED_IDS.doctors.ahmed,
    active: true,
  },
  {
    id: SEED_IDS.users.dentist,
    username: 'fatimetou',
    displayName: 'Fatimetou Mint Brahim',
    roleId: SEED_IDS.roles.dentist,
    doctorId: SEED_IDS.doctors.fatimetou,
    active: true,
  },
  {
    id: SEED_IDS.users.dentist2,
    username: 'lemine',
    displayName: 'Mohamed Lemine Ould Cheikh',
    roleId: SEED_IDS.roles.dentist,
    doctorId: SEED_IDS.doctors.lemine,
    active: true,
  },
  {
    id: SEED_IDS.users.assistant,
    username: 'salka',
    displayName: 'Salka Mint Moussa',
    roleId: SEED_IDS.roles.assistant,
    doctorId: null,
    active: true,
  },
  {
    id: SEED_IDS.users.receptionist,
    username: 'mariem',
    displayName: 'Mariem Mint Ahmed',
    roleId: SEED_IDS.roles.receptionist,
    doctorId: null,
    active: true,
  },
  {
    id: SEED_IDS.users.accountant,
    username: 'moussa',
    displayName: 'Moussa Ba',
    roleId: SEED_IDS.roles.accountant,
    doctorId: null,
    active: true,
  },
];

const SETTINGS: ClinicSettings = {
  id: 'clinic',
  name: 'Clinique Novodent',
  address: 'Tevragh Zeina, Nouakchott',
  phone: '+22245251010',
  hours: {
    mon: [
      { start: '08:00', end: '13:00' },
      { start: '16:00', end: '20:00' },
    ],
    tue: [
      { start: '08:00', end: '13:00' },
      { start: '16:00', end: '20:00' },
    ],
    wed: [
      { start: '08:00', end: '13:00' },
      { start: '16:00', end: '20:00' },
    ],
    thu: [
      { start: '08:00', end: '13:00' },
      { start: '16:00', end: '20:00' },
    ],
    fri: [{ start: '08:00', end: '12:30' }],
    sat: [{ start: '09:00', end: '14:00' }],
    sun: [],
  },
  slotMinutes: 15,
  currency: 'MRU',
};

// Procedure catalog: French clinical vocabulary first, prices in MRU typical for Nouakchott.
const P = (
  code: string,
  fr: string,
  ar: string,
  en: string,
  category: Procedure['category'],
  price: number,
  minutes: number,
  appliesTo: Procedure['appliesTo'],
): StoredProcedure => ({
  id: code,
  code,
  name: { fr, ar, en },
  category,
  defaultPrice: price,
  durationMinutes: minutes,
  appliesTo,
  active: true,
});

export const SEED_PROCEDURES: StoredProcedure[] = [
  P('CONS', 'Consultation', 'استشارة', 'Consultation', 'diagnostic', 500, 15, 'mouth'),
  P(
    'CONS-URG',
    'Consultation urgence',
    'استشارة طارئة',
    'Emergency consultation',
    'diagnostic',
    1000,
    30,
    'mouth',
  ),
  P(
    'RX-RA',
    'Radiographie retro-alveolaire',
    'أشعة داخل الفم',
    'Periapical radiograph',
    'diagnostic',
    500,
    10,
    'tooth',
  ),
  P(
    'RX-PANO',
    'Radiographie panoramique',
    'أشعة بانورامية',
    'Panoramic radiograph',
    'diagnostic',
    3000,
    15,
    'mouth',
  ),
  P(
    'DETAR',
    'Detartrage et polissage',
    'تنظيف وتلميع الأسنان',
    'Scaling and polishing',
    'preventive',
    3000,
    45,
    'mouth',
  ),
  P(
    'FLUOR',
    'Application de fluor',
    'تطبيق الفلور',
    'Fluoride application',
    'preventive',
    1500,
    15,
    'mouth',
  ),
  P(
    'SCEL',
    'Scellement de sillons',
    'سد الشقوق',
    'Fissure sealant',
    'preventive',
    1500,
    15,
    'tooth',
  ),
  P(
    'BLANCH',
    'Blanchiment au fauteuil',
    'تبييض الأسنان',
    'In-office whitening',
    'preventive',
    15000,
    60,
    'arch',
  ),
  P(
    'COMP-1',
    'Composite 1 face',
    'حشوة تجميلية سطح واحد',
    'Composite, 1 surface',
    'restorative',
    3500,
    30,
    'surface',
  ),
  P(
    'COMP-2',
    'Composite 2 faces',
    'حشوة تجميلية سطحان',
    'Composite, 2 surfaces',
    'restorative',
    4500,
    45,
    'surface',
  ),
  P(
    'COMP-3',
    'Composite 3 faces ou plus',
    'حشوة تجميلية ثلاثة أسطح',
    'Composite, 3+ surfaces',
    'restorative',
    5500,
    45,
    'surface',
  ),
  P('AMAL', 'Amalgame', 'حشوة ملغم', 'Amalgam filling', 'restorative', 3000, 30, 'surface'),
  P(
    'CVI',
    'Ciment verre ionomere',
    'حشوة زجاجية',
    'Glass ionomer filling',
    'restorative',
    2500,
    30,
    'surface',
  ),
  P(
    'INLAY',
    'Inlay-onlay ceramique',
    'حشوة خزفية',
    'Ceramic inlay/onlay',
    'restorative',
    20000,
    60,
    'tooth',
  ),
  P(
    'PANS',
    'Pansement provisoire',
    'حشوة مؤقتة',
    'Temporary dressing',
    'restorative',
    1000,
    15,
    'tooth',
  ),
  P('PULP', 'Pulpotomie', 'بتر اللب', 'Pulpotomy', 'endo', 4000, 30, 'tooth'),
  P(
    'ENDO-1',
    'Traitement endodontique monoradiculee',
    'علاج عصب جذر واحد',
    'Root canal, single root',
    'endo',
    10000,
    60,
    'tooth',
  ),
  P(
    'ENDO-2',
    'Traitement endodontique biradiculee',
    'علاج عصب جذران',
    'Root canal, two roots',
    'endo',
    14000,
    75,
    'tooth',
  ),
  P(
    'ENDO-3',
    'Traitement endodontique pluriradiculee',
    'علاج عصب متعدد الجذور',
    'Root canal, molar',
    'endo',
    18000,
    90,
    'tooth',
  ),
  P(
    'ENDO-RE',
    'Retraitement endodontique',
    'إعادة علاج العصب',
    'Root canal retreatment',
    'endo',
    22000,
    90,
    'tooth',
  ),
  P(
    'SURF',
    'Surfacage radiculaire par quadrant',
    'تجريف الجذور لكل ربع',
    'Root planing per quadrant',
    'perio',
    4000,
    45,
    'arch',
  ),
  P('GINGI', 'Gingivectomie', 'استئصال اللثة', 'Gingivectomy', 'perio', 8000, 45, 'tooth'),
  P('LAMB', 'Lambeau parodontal', 'جراحة اللثة', 'Periodontal flap', 'perio', 15000, 60, 'arch'),
  P('EXT', 'Extraction simple', 'خلع بسيط', 'Simple extraction', 'surgery', 3000, 30, 'tooth'),
  P(
    'EXT-C',
    'Extraction complexe',
    'خلع معقد',
    'Surgical extraction',
    'surgery',
    6000,
    45,
    'tooth',
  ),
  P(
    'EXT-DDS',
    'Extraction dent de sagesse incluse',
    'خلع ضرس العقل المطمور',
    'Impacted wisdom tooth removal',
    'surgery',
    15000,
    60,
    'tooth',
  ),
  P('IMPL', 'Pose d implant', 'زراعة سن', 'Implant placement', 'surgery', 90000, 90, 'tooth'),
  P('GREF', 'Greffe osseuse', 'ترقيع عظمي', 'Bone graft', 'surgery', 40000, 60, 'tooth'),
  P('FREN', 'Frenectomie', 'قطع اللجام', 'Frenectomy', 'surgery', 8000, 30, 'mouth'),
  P(
    'COUR-CM',
    'Couronne ceramo-metallique',
    'تاج خزفي معدني',
    'Porcelain fused to metal crown',
    'prosthetic',
    25000,
    60,
    'tooth',
  ),
  P(
    'COUR-ZR',
    'Couronne zircone',
    'تاج زيركون',
    'Zirconia crown',
    'prosthetic',
    40000,
    60,
    'tooth',
  ),
  P(
    'COUR-IMP',
    'Couronne sur implant',
    'تاج على زرعة',
    'Implant crown',
    'prosthetic',
    45000,
    60,
    'tooth',
  ),
  P('FACET', 'Facette ceramique', 'قشرة خزفية', 'Ceramic veneer', 'prosthetic', 35000, 60, 'tooth'),
  P('BRIDGE', 'Element de bridge', 'عنصر جسر', 'Bridge unit', 'prosthetic', 25000, 60, 'tooth'),
  P('INLAY-CORE', 'Inlay-core', 'دعامة جذرية', 'Post and core', 'prosthetic', 8000, 45, 'tooth'),
  P(
    'PAP',
    'Prothese amovible partielle',
    'طقم جزئي متحرك',
    'Removable partial denture',
    'prosthetic',
    35000,
    60,
    'arch',
  ),
  P(
    'PAC',
    'Prothese amovible complete',
    'طقم كامل',
    'Complete denture',
    'prosthetic',
    60000,
    60,
    'arch',
  ),
  P(
    'REBAS',
    'Rebasage de prothese',
    'تبطين الطقم',
    'Denture reline',
    'prosthetic',
    8000,
    30,
    'arch',
  ),
  P(
    'ORTHO-BILAN',
    'Bilan orthodontique',
    'تقييم تقويم الأسنان',
    'Orthodontic assessment',
    'ortho',
    5000,
    45,
    'mouth',
  ),
  P(
    'ORTHO-FIX',
    'Appareil fixe par arcade',
    'تقويم ثابت لكل فك',
    'Fixed appliance per arch',
    'ortho',
    120000,
    90,
    'arch',
  ),
  P(
    'ORTHO-CTRL',
    'Controle orthodontique',
    'مراجعة تقويم',
    'Orthodontic adjustment',
    'ortho',
    3000,
    20,
    'mouth',
  ),
  P('GOUT', 'Gouttiere occlusale', 'واقي إطباقي', 'Occlusal splint', 'other', 12000, 30, 'arch'),
  P('ORD', 'Prescription', 'وصفة طبية', 'Prescription', 'other', 0, 5, 'mouth'),
  P('CERT', 'Certificat medical', 'شهادة طبية', 'Medical certificate', 'other', 500, 5, 'mouth'),
];

const MALE_FIRST: [string, string][] = [
  ['Mohamed', 'محمد'],
  ['Ahmed', 'أحمد'],
  ['Sidi', 'سيدي'],
  ['Moussa', 'موسى'],
  ['Abdallahi', 'عبد الله'],
  ['Cheikh', 'الشيخ'],
  ['Mahmoud', 'محمود'],
  ['Brahim', 'إبراهيم'],
  ['Yahya', 'يحيى'],
  ['Baba', 'بابا'],
  ['Lemine', 'لمين'],
  ['Hamady', 'حمادي'],
  ['Ousmane', 'عثمان'],
  ['Isselmou', 'إسلمو'],
  ['Mokhtar', 'مختار'],
  ['Abdel Kader', 'عبد القادر'],
  ['Mamadou', 'مامادو'],
  ['Saleck', 'السالك'],
];
const FEMALE_FIRST: [string, string][] = [
  ['Fatimetou', 'فاطمتو'],
  ['Aichetou', 'عيشتو'],
  ['Mariem', 'مريم'],
  ['Khadijetou', 'خديجتو'],
  ['Zeinebou', 'زينبو'],
  ['Salka', 'سالكة'],
  ['Toutou', 'توتو'],
  ['Aminetou', 'أمينتو'],
  ['Lalla', 'لالة'],
  ['Vatma', 'فاطمة'],
  ['Coumba', 'كومبا'],
  ['Khadija', 'خديجة'],
  ['Mounina', 'منينة'],
  ['Selma', 'سلمى'],
  ['Aissata', 'عائشتا'],
  ['Hawa', 'حواء'],
];
const PATRONYMS: [string, string][] = [
  ['Ahmed', 'أحمد'],
  ['Mohamed', 'محمد'],
  ['Sidi', 'سيدي'],
  ['Cheikh', 'الشيخ'],
  ['Brahim', 'إبراهيم'],
  ['Abdallahi', 'عبد الله'],
  ['Moussa', 'موسى'],
  ['Mahmoud', 'محمود'],
  ['Yahya', 'يحيى'],
  ['Lemine', 'لمين'],
  ['Saleh', 'صالح'],
  ['Hamoud', 'حمود'],
  ['El Hacen', 'الحسن'],
];
const FAMILY_NAMES: [string, string][] = [
  ['Sow', 'صو'],
  ['Ba', 'با'],
  ['Diallo', 'ديالو'],
  ['Kane', 'كان'],
  ['Camara', 'كمارا'],
  ['Sy', 'سي'],
  ['Dia', 'ديا'],
  ['Thiam', 'تيام'],
];
const DISTRICTS = [
  'Tevragh Zeina',
  'Ksar',
  'Sebkha',
  'El Mina',
  'Teyarett',
  'Dar Naim',
  'Arafat',
  'Riyadh',
  'Toujounine',
];
const ALERTS: {
  kind: 'allergy' | 'condition' | 'medication';
  label: string;
  severity: 'info' | 'warn' | 'danger';
}[] = [
  { kind: 'allergy', label: 'Penicilline', severity: 'danger' },
  { kind: 'allergy', label: 'Latex', severity: 'warn' },
  { kind: 'condition', label: 'Diabete type 2', severity: 'warn' },
  { kind: 'condition', label: 'Hypertension', severity: 'warn' },
  { kind: 'condition', label: 'Asthme', severity: 'info' },
  { kind: 'medication', label: 'Anticoagulant', severity: 'danger' },
  { kind: 'condition', label: 'Grossesse', severity: 'warn' },
  { kind: 'condition', label: 'Cardiopathie', severity: 'danger' },
];
const REASONS = [
  'Controle',
  'Douleur',
  'Detartrage',
  'Soin carie',
  'Traitement de canal',
  'Extraction',
  'Prothese',
  'Urgence',
  'Suivi',
  'Blanchiment',
];

function toIsoDateLocal(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function buildSeedData(now: Date): SeedData {
  const rnd = new SeededRandom(20261107);
  const today = startOfDay(now);
  const iso = (d: Date) => d.toISOString();
  const daysAgo = (n: number, hour = 10) => {
    const d = addDays(today, -n);
    d.setHours(hour, 0, 0, 0);
    return d;
  };

  // Patients
  const patients: Patient[] = [];
  const PATIENT_COUNT = 60;
  for (let i = 0; i < PATIENT_COUNT; i++) {
    const gender = rnd.chance(0.5) ? 'M' : 'F';
    const [firstLatin, firstArabic] = rnd.pick(gender === 'M' ? MALE_FIRST : FEMALE_FIRST);
    let lastLatin: string;
    let lastArabic: string;
    if (rnd.chance(0.75)) {
      const [pLatin, pArabic] = rnd.pick(PATRONYMS);
      lastLatin = `${gender === 'M' ? 'Ould' : 'Mint'} ${pLatin}`;
      lastArabic = `${gender === 'M' ? 'ولد' : 'منت'} ${pArabic}`;
    } else {
      [lastLatin, lastArabic] = rnd.pick(FAMILY_NAMES);
    }
    const birthYear = now.getFullYear() - rnd.int(5, 75);
    const created = daysAgo(rnd.int(10, 900));
    const eligibleAlerts = ALERTS.filter((a) => gender === 'F' || a.label !== 'Grossesse');
    const alerts = rnd.chance(0.3) ? [{ id: rnd.id(), ...rnd.pick(eligibleAlerts) }] : [];
    if (alerts.length && rnd.chance(0.3)) {
      const rest = eligibleAlerts.filter((a) => a.label !== alerts[0].label);
      alerts.push({ id: rnd.id(), ...rnd.pick(rest) });
    }
    patients.push({
      id: rnd.id(),
      fileNumber: `P-${String(i + 1).padStart(6, '0')}`,
      firstNameLatin: firstLatin,
      lastNameLatin: lastLatin,
      firstNameArabic: firstArabic,
      lastNameArabic: lastArabic,
      gender,
      birthDate: `${birthYear}-${String(rnd.int(1, 12)).padStart(2, '0')}-${String(rnd.int(1, 28)).padStart(2, '0')}`,
      phone: `+222${rnd.pick(['2', '3', '4'])}${rnd.int(1000000, 9999999)}`,
      phone2: null,
      address: rnd.pick(DISTRICTS),
      primaryDoctorId: rnd.chance(0.8) ? rnd.pick(DOCTORS).id : null,
      alerts,
      notes: '',
      archived: i === PATIENT_COUNT - 1,
      createdAt: iso(created),
      updatedAt: iso(created),
    });
  }

  // Appointments: day -30 to +14, each doctor on their own chair, 15-minute grid inside opening hours.
  const appointments: Appointment[] = [];
  const blockedTimes: BlockedTime[] = [];
  const durations = [30, 30, 45, 45, 60, 90];
  for (let offset = -30; offset <= 14; offset++) {
    const day = addDays(today, offset);
    const ranges = hoursFor(SETTINGS.hours, day);
    if (ranges.length === 0) continue;
    DOCTORS.forEach((doctor, di) => {
      if (rnd.chance(0.08)) return; // doctor absent that day
      for (const range of ranges) {
        let cursor = parseHm(range.start);
        const end = parseHm(range.end);
        while (cursor + 30 <= end) {
          if (rnd.chance(0.3)) {
            cursor += 15 * rnd.int(1, 3);
            continue;
          }
          const duration = Math.min(rnd.pick(durations), end - cursor);
          if (duration < 15) break;
          const start = new Date(day);
          start.setHours(Math.floor(cursor / 60), cursor % 60, 0, 0);
          const finish = new Date(start.getTime() + duration * 60_000);
          let status: AppointmentStatus;
          if (offset < 0)
            status = rnd.chance(0.82) ? 'done' : rnd.chance(0.5) ? 'no-show' : 'cancelled';
          else if (offset === 0) {
            const nowMin = now.getHours() * 60 + now.getMinutes();
            if (cursor + duration <= nowMin) status = rnd.chance(0.9) ? 'done' : 'no-show';
            else if (cursor <= nowMin) status = 'in-chair';
            else if (cursor <= nowMin + 45) status = rnd.chance(0.6) ? 'arrived' : 'confirmed';
            else status = rnd.chance(0.5) ? 'confirmed' : 'scheduled';
          } else status = rnd.chance(0.4) ? 'confirmed' : 'scheduled';
          const patient = rnd.pick(patients.filter((p) => !p.archived));
          appointments.push({
            id: rnd.id(),
            patientId: patient.id,
            doctorId: doctor.id,
            chairId: CHAIRS[di].id,
            start: iso(start),
            end: iso(finish),
            status,
            reason: rnd.pick(REASONS),
            note: null,
            createdBy: SEED_IDS.users.receptionist,
            createdAt: iso(daysAgo(Math.max(1, -offset + rnd.int(1, 10)))),
            updatedAt: iso(day),
          });
          cursor += duration + (rnd.chance(0.5) ? 0 : 15);
        }
      }
    });
  }
  // A blocked slot: staff meeting next Tuesday 13:00-14:00 for everyone, and a half-day off for one doctor.
  {
    const nextTue = addDays(today, (2 - today.getDay() + 7) % 7 || 7);
    const s = new Date(nextTue);
    s.setHours(13, 0, 0, 0);
    const e = new Date(nextTue);
    e.setHours(14, 0, 0, 0);
    blockedTimes.push({
      id: rnd.id(),
      doctorId: null,
      chairId: null,
      start: iso(s),
      end: iso(e),
      reason: 'Reunion d equipe',
    });
    const off = addDays(today, 3);
    const os = new Date(off);
    os.setHours(16, 0, 0, 0);
    const oe = new Date(off);
    oe.setHours(20, 0, 0, 0);
    blockedTimes.push({
      id: rnd.id(),
      doctorId: SEED_IDS.doctors.lemine,
      chairId: null,
      start: iso(os),
      end: iso(oe),
      reason: 'Formation',
    });
  }

  // Chart entries and treatment plans for the first 35 patients.
  const chartEntries: ChartEntry[] = [];
  const plans: TreatmentPlan[] = [];
  const notes: ClinicalNote[] = [];
  const posteriors = [16, 17, 26, 27, 36, 37, 46, 47, 14, 15, 24, 25, 34, 35, 44, 45];
  const anteriors = [11, 12, 13, 21, 22, 23, 31, 32, 33, 41, 42, 43];
  const existingConditions: ToothCondition[] = [
    'filling',
    'filling',
    'caries',
    'crown',
    'root-canal',
    'missing',
  ];
  const surfaceSets: Surface[][] = [['O'], ['O'], ['M', 'O'], ['D', 'O'], ['M', 'O', 'D'], ['B']];
  const byCode = new Map(SEED_PROCEDURES.map((p) => [p.code, p]));

  for (let i = 0; i < 35; i++) {
    const patient = patients[i];
    const doctorId = patient.primaryDoctorId ?? SEED_IDS.doctors.ahmed;
    const usedTeeth = new Set<number>();
    const entryCount = rnd.int(1, 5);
    for (let k = 0; k < entryCount; k++) {
      const condition = rnd.pick(existingConditions);
      const tooth = rnd.pick(posteriors);
      if (usedTeeth.has(tooth)) continue;
      usedTeeth.add(tooth);
      const whole = condition === 'crown' || condition === 'root-canal' || condition === 'missing';
      chartEntries.push({
        id: rnd.id(),
        patientId: patient.id,
        toothFdi: tooth,
        surfaces: whole ? [] : rnd.pick(surfaceSets),
        kind: 'condition',
        condition,
        procedureCode: null,
        status: 'existing',
        doctorId,
        recordedAt: iso(daysAgo(rnd.int(20, 400))),
        planItemId: null,
        note: null,
        voided: false,
      });
    }

    if (i < 12) {
      // One treatment plan with two phases; early items completed and later ones planned.
      const planId = rnd.id();
      const createdAt = daysAgo(rnd.int(15, 60));
      const itemsPhase1: PlanItem[] = [];
      const itemsPhase2: PlanItem[] = [];
      const t1 = rnd.pick(posteriors.filter((t) => !usedTeeth.has(t)));
      const t2 = rnd.pick(anteriors);
      const t3 = rnd.pick(posteriors.filter((t) => t !== t1 && !usedTeeth.has(t)));
      const mk = (
        procedureCode: string,
        toothFdi: number | null,
        surfaces: Surface[],
        status: PlanItem['status'],
        completedDaysAgo: number | null,
      ): PlanItem => {
        const proc = byCode.get(procedureCode)!;
        const item: PlanItem = {
          id: rnd.id(),
          procedureCode,
          toothFdi,
          surfaces,
          doctorId,
          price: proc.defaultPrice,
          status,
          completedAt: completedDaysAgo !== null ? iso(daysAgo(completedDaysAgo)) : null,
          chartEntryId: null,
          invoiceLineId: null,
        };
        if (status === 'completed' && toothFdi !== null) {
          const entry: ChartEntry = {
            id: rnd.id(),
            patientId: patient.id,
            toothFdi,
            surfaces,
            kind: 'procedure',
            condition: procedureCode.startsWith('EXT')
              ? 'missing'
              : procedureCode.startsWith('COUR')
                ? 'crown'
                : procedureCode.startsWith('ENDO')
                  ? 'root-canal'
                  : 'filling',
            procedureCode,
            status: 'completed',
            doctorId,
            recordedAt: item.completedAt!,
            planItemId: item.id,
            note: null,
            voided: false,
          };
          chartEntries.push(entry);
          item.chartEntryId = entry.id;
        } else if (status === 'planned' && toothFdi !== null) {
          const entry: ChartEntry = {
            id: rnd.id(),
            patientId: patient.id,
            toothFdi,
            surfaces,
            kind: 'procedure',
            condition: null,
            procedureCode,
            status: 'planned',
            doctorId,
            recordedAt: iso(createdAt),
            planItemId: item.id,
            note: null,
            voided: false,
          };
          chartEntries.push(entry);
          item.chartEntryId = entry.id;
        }
        return item;
      };
      itemsPhase1.push(mk('DETAR', null, [], 'completed', rnd.int(8, 14)));
      itemsPhase1.push(
        mk(
          'COMP-2',
          t1,
          ['M', 'O'],
          i % 3 === 0 ? 'planned' : 'completed',
          i % 3 === 0 ? null : rnd.int(3, 8),
        ),
      );
      itemsPhase2.push(
        mk(i % 2 === 0 ? 'ENDO-3' : 'COMP-1', t3, i % 2 === 0 ? [] : ['O'], 'planned', null),
      );
      if (i % 4 === 0) itemsPhase2.push(mk('COUR-ZR', t2, [], 'planned', null));
      plans.push({
        id: planId,
        patientId: patient.id,
        title: i % 2 === 0 ? 'Plan de soins' : 'Rehabilitation',
        status: i % 5 === 0 ? 'proposed' : 'accepted',
        phases: [
          { id: rnd.id(), title: 'Phase 1', order: 1, items: itemsPhase1 },
          { id: rnd.id(), title: 'Phase 2', order: 2, items: itemsPhase2 },
        ],
        acceptedAt: i % 5 === 0 ? null : iso(createdAt),
        createdBy: USERS.find((u) => u.doctorId === doctorId)?.id ?? SEED_IDS.users.owner,
        createdAt: iso(createdAt),
        updatedAt: iso(createdAt),
      });

      notes.push({
        id: rnd.id(),
        patientId: patient.id,
        doctorId,
        body: rnd.pick([
          'Patient se plaint de sensibilite au froid sur le secteur postérieur droit. Test de vitalite positif.',
          'Controle post-operatoire: cicatrisation normale, pas de douleur. Revoir dans 15 jours.',
          'Hygiene a ameliorer. Conseils de brossage donnes. Detartrage effectue.',
          'Douleur spontanee nocturne sur 36. Radio: lesion periapicale. Traitement endodontique indique.',
        ]),
        createdAt: iso(daysAgo(rnd.int(2, 30))),
        updatedAt: iso(daysAgo(rnd.int(0, 2))),
      });
    }
  }

  // Invoices from completed plan items (first 10 plans), with partial payments.
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  const year = now.getFullYear();
  let invoiceSeq = 0;
  const methods: PaymentMethod[] = ['cash', 'cash', 'bankily', 'masrvi', 'bank-transfer', 'sedad'];
  for (const plan of plans.slice(0, 10)) {
    const completed = plan.phases
      .flatMap((ph) => ph.items)
      .filter((it) => it.status === 'completed');
    if (completed.length === 0) continue;
    const invoiceId = rnd.id();
    const lines: InvoiceLine[] = completed.map((it) => {
      const proc = byCode.get(it.procedureCode)!;
      const line: InvoiceLine = {
        id: rnd.id(),
        planItemId: it.id,
        procedureCode: it.procedureCode,
        description: proc.name.fr,
        toothFdi: it.toothFdi,
        doctorId: it.doctorId,
        quantity: 1,
        unitPrice: it.price,
        amount: it.price,
      };
      it.invoiceLineId = line.id;
      return line;
    });
    const total = lines.reduce((s, l) => s + l.amount, 0);
    const issuedAt = daysAgo(rnd.int(1, 10), 11);
    const payPattern = rnd.int(0, 3); // 0 unpaid, 1 partial, 2 paid in one, 3 paid in two
    let paid = 0;
    if (payPattern === 1) {
      const amount = Math.round(total * rnd.pick([0.3, 0.5]));
      payments.push({
        id: rnd.id(),
        invoiceId,
        amount,
        method: rnd.pick(methods),
        paidAt: iso(issuedAt),
        reference: null,
        receivedBy: SEED_IDS.users.receptionist,
        voided: false,
      });
      paid = amount;
    } else if (payPattern === 2) {
      payments.push({
        id: rnd.id(),
        invoiceId,
        amount: total,
        method: rnd.pick(methods),
        paidAt: iso(issuedAt),
        reference: null,
        receivedBy: SEED_IDS.users.receptionist,
        voided: false,
      });
      paid = total;
    } else if (payPattern === 3) {
      const first = Math.round(total / 2);
      payments.push({
        id: rnd.id(),
        invoiceId,
        amount: first,
        method: 'cash',
        paidAt: iso(issuedAt),
        reference: null,
        receivedBy: SEED_IDS.users.receptionist,
        voided: false,
      });
      payments.push({
        id: rnd.id(),
        invoiceId,
        amount: total - first,
        method: 'bankily',
        paidAt: iso(addDays(issuedAt, 3)),
        reference: `BK${rnd.int(100000, 999999)}`,
        receivedBy: SEED_IDS.users.accountant,
        voided: false,
      });
      paid = total;
    }
    invoiceSeq += 1;
    invoices.push({
      id: invoiceId,
      number: `INV-${year}-${String(invoiceSeq).padStart(4, '0')}`,
      patientId: plan.patientId,
      issuedAt: iso(issuedAt),
      dueAt: null,
      lines,
      total,
      paid,
      status: statusFor(total, paid, false),
      voidedAt: null,
      voidReason: null,
      voidedBy: null,
      createdBy: SEED_IDS.users.receptionist,
    });
  }

  // Prescriptions and certificates for a few patients with plans.
  // Open requests for the reception and a few appointment messages.
  const tasks: Task[] = [];
  const messages: AppointmentMessage[] = [];
  for (const plan of plans.slice(0, 3)) {
    const doctorId = plan.phases[0]?.items[0]?.doctorId ?? SEED_IDS.doctors.ahmed;
    const author = USERS.find((u) => u.doctorId === doctorId)?.id ?? SEED_IDS.users.owner;
    tasks.push({
      id: rnd.id(),
      patientId: plan.patientId,
      appointmentId: null,
      kind: 'schedule-followup',
      details: 'Controle apres traitement de canal.',
      durationMinutes: 30,
      delayDays: 15,
      createdBy: author,
      createdByName: USERS.find((u) => u.id === author)?.displayName ?? '',
      createdAt: iso(daysAgo(rnd.int(0, 3), 12)),
      status: 'open',
      doneBy: null,
      doneAt: null,
    });
  }
  tasks.push({
    id: rnd.id(),
    patientId: plans[3]?.patientId ?? patients[0].id,
    appointmentId: null,
    kind: 'invoice',
    details: 'Facturer les actes realises ce jour.',
    durationMinutes: null,
    delayDays: null,
    createdBy: SEED_IDS.users.dentist,
    createdByName: 'Fatimetou Mint Brahim',
    createdAt: iso(daysAgo(1, 17)),
    status: 'open',
    doneBy: null,
    doneAt: null,
  });
  for (const a of appointments.filter((x) => x.status === 'done').slice(0, 4)) {
    messages.push({
      id: rnd.id(),
      appointmentId: a.id,
      patientId: a.patientId,
      authorId: SEED_IDS.users.receptionist,
      authorName: 'Mariem Mint Ahmed',
      body: rnd.pick([
        'Patient presse, a un autre rendez-vous a 12h.',
        'Souhaite discuter du devis avant de commencer.',
        'N a pas regle la derniere facture.',
      ]),
      createdAt: a.start,
    });
  }

  const documents: ClinicalDocument[] = [];
  for (const plan of plans.slice(0, 6)) {
    const doctorId = plan.phases[0]?.items[0]?.doctorId ?? SEED_IDS.doctors.ahmed;
    const issued = daysAgo(rnd.int(1, 12), 11);
    documents.push({
      id: rnd.id(),
      patientId: plan.patientId,
      doctorId,
      kind: 'prescription',
      certificateType: null,
      days: null,
      fromDate: null,
      body: rnd.pick([
        'Amoxicilline 1 g : 1 comprime matin et soir pendant 6 jours.\nParacetamol 1 g : 1 comprime toutes les 6 heures si douleur, maximum 4 par jour.',
        'Ibuprofene 400 mg : 1 comprime 3 fois par jour pendant 3 jours, au cours des repas.\nBain de bouche chlorhexidine 0,12 % : 2 fois par jour pendant 7 jours, apres le brossage.',
        'Metronidazole 500 mg : 1 comprime 3 fois par jour pendant 7 jours.\nParacetamol 1 g : 1 comprime toutes les 6 heures si douleur.',
      ]),
      issuedAt: iso(issued),
    });
    if (rnd.chance(0.5)) {
      const from = toIsoDateLocal(addDays(issued, 0));
      documents.push({
        id: rnd.id(),
        patientId: plan.patientId,
        doctorId,
        kind: 'certificate',
        certificateType: 'sick-leave',
        days: 2,
        fromDate: from,
        body: 'Je soussigne(e), chirurgien-dentiste, certifie avoir examine ce jour le patient et que son etat de sante necessite un arret de travail de 2 jours a compter de ce jour, sauf complications.',
        issuedAt: iso(issued),
      });
    }
  }

  return {
    collections: {
      patients,
      clinicalNotes: notes,
      doctors: DOCTORS,
      chairs: CHAIRS,
      staffUsers: USERS,
      roles: SEED_ROLES,
      clinicSettings: [SETTINGS],
      appointments,
      blockedTimes,
      procedures: SEED_PROCEDURES,
      chartEntries,
      treatmentPlans: plans,
      invoices,
      payments,
      documents,
      attachments: [],
      tasks,
      messages,
    },
    counters: { patientFile: PATIENT_COUNT, [`invoice-${year}`]: invoiceSeq },
  };
}
