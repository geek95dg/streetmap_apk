import React, { useState } from 'react';
import { Territory, AddressEntry, Assignment } from '../types';
import { StorageService } from '../services/storage';
import { SyncService } from '../services/syncService';
import { TerritoryMap } from './TerritoryMap';
import { CardS12Preview } from './CardS12Preview';
import { AssignmentModal } from './AssignmentModal';
import { 
  Search, Plus, MapPin, Eye, UserPlus, Navigation, 
  Sparkles, CheckCircle2, AlertCircle, RefreshCw, Edit3, Trash2
} from 'lucide-react';

interface TerritoriesTabProps {
  territories: Territory[];
  onRefresh: () => void;
}

export const TerritoriesTab: React.FC<TerritoriesTabProps> = ({ territories, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'no_geo' | 'ready'>('all');
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null);
  const [previewCard, setPreviewCard] = useState<Territory | null>(null);
  const [assignTerritory, setAssignTerritory] = useState<Territory | null>(null);
  const [isGeocodingAll, setIsGeocodingAll] = useState(false);
  const [geoProgress, setGeoProgress] = useState<{ current: number; total: number } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New territory form state
  const [newNr, setNewNr] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState(StorageService.getSettings().defaultCity);
  const [newNotes, setNewNotes] = useState('');

  const assignments = StorageService.getAssignments();
  const entries = StorageService.getEntries();
  const nzList = StorageService.getNzAddresses();

  // Filtered territories
  const filtered = territories.filter(t => {
    const matchesSearch = 
      t.nr.toLowerCase().includes(search.toLowerCase()) ||
      t.address.toLowerCase().includes(search.toLowerCase()) ||
      t.city.toLowerCase().includes(search.toLowerCase()) ||
      (t.addr_notes && t.addr_notes.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filter === 'no_geo') return !t.lat;
    if (filter === 'ready') return !!t.lat;
    return true;
  });

  const missingGeoCount = territories.filter(t => !t.lat).length;

  const handleGeocodeSingle = async (t: Territory) => {
    const res = await SyncService.geocodeAddress(t.address, t.city);
    if (res) {
      StorageService.saveTerritory({
        ...t,
        lat: res.lat,
        lon: res.lon,
        display: res.display,
        geo_src: res.source,
      });
      onRefresh();
    } else {
      alert(`Nie udało się znaleźć adresu: ${t.address}, ${t.city}`);
    }
  };

  const handleGeocodeAllMissing = async () => {
    const missing = territories.filter(t => !t.lat);
    if (missing.length === 0) return;

    setIsGeocodingAll(true);
    setGeoProgress({ current: 0, total: missing.length });

    for (let i = 0; i < missing.length; i++) {
      const t = missing[i];
      setGeoProgress({ current: i + 1, total: missing.length });
      const res = await SyncService.geocodeAddress(t.address, t.city);
      if (res) {
        StorageService.saveTerritory({
          ...t,
          lat: res.lat,
          lon: res.lon,
          display: res.display,
          geo_src: res.source,
        });
      }
      // Throttling for external geocoder policy
      await new Promise(r => setTimeout(r, 600));
    }

    setIsGeocodingAll(false);
    setGeoProgress(null);
    onRefresh();
  };

  const handleAddTerritory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim()) return;

    const territory = StorageService.saveTerritory({
      id: 't-' + Date.now(),
      nr: newNr.trim() || String(territories.length + 1),
      address: newAddress.trim(),
      city: newCity.trim(),
      lat: null,
      lon: null,
      zoom: 17,
      addr_notes: newNotes.trim(),
      shape: null,
      shape_src: '',
      color_edge: '1',
    });

    // Attempt geocoding right away in background
    SyncService.geocodeAddress(territory.address, territory.city).then(geo => {
      if (geo) {
        StorageService.saveTerritory({
          ...territory,
          lat: geo.lat,
          lon: geo.lon,
          display: geo.display,
          geo_src: geo.source,
        });
        onRefresh();
      }
    });

    setShowAddModal(false);
    setNewNr('');
    setNewAddress('');
    setNewNotes('');
    onRefresh();
  };

  const handleDeleteTerritory = (t: Territory) => {
    if (confirm(`Czy na pewno usunąć teren nr ${t.nr} (${t.address})?`)) {
      StorageService.deleteTerritory(t.id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col gap-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj terenu po numerze, ulicy..."
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Filter chips & Add button */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-full font-medium transition ${
                filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Wszystkie ({territories.length})
            </button>
            <button
              onClick={() => setFilter('ready')}
              className={`px-3 py-1.5 rounded-full font-medium transition ${
                filter === 'ready' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              Z mapą ({territories.filter(t => t.lat).length})
            </button>
            {missingGeoCount > 0 && (
              <button
                onClick={() => setFilter('no_geo')}
                className={`px-3 py-1.5 rounded-full font-medium transition ${
                  filter === 'no_geo' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Bez współrzędnych ({missingGeoCount})
              </button>
            )}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nowy teren</span>
          </button>
        </div>
      </div>

      {/* Missing geocoding batch banner */}
      {missingGeoCount > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-amber-900 block">{missingGeoCount} terenów bez współrzędnych</span>
              <span className="text-amber-700">Geokoder wyszuka ich położenie w GUGiK/OSM.</span>
            </div>
          </div>
          <button
            onClick={handleGeocodeAllMissing}
            disabled={isGeocodingAll}
            className="flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50 shrink-0"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGeocodingAll ? 'animate-spin' : ''}`} />
            <span>{isGeocodingAll ? `${geoProgress?.current}/${geoProgress?.total}` : 'Geokoduj'}</span>
          </button>
        </div>
      )}

      {/* Territories List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <MapPin className="mx-auto w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Brak terenów spełniających kryteria</p>
            <p className="text-xs text-slate-500 mt-1">Dodaj nowy teren lub wczytaj listę w zakładce Import.</p>
          </div>
        ) : (
          filtered.map(territory => {
            const currentAssignment = assignments.find(
              a => a.territory_nr === territory.nr && a.completed_on === null
            );
            const territoryEntries = entries.filter(e => e.territory_id === territory.id || e.territory_nr === territory.nr);
            const territoryNz = nzList.filter(n => n.territory_nr === territory.nr);
            const history = assignments.filter(a => a.territory_nr === territory.nr);

            return (
              <div
                key={territory.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:shadow-md"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-bold text-white text-base shadow-xs">
                      {territory.nr}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm leading-snug">
                          {territory.address}
                        </h3>
                        {territory.addr_notes && (
                          <span className="text-xs font-medium text-slate-500">
                            {territory.addr_notes}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{territory.city}</p>
                    </div>
                  </div>

                  {/* S-13 status badge */}
                  <div>
                    {currentAssignment ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                        {currentAssignment.person}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                        Wolny
                      </span>
                    )}
                  </div>
                </div>

                {/* Map thumbnail if geocoded */}
                {territory.lat && (
                  <div className="mt-3">
                    <TerritoryMap territory={territory} interactive={false} zoomControl={false} className="h-32 w-full rounded-xl" />
                  </div>
                )}

                {/* Badges / Stats line */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                  {territory.lat ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{territory.geo_src || 'Geokodowano'}</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleGeocodeSingle(territory)}
                      className="inline-flex items-center gap-1 text-amber-700 font-bold hover:underline"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Geokoduj teraz</span>
                    </button>
                  )}

                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600 font-medium">
                    {territoryEntries.length} lokali w wykazie
                  </span>

                  {territoryNz.length > 0 && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                        <span>{territoryNz.length} NŻ</span>
                      </span>
                    </>
                  )}
                </div>

                {/* Bottom Action Buttons (Touch Friendly) */}
                <div className="mt-3.5 grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                  {/* Preview Card Button */}
                  <button
                    onClick={() => setPreviewCard(territory)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>Karta S-12</span>
                  </button>

                  {/* Assign Button */}
                  <button
                    onClick={() => setAssignTerritory(territory)}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 active:scale-95"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>{currentAssignment ? 'Obsłuż' : 'Przydziel'}</span>
                  </button>

                  {/* Navigate in Maps / Google Maps */}
                  <a
                    href={territory.lat ? `https://www.google.com/maps/search/?api=1&query=${territory.lat},${territory.lon}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${territory.address}, ${territory.city}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95"
                  >
                    <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Nawiguj</span>
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Card Preview Modal */}
      {previewCard && (
        <CardS12Preview
          territory={previewCard}
          entries={StorageService.getEntriesForTerritory(previewCard.id, previewCard.nr)}
          onClose={() => setPreviewCard(null)}
        />
      )}

      {/* Assignment Modal */}
      {assignTerritory && (
        <AssignmentModal
          territory={assignTerritory}
          currentAssignment={assignments.find(a => a.territory_nr === assignTerritory.nr && a.completed_on === null)}
          history={assignments.filter(a => a.territory_nr === assignTerritory.nr)}
          onClose={() => setAssignTerritory(null)}
          onSaved={onRefresh}
        />
      )}

      {/* Add Territory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-4">Dodaj nowy teren</h3>
            <form onSubmit={handleAddTerritory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Numer terenu:</label>
                <input
                  type="text"
                  placeholder="Np. 12"
                  value={newNr}
                  onChange={e => setNewNr(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adres główny (ulica i numer):</label>
                <input
                  type="text"
                  required
                  placeholder="Np. Cicha 1"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Miejscowość:</label>
                <input
                  type="text"
                  required
                  value={newCity}
                  onChange={e => setNewCity(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dopisek na kartę (opcjonalny):</label>
                <input
                  type="text"
                  placeholder="Np. (bloki 1-5)"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-1/2 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
                >
                  Dodaj i zapisz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
