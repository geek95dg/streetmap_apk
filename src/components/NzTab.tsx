import React, { useState } from 'react';
import { NzAddress, Territory } from '../types';
import { StorageService } from '../services/storage';
import { ShieldAlert, Plus, Search, Trash2, Calendar, MapPin, AlertCircle } from 'lucide-react';

interface NzTabProps {
  territories: Territory[];
  onRefresh: () => void;
}

export const NzTab: React.FC<NzTabProps> = ({ territories, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New NZ form
  const [territoryNr, setTerritoryNr] = useState('');
  const [address, setAddress] = useState('');
  const [street, setStreet] = useState('');
  const [note, setNote] = useState('');
  const [nzDate, setNzDate] = useState(new Date().toISOString().slice(0, 10));

  const nzList = StorageService.getNzAddresses();

  const filtered = nzList.filter(n => {
    return (
      n.address.toLowerCase().includes(search.toLowerCase()) ||
      n.street.toLowerCase().includes(search.toLowerCase()) ||
      n.territory_nr.toLowerCase().includes(search.toLowerCase()) ||
      n.note.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleAddNz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    StorageService.saveNzAddress({
      territory_nr: territoryNr.trim(),
      street: street.trim(),
      address: address.trim(),
      nz_date: nzDate,
      note: note.trim(),
    });

    setShowAddModal(false);
    setTerritoryNr('');
    setAddress('');
    setStreet('');
    setNote('');
    onRefresh();
  };

  const handleDelete = (id: string, addr: string) => {
    if (confirm(`Usunąć adres NŻ: ${addr}?`)) {
      StorageService.deleteNzAddress(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-rose-100 p-2 text-rose-700">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-900">Lista NŻ (Nie życzą sobie)</h3>
            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
              Adresy, pod którymi mieszkańcy poprosili o brak odwiedzin. Lista zapisuje się bezpośrednio na telefonie i ostrzega przy odpowiednich terenach.
            </p>
          </div>
        </div>
      </div>

      {/* Search & Add */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj adresu NŻ..."
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Dodaj NŻ</span>
        </button>
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 text-sm">
            Brak wpisów na liście NŻ
          </div>
        ) : (
          filtered.map(item => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-start justify-between gap-3 hover:shadow-md transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.territory_nr && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-bold text-xs">
                      Teren {item.territory_nr}
                    </span>
                  )}
                  <h4 className="font-bold text-slate-900 text-sm">{item.address}</h4>
                </div>

                {item.note && (
                  <p className="text-xs text-rose-700 font-medium">
                    Uwaga: {item.note}
                  </p>
                )}

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Zgłoszono: {item.nz_date || 'brak daty'}</span>
                </div>
              </div>

              <button
                onClick={() => handleDelete(item.id, item.address)}
                className="rounded-xl p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                title="Usuń wpis NŻ"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-4">Dodaj adres NŻ</h3>
            <form onSubmit={handleAddNz} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Numer terenu (jeśli znany):
                </label>
                <select
                  value={territoryNr}
                  onChange={e => setTerritoryNr(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Wybierz teren lub zostaw puste...</option>
                  {territories.map(t => (
                    <option key={t.id} value={t.nr}>
                      Teren {t.nr} — {t.address}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dokładny adres (np. Mickiewicza 12 m. 3):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ulica, numer domu i lokalu"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data zgłoszenia:
                </label>
                <input
                  type="date"
                  value={nzDate}
                  onChange={e => setNzDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notatka / powód:
                </label>
                <input
                  type="text"
                  placeholder="Np. wyraźna prośba, agresywny pies, itp."
                  value={note}
                  onChange={e => setNote(e.target.value)}
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
                  className="w-1/2 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700"
                >
                  Zapisz NŻ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
