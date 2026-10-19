import { Territory, AddressEntry, Assignment, NzAddress, AppSettings, SyncQueueItem } from '../types';

const STORAGE_KEYS = {
  TERRITORIES: 'kt_territories_v1',
  ENTRIES: 'kt_entries_v1',
  ASSIGNMENTS: 'kt_assignments_v1',
  NZ: 'kt_nz_v1',
  SETTINGS: 'kt_settings_v1',
  SYNC_QUEUE: 'kt_sync_queue_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  serverUrl: 'https://karty-demo.local',
  authMethod: 'token',
  serverToken: '',
  basicUser: '',
  basicPass: '',
  customHeader: 'X-App-Token',
  defaultCity: 'Koszalin',
  mapSource: 'osm',
  geoapifyKey: '',
  wmsUrl: 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution',
  wmsLayers: 'Raster',
  autoSync: false,
  lastSync: null,
  storageMode: 'local_first',
  notificationsEnabled: true,
  notificationThresholdMonths: 4,
  lastNotificationDate: null,
};

const INITIAL_TERRITORIES: Territory[] = [
  {
    id: 't-1',
    nr: '1',
    address: 'Mickiewicza 12',
    city: 'Koszalin',
    lat: 54.1944,
    lon: 16.1722,
    zoom: 17,
    display: 'Adama Mickiewicza 12, Koszalin',
    geo_src: 'gugik',
    pos: 1,
    shape: JSON.stringify({
      kind: 'area',
      points: [
        [54.1950, 16.1710],
        [54.1952, 16.1735],
        [54.1938, 16.1738],
        [54.1936, 16.1712],
      ]
    }),
    shape_src: 'manual',
    addr_notes: '(bloki 12-16)',
    color_edge: '1',
    updated_at: new Date().toISOString(),
  },
  {
    id: 't-2',
    nr: '2',
    address: 'Cicha 1',
    city: 'Koszalin',
    lat: 54.1882,
    lon: 16.1850,
    zoom: 17,
    display: 'Cicha 1, Koszalin',
    geo_src: 'gugik',
    pos: 2,
    shape: JSON.stringify({
      kind: 'line',
      points: [
        [54.1878, 16.1840],
        [54.1888, 16.1862],
      ]
    }),
    shape_src: 'street',
    addr_notes: '',
    color_edge: '1',
    updated_at: new Date().toISOString(),
  },
  {
    id: 't-3',
    nr: '3',
    address: 'Ujejskiego 1',
    city: 'Koszalin',
    lat: 54.1920,
    lon: 16.1910,
    zoom: 17,
    display: 'Kornela Ujejskiego 1, Koszalin',
    geo_src: 'gugik',
    pos: 3,
    shape: null,
    shape_src: 'auto',
    addr_extra: 'Kossaka 12',
    addr_notes: '(1-40)',
    color_edge: '0',
    updated_at: new Date().toISOString(),
  },
  {
    id: 't-4',
    nr: '4',
    address: 'Koszalińska 92',
    city: 'Koszalin',
    lat: 54.2010,
    lon: 16.1650,
    zoom: 16,
    display: 'Koszalińska 92, Koszalin',
    geo_src: 'gugik',
    pos: 4,
    shape: null,
    shape_src: '',
    addr_notes: '',
    color_edge: '1',
    updated_at: new Date().toISOString(),
  },
  {
    id: 't-5',
    nr: '5',
    address: 'Zwycięstwa 100',
    city: 'Koszalin',
    lat: null,
    lon: null,
    zoom: 17,
    display: '',
    geo_src: '',
    pos: 5,
    shape: null,
    shape_src: '',
    addr_notes: '',
    color_edge: '',
    updated_at: new Date().toISOString(),
  }
];

const INITIAL_ENTRIES: AddressEntry[] = [
  { id: 'e-1', territory_id: 't-1', territory_nr: '1', full_address: 'Mickiewicza 12/1', unit: '1', entry_date: '12.01.2025', pos: 1 },
  { id: 'e-2', territory_id: 't-1', territory_nr: '1', full_address: 'Mickiewicza 12/2', unit: '2', entry_date: '12.01.2025', pos: 2 },
  { id: 'e-3', territory_id: 't-1', territory_nr: '1', full_address: 'Mickiewicza 12/3', unit: '3', entry_date: '15.02.2025', pos: 3 },
  { id: 'e-4', territory_id: 't-1', territory_nr: '1', full_address: 'Mickiewicza 12/4', unit: '4', entry_date: '', pos: 4 },
  { id: 'e-5', territory_id: 't-2', territory_nr: '2', full_address: 'Cicha 1/1', unit: '1', entry_date: '10.10.2024', pos: 1 },
  { id: 'e-6', territory_id: 't-2', territory_nr: '2', full_address: 'Cicha 1/2', unit: '2', entry_date: '10.10.2024', pos: 2 },
  { id: 'e-7', territory_id: 't-3', territory_nr: '3', full_address: 'Ujejskiego 1/1', unit: '1', entry_date: '', pos: 1 },
];

