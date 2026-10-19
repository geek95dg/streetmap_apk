export interface Territory {
  id: string;
  nr: string;
  address: string;
  city: string;
  lat: number | null;
  lon: number | null;
  zoom: number;
  display?: string;
  geo_src?: string;
  pos?: number;
  shape?: string | null; // JSON string or descriptor
  shape_src?: string;
  addr_extra?: string | null;
  addr_notes?: string | null;
  addr_key?: string;
  color_edge?: string;
  updated_at?: string;
}

export interface AddressEntry {
  id: string;
  territory_id: string;
  territory_nr?: string;
  full_address: string;
  unit: string;
  entry_date: string;
  pos: number;
}

export interface Assignment {
  id: string;
  territory_nr: string;
  person: string;
  assigned_on: string; // YYYY-MM-DD
  completed_on: string | null; // YYYY-MM-DD or null
  note: string;
  created_at: string;
  updated_at: string;
}

export interface NzAddress {
  id: string;
  territory_nr: string;
  street: string;
  address: string;
  nz_date: string | null;
  note: string;
  created_at: string;
}

export interface AppSettings {
  serverUrl: string;
  authMethod: 'none' | 'token' | 'basic';
  serverToken: string;
  basicUser?: string;
  basicPass?: string;
  customHeader?: string;
  defaultCity: string;
  mapSource: 'osm' | 'geoapify' | 'wms';
  geoapifyKey: string;
  wmsUrl: string;
  wmsLayers: string;
  autoSync: boolean;
  lastSync: string | null;
  storageMode: 'local_first' | 'online_only';
}

export interface SyncQueueItem {
  id: string;
  type: 'assignment' | 'territory' | 'entry' | 'nz';
  action: 'create' | 'update' | 'delete';
  payload: any;
  createdAt: number;
  attempts: number;
  error?: string;
}

export type ActiveTab = 'tereny' | 'przydzialy' | 'nz' | 'import_export' | 'ustawienia';
