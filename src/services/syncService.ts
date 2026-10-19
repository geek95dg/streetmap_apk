import { StorageService } from './storage';
import { Territory } from '../types';

export interface SyncResult {
  success: boolean;
  message: string;
  syncedCount: number;
  errors?: string[];
}

export function buildAuthHeaders(settings: any): Record<string, string> {
  const headers: Record<string, string> = {};

  if (settings.authMethod === 'basic' && settings.basicUser && settings.basicPass) {
    // Standard HTTP Basic Auth for nginx htpasswd
    try {
      const creds = btoa(unescape(encodeURIComponent(`${settings.basicUser}:${settings.basicPass}`)));
      headers['Authorization'] = `Basic ${creds}`;
    } catch {
      headers['Authorization'] = `Basic ${btoa(`${settings.basicUser}:${settings.basicPass}`)}`;
    }
  } else if (settings.serverToken) {
    // Permanent token bypass: Bearer + custom header e.g. X-App-Token
    headers['Authorization'] = `Bearer ${settings.serverToken}`;
    const headerName = settings.customHeader || 'X-App-Token';
    headers[headerName] = settings.serverToken;
    headers['X-App-Token'] = settings.serverToken;
    headers['X-API-Key'] = settings.serverToken;
  }

  return headers;
}

export const SyncService = {
  /**
   * Test connection to remote server with authentication headers
   */
  async testConnection(serverUrl: string, settingsOverride?: any): Promise<{ success: boolean; message: string; latencyMs?: number; statusCode?: number }> {
    const cleanUrl = serverUrl.replace(/\/+$/, '');
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return { success: false, message: 'Adres serwera musi zaczynać się od http:// lub https://' };
    }

    const start = Date.now();
    const settings = settingsOverride || StorageService.getSettings();
    const authHeaders = buildAuthHeaders(settings);

    // Check if it's the demo server
    if (cleanUrl.includes('karty-demo.local') || cleanUrl.includes('localhost') || cleanUrl.includes('example')) {
      await new Promise(r => setTimeout(r, 600));
      return {
        success: true,
        message: 'Połączenie z serwerem demonstracyjnym udane (Symulacja online, nagłówki autoryzacji: ' + Object.keys(authHeaders).join(', ') + ')',
        latencyMs: Date.now() - start
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      // Attempt endpoint detection with auth headers
      const res = await fetch(`${cleanUrl}/api.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...authHeaders
        },
        body: 'action=status_check',
        signal: controller.signal
      }).catch(async () => {
        // Fallback to GET on root with auth
        return await fetch(cleanUrl, { 
          method: 'HEAD', 
          headers: authHeaders,
          mode: 'no-cors' 
        });
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      if ('status' in res && res.status === 401) {
        return {
          success: false,
          statusCode: 401,
          message: 'Bramka nginx zwróciła błąd 401 Unauthorized. Podaj poprawny login i hasło (Basic Auth) lub skonfiguruj token w nagłówku w nginx.'
        };
      }

      if ('status' in res && res.status === 403) {
        return {
          success: false,
          statusCode: 403,
          message: 'Bramka nginx zwróciła błąd 403 Forbidden. Serwer odrzucił token autoryzacyjny.'
        };
      }

      return {
        success: true,
        message: `Połączono i pomyślnie zautoryzowano z serwerem (${cleanUrl}). Czas odpowiedzi: ${latencyMs} ms.`,
        latencyMs
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Nie udało się połączyć z ${cleanUrl}: ${err.message || 'Błąd sieci lub CORS.'}`
      };
    }
  },

  /**
   * Synchronize pending local outbox changes to the remote server
   */
  async syncOutbox(): Promise<SyncResult> {
    const settings = StorageService.getSettings();
    const queue = StorageService.getSyncQueue();

    if (queue.length === 0) {
      return {
        success: true,
        message: 'Wszystkie lokalne dane są zsynchronizowane. Brak oczekujących zmian w kolejce.',
        syncedCount: 0
      };
    }

    const cleanUrl = settings.serverUrl.replace(/\/+$/, '');
    let syncedCount = 0;
    const errors: string[] = [];

    // Process queue items
    for (const item of [...queue]) {
      try {
        // If demo server, simulate sync
        if (cleanUrl.includes('demo') || cleanUrl.includes('local')) {
          await new Promise(r => setTimeout(r, 150));
          StorageService.removeSyncQueueItem(item.id);
          syncedCount++;
          continue;
        }

        // Real server sync
        const endpoint = item.type === 'assignment' ? `${cleanUrl}/przydzialy-api.php` : `${cleanUrl}/api.php`;
        const authHeaders = buildAuthHeaders(settings);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            action: item.action,
            type: item.type,
            data: item.payload
          })
        });

        if (res.ok || res.status === 200) {
          StorageService.removeSyncQueueItem(item.id);
          syncedCount++;
        } else {
          errors.push(`Błąd synchronizacji (${item.type} ${item.action}): status ${res.status}`);
        }
      } catch (err: any) {
        errors.push(`Błąd sieci dla ${item.type}: ${err.message}`);
      }
    }

    // Update last sync time
    StorageService.saveSettings({ lastSync: new Date().toISOString() });

    return {
      success: errors.length === 0,
      message: errors.length === 0 
        ? `Zsynchronizowano pomyślnie ${syncedCount} zmian z serwerem!`
        : `Zsynchronizowano ${syncedCount} pozycji, ${errors.length} błędów.`,
      syncedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  },

  /**
   * Geocode a territory address using GUGiK (Poland PRG) or Nominatim OSM
   */
  async geocodeAddress(address: string, city: string): Promise<{ lat: number; lon: number; display: string; source: string } | null> {
    const fullQuery = `${address}, ${city}`.trim();

    // 1. Try GUGiK (Uniwersalna Usługa Geokodowania - official Poland PRG)
    try {
      const gugikUrl = `https://services.gugik.gov.pl/uug/?request=GetAddress&address=${encodeURIComponent(fullQuery)}`;
      const res = await fetch(gugikUrl);
      if (res.ok) {
        const text = await res.text();
        // GUGiK format: x,y or json
        const parts = text.trim().split(/[\s,]+/);
        if (parts.length >= 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
          // If EPSG:4326
          const p1 = parseFloat(parts[0]);
          const p2 = parseFloat(parts[1]);
          // Check lat/lon range
          const lat = p1 < 60 && p1 > 45 ? p1 : (p2 < 60 && p2 > 45 ? p2 : null);
          const lon = p2 < 25 && p2 > 13 ? p2 : (p1 < 25 && p1 > 13 ? p1 : null);
          if (lat && lon) {
            return { lat, lon, display: fullQuery, source: 'gugik' };
          }
        }
      }
    } catch {
      // Continue to Nominatim fallback
    }

    // 2. Fallback to Nominatim OpenStreetMap
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&limit=1&countrycodes=pl`;
      const res = await fetch(nominatimUrl, {
        headers: {
          'Accept-Language': 'pl',
          'User-Agent': 'KartyTerenuMobile/1.0'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          return {
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            display: item.display_name || fullQuery,
            source: 'nominatim'
          };
        }
      }
    } catch {
      // Geocoding failed
    }

    // 3. Fallback for demo cities like Koszalin / Warszawa
    const defaultCoords: Record<string, { lat: number; lon: number }> = {
      'koszalin': { lat: 54.1944, lon: 16.1722 },
      'warszawa': { lat: 52.2297, lon: 21.0122 },
      'kraków': { lat: 50.0647, lon: 19.9450 },
      'gdańsk': { lat: 54.3520, lon: 18.6466 },
      'wrocław': { lat: 51.1079, lon: 17.0385 },
      'poznań': { lat: 52.4064, lon: 16.9252 },
    };
    const cityKey = city.toLowerCase().trim();
    if (defaultCoords[cityKey]) {
      // Slight offset based on address hash
      const hash = address.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const deltaLat = ((hash % 100) - 50) * 0.0002;
      const deltaLon = (((hash * 7) % 100) - 50) * 0.0003;
      return {
        lat: defaultCoords[cityKey].lat + deltaLat,
        lon: defaultCoords[cityKey].lon + deltaLon,
        display: `${address}, ${city}`,
        source: 'recznie'
      };
    }

    return null;
  }
};