const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: 'a-1',
    territory_nr: '1',
    person: 'Jan Kowalski',
    assigned_on: '2025-01-10',
    completed_on: '2025-03-01',
    note: 'Opracowano cały rewir',
    created_at: '2025-01-10T08:00:00Z',
    updated_at: '2025-03-01T12:00:00Z',
  },
  {
    id: 'a-2',
    territory_nr: '1',
    person: 'Piotr Nowak',
    assigned_on: '2025-03-15',
    completed_on: null,
    note: 'W trakcie opracowania',
    created_at: '2025-03-15T09:00:00Z',
    updated_at: '2025-03-15T09:00:00Z',
  },
  {
    id: 'a-3',
    territory_nr: '2',
    person: 'Anna Wiśniewska',
    assigned_on: '2024-11-01',
    completed_on: '2024-12-20',
    note: '',
    created_at: '2024-11-01T10:00:00Z',
    updated_at: '2024-12-20T10:00:00Z',
  },
  {
    id: 'a-4',
    territory_nr: '3',
    person: 'Marek Kamiński',
    assigned_on: '2024-09-15',
    completed_on: null,
    note: 'Przetrzymany teren > 4 m-ce',
    created_at: '2024-09-15T11:00:00Z',
    updated_at: '2024-09-15T11:00:00Z',
  }
];

const INITIAL_NZ: NzAddress[] = [
  {
    id: 'nz-1',
    territory_nr: '1',
    street: 'Mickiewicza',
    address: 'Mickiewicza 12 m. 3',
    nz_date: '2024-05-10',
    note: 'Wyraźna prośba o brak wizyt (właściciel)',
    created_at: '2024-05-10T14:00:00Z',
  },
  {
    id: 'nz-2',
    territory_nr: '2',
    street: 'Cicha',
    address: 'Cicha 1 m. 2',
    nz_date: '2024-08-22',
    note: 'Pies na klatce, nie wchodzić',
    created_at: '2024-08-22T10:00:00Z',
  }
];

function readItem<T>(key: string, defaultValue: T): T {
  try {
    const val = localStorage.getItem(key);
    if (!val) return defaultValue;
    return JSON.parse(val);
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return defaultValue;
  }
}

function writeItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

