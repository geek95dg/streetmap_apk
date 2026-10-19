import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { FileText, Download, Upload, RotateCcw, Check, AlertCircle, Copy } from 'lucide-react';

interface ImportExportTabProps {
  onRefresh: () => void;
}

export const ImportExportTab: React.FC<ImportExportTabProps> = ({ onRefresh }) => {
  const [mainList, setMainList] = useState('');
  const [subList, setSubList] = useState('');
  const [city, setCity] = useState(StorageService.getSettings().defaultCity);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Parse lists matching original index.php logic
  const handleParseLists = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainList.trim()) {
      setImportStatus('Wklej przynajmniej Listę 1 (adresy terenów).');
      return;
    }

    const lines = mainList.split('\n').map(l => l.trim()).filter(Boolean);
    const existing = StorageService.getTerritories();
    const newTerritories = [...existing];
    let addedCount = 0;

    lines.forEach((line, idx) => {
      // Format: adres ; numer ; opcjonalne miasto
      const parts = line.split(';').map(p => p.trim());
      const addr = parts[0];
      const nr = parts[1] || String(newTerritories.length + 1);
      const customCity = parts[2] || city;

      // Extract notes in parentheses or apostrophes e.g. Ujejskiego 1 (1-40)
      const noteMatch = addr.match(/\((.*?)\)|'(.*?)'/);
      const note = noteMatch ? (noteMatch[1] || noteMatch[2] || '') : '';
      const cleanAddr = addr.replace(/\((.*?)\)|'(.*?)'/, '').trim();

      const existingIdx = newTerritories.findIndex(t => t.nr === nr || t.address === cleanAddr);
      if (existingIdx === -1) {
        newTerritories.push({
          id: 't-' + Date.now() + '-' + idx,
          nr,
          address: cleanAddr,
          city: customCity,
          lat: null,
          lon: null,
          zoom: 17,
          addr_notes: note ? `(${note})` : '',
          color_edge: '1',
          updated_at: new Date().toISOString()
        });
        addedCount++;
      }
    });

    StorageService.saveTerritories(newTerritories);

    // Parse sub list (entries for card back)
    if (subList.trim()) {
      const subLines = subList.split('\n').map(l => l.trim()).filter(Boolean);
      const currentEntries = StorageService.getEntries();
      let entriesCount = 0;

      subLines.forEach((sLine, sIdx) => {
        // e.g. "Cicha 1/2 12.12.2024" or "Mickiewicza 12 m. 1 10.01.2025"
        const tokens = sLine.split(/\s{2,}|\t/);
        const fullAddr = tokens[0] || sLine;
        const entryDate = tokens[1] || '';

        // Match with territory
        const matchedTerritory = newTerritories.find(t => 
          fullAddr.toLowerCase().startsWith(t.address.toLowerCase())
        );

        // Extract unit/flat number
        const unitMatch = fullAddr.match(/[/m.]\s*([0-9a-zA-Z]+)$/);
        const unit = unitMatch ? unitMatch[1] : '';

        currentEntries.push({
          id: 'e-' + Date.now() + '-' + sIdx,
          territory_id: matchedTerritory ? matchedTerritory.id : '',
          territory_nr: matchedTerritory ? matchedTerritory.nr : '',
          full_address: fullAddr,
          unit,
          entry_date: entryDate,
          pos: currentEntries.length + 1
        });
        entriesCount++;
      });

      StorageService.saveEntries(currentEntries);
    }

    setImportStatus(`Wczytano pomyślnie ${addedCount} nowych terenów do bazy telefonu!`);
    setMainList('');
    setSubList('');
    onRefresh();
  };

  const handleExportJson = () => {
    const data = StorageService.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `karty-terenu-kopia-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (StorageService.importAllData(json)) {
          alert('Baza danych telefonu została pomyślnie przywrócona z pliku kopii!');
          onRefresh();
        } else {
          alert('Nieprawidłowy format pliku JSON');
        }
      } catch (err) {
        alert('Błąd odczytu pliku JSON');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    if (confirm('Przywrócić demonstracyjny zestaw danych terenów i przydziałów?')) {
      StorageService.resetDemoData();
      onRefresh();
    }
  };

  return (
    <div className="space-y-5">
      {/* List Import Accordion */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3 mb-3">
          <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Wczytaj listy tekstowe</h3>
            <p className="text-xs text-slate-500">Format zgodny z drukiem S-12-P i S-13</p>
          </div>
        </div>

        {importStatus && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium">
            {importStatus}
          </div>
        )}

        <form onSubmit={handleParseLists} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lista 1 — adres i numer terenu:
            </label>
            <textarea
              rows={3}
              value={mainList}
              onChange={e => setMainList(e.target.value)}
              placeholder="Cicha 1 ; 12&#10;Ujejskiego 1 + Kossaka 12 ; 13&#10;Mickiewicza 12 (bloki 1-4) ; 14"
              className="w-full rounded-xl border border-slate-300 p-3 text-xs font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Jeden teren w wierszu: <code>adres ; numer</code>
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lista 2 — adresy na rewers karty (opcjonalna):
            </label>
            <textarea
              rows={3}
              value={subList}
              onChange={e => setSubList(e.target.value)}
              placeholder="Cicha 1/1   12.12.2024&#10;Cicha 1/2   10.01.2025&#10;Mickiewicza 12 m. 3"
              className="w-full rounded-xl border border-slate-300 p-3 text-xs font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Domyślna miejscowość:</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-98 transition"
          >
            Zapisz listy w telefonie
          </button>
        </form>
      </div>

      {/* Backup and Restore */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Kopia zapasowa i przenoszenie danych</h3>
        <p className="text-xs text-slate-500">
          Możesz pobrać pełną kopię wszystkich kart, wykazów, przydziałów S-13 i NŻ zapisanych w pamięci telefonu w formacie JSON.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Pobierz kopię JSON</span>
          </button>

          <label className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Wgraj z pliku</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>

        <button
          type="button"
          onClick={handleResetDemo}
          className="w-full flex items-center justify-center gap-1.5 pt-2 text-[11px] text-slate-400 hover:text-slate-600"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Przywróć przykładowe dane demonstracyjne</span>
        </button>
      </div>
    </div>
  );
};