export const StorageService = {
  // --- SETTINGS ---
  getSettings(): AppSettings {
    const stored = readItem<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...stored };
  },

  saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    writeItem(STORAGE_KEYS.SETTINGS, updated);
    return updated;
  },

  // --- TERRITORIES ---
  getTerritories(): Territory[] {
    const data = readItem<Territory[]>(STORAGE_KEYS.TERRITORIES, []);
    if (data.length === 0) {
      this.saveTerritories(INITIAL_TERRITORIES);
      return INITIAL_TERRITORIES;
    }
    return data;
  },

  saveTerritories(territories: Territory[]): void {
    writeItem(STORAGE_KEYS.TERRITORIES, territories);
  },

  saveTerritory(territory: Territory): Territory {
    const all = this.getTerritories();
    const idx = all.findIndex(t => t.id === territory.id || t.nr === territory.nr);
    let updated: Territory;
    if (idx >= 0) {
      updated = { ...all[idx], ...territory, updated_at: new Date().toISOString() };
      all[idx] = updated;
    } else {
      updated = {
        ...territory,
        id: territory.id || 't-' + Date.now(),
        updated_at: new Date().toISOString()
      };
      all.push(updated);
    }
    this.saveTerritories(all);
    this.queueSync('territory', idx >= 0 ? 'update' : 'create', updated);
    return updated;
  },

  deleteTerritory(id: string): void {
    const all = this.getTerritories();
    const item = all.find(t => t.id === id);
    const filtered = all.filter(t => t.id !== id);
    this.saveTerritories(filtered);
    if (item) {
      this.queueSync('territory', 'delete', item);
    }
  },

  // --- ADDRESS ENTRIES (REWERS) ---
  getEntries(): AddressEntry[] {
    const data = readItem<AddressEntry[]>(STORAGE_KEYS.ENTRIES, []);
    if (data.length === 0) {
      this.saveEntries(INITIAL_ENTRIES);
      return INITIAL_ENTRIES;
    }
    return data;
  },

  saveEntries(entries: AddressEntry[]): void {
    writeItem(STORAGE_KEYS.ENTRIES, entries);
  },

  getEntriesForTerritory(territoryId: string, territoryNr?: string): AddressEntry[] {
    const all = this.getEntries();
    return all.filter(e => e.territory_id === territoryId || (territoryNr && e.territory_nr === territoryNr));
  },

  saveEntry(entry: AddressEntry): AddressEntry {
    const all = this.getEntries();
    const idx = all.findIndex(e => e.id === entry.id);
    let updated: AddressEntry;
    if (idx >= 0) {
      updated = { ...all[idx], ...entry };
      all[idx] = updated;
    } else {
      updated = { ...entry, id: entry.id || 'e-' + Date.now() };
      all.push(updated);
    }
    this.saveEntries(all);
    this.queueSync('entry', idx >= 0 ? 'update' : 'create', updated);
    return updated;
  },

  deleteEntry(id: string): void {
    const all = this.getEntries();
    const item = all.find(e => e.id === id);
    const filtered = all.filter(e => e.id !== id);
    this.saveEntries(filtered);
    if (item) {
      this.queueSync('entry', 'delete', item);
    }
  },

  // --- ASSIGNMENTS (S-13) ---
  getAssignments(): Assignment[] {
    const data = readItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, []);
    if (data.length === 0) {
      this.saveAssignments(INITIAL_ASSIGNMENTS);
      return INITIAL_ASSIGNMENTS;
    }
    return data;
  },

  saveAssignments(assignments: Assignment[]): void {
    writeItem(STORAGE_KEYS.ASSIGNMENTS, assignments);
  },

  saveAssignment(assignment: Partial<Assignment> & { territory_nr: string; person: string }): Assignment {
    const all = this.getAssignments();
    const now = new Date().toISOString();
    let updated: Assignment;

    if (assignment.id) {
      const idx = all.findIndex(a => a.id === assignment.id);
      if (idx >= 0) {
        updated = { ...all[idx], ...assignment, updated_at: now } as Assignment;
        all[idx] = updated;
      } else {
        updated = {
          id: assignment.id,
          territory_nr: assignment.territory_nr,
          person: assignment.person,
          assigned_on: assignment.assigned_on || now.slice(0, 10),
          completed_on: assignment.completed_on ?? null,
          note: assignment.note || '',
          created_at: now,
          updated_at: now,
        };
        all.push(updated);
      }
    } else {
      updated = {
        id: 'a-' + Date.now(),
        territory_nr: assignment.territory_nr,
        person: assignment.person,
        assigned_on: assignment.assigned_on || now.slice(0, 10),
        completed_on: assignment.completed_on ?? null,
        note: assignment.note || '',
        created_at: now,
        updated_at: now,
      };
      all.push(updated);
    }

    this.saveAssignments(all);
    this.queueSync('assignment', assignment.id ? 'update' : 'create', updated);
    return updated;
  },

  completeAssignment(id: string, completedOn: string, keepWithPublisher = false): void {
    const all = this.getAssignments();
    const idx = all.findIndex(a => a.id === id);
    if (idx === -1) return;

    const current = all[idx];
    const now = new Date().toISOString();
    current.completed_on = completedOn;
    current.updated_at = now;

    if (keepWithPublisher) {
      // Create new continuing assignment for publisher
      const nextAssignedOn = completedOn;
      const nextAssignment: Assignment = {
        id: 'a-' + (Date.now() + 1),
        territory_nr: current.territory_nr,
        person: current.person,
        assigned_on: nextAssignedOn,
        completed_on: null,
        note: 'Kolejny odcinek po opracowaniu',
        created_at: now,
        updated_at: now,
      };
      all.push(nextAssignment);
      this.queueSync('assignment', 'create', nextAssignment);
    }

    this.saveAssignments(all);
    this.queueSync('assignment', 'update', current);
  },

  returnAssignment(id: string, returnedOn?: string): void {
    const all = this.getAssignments();
    const idx = all.findIndex(a => a.id === id);
    if (idx === -1) return;

    const current = all[idx];
    const dateStr = returnedOn || new Date().toISOString().slice(0, 10);
    current.completed_on = dateStr;
    current.updated_at = new Date().toISOString();
    this.saveAssignments(all);
    this.queueSync('assignment', 'update', current);
  },

  deleteAssignment(id: string): void {
    const all = this.getAssignments();
    const item = all.find(a => a.id === id);
    const filtered = all.filter(a => a.id !== id);
    this.saveAssignments(filtered);
    if (item) {
      this.queueSync('assignment', 'delete', item);
    }
  },

  // --- NZ ADDRESSES (NIE ŻYCZĄ SOBIE) ---
  getNzAddresses(): NzAddress[] {
    const data = readItem<NzAddress[]>(STORAGE_KEYS.NZ, []);
    if (data.length === 0) {
      this.saveNzAddresses(INITIAL_NZ);
      return INITIAL_NZ;
    }
    return data;
  },

  saveNzAddresses(list: NzAddress[]): void {
    writeItem(STORAGE_KEYS.NZ, list);
  },

  saveNzAddress(nz: Partial<NzAddress> & { address: string }): NzAddress {
    const all = this.getNzAddresses();
    let updated: NzAddress;
    const now = new Date().toISOString();

    if (nz.id) {
      const idx = all.findIndex(n => n.id === nz.id);
      if (idx >= 0) {
        updated = { ...all[idx], ...nz } as NzAddress;
        all[idx] = updated;
      } else {
        updated = {
          id: nz.id,
          territory_nr: nz.territory_nr || '',
          street: nz.street || '',
          address: nz.address,
          nz_date: nz.nz_date || now.slice(0, 10),
          note: nz.note || '',
          created_at: now,
        };
        all.push(updated);
      }
    } else {
      updated = {
        id: 'nz-' + Date.now(),
        territory_nr: nz.territory_nr || '',
        street: nz.street || '',
        address: nz.address,
        nz_date: nz.nz_date || now.slice(0, 10),
        note: nz.note || '',
        created_at: now,
      };
      all.push(updated);
    }

    this.saveNzAddresses(all);
    this.queueSync('nz', nz.id ? 'update' : 'create', updated);
    return updated;
  },

  deleteNzAddress(id: string): void {
    const all = this.getNzAddresses();
    const item = all.find(n => n.id === id);
    const filtered = all.filter(n => n.id !== id);
    this.saveNzAddresses(filtered);
    if (item) {
      this.queueSync('nz', 'delete', item);
    }
  },

  // --- OUTBOX / SYNC QUEUE ---
  getSyncQueue(): SyncQueueItem[] {
    return readItem<SyncQueueItem[]>(STORAGE_KEYS.SYNC_QUEUE, []);
  },

  queueSync(type: SyncQueueItem['type'], action: SyncQueueItem['action'], payload: any): void {
    const queue = this.getSyncQueue();
    queue.push({
      id: 'sync-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      type,
      action,
      payload,
      createdAt: Date.now(),
      attempts: 0,
    });
    writeItem(STORAGE_KEYS.SYNC_QUEUE, queue);
  },

  clearSyncQueue(): void {
    writeItem(STORAGE_KEYS.SYNC_QUEUE, []);
  },

  removeSyncQueueItem(id: string): void {
    const queue = this.getSyncQueue().filter(q => q.id !== id);
    writeItem(STORAGE_KEYS.SYNC_QUEUE, queue);
  },

  // --- EXPORT / IMPORT ALL DATA ---
  exportAllData() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      territories: this.getTerritories(),
      entries: this.getEntries(),
      assignments: this.getAssignments(),
      nz: this.getNzAddresses(),
      settings: this.getSettings(),
    };
  },

  importAllData(dump: any): boolean {
    if (!dump || typeof dump !== 'object') return false;
    if (Array.isArray(dump.territories)) this.saveTerritories(dump.territories);
    if (Array.isArray(dump.entries)) this.saveEntries(dump.entries);
    if (Array.isArray(dump.assignments)) this.saveAssignments(dump.assignments);
    if (Array.isArray(dump.nz)) this.saveNzAddresses(dump.nz);
    if (dump.settings) this.saveSettings(dump.settings);
    return true;
  },

  resetDemoData(): void {
    this.saveTerritories(INITIAL_TERRITORIES);
    this.saveEntries(INITIAL_ENTRIES);
    this.saveAssignments(INITIAL_ASSIGNMENTS);
    this.saveNzAddresses(INITIAL_NZ);
    this.clearSyncQueue();
  }
};
