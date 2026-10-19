import React, { useState, useEffect } from 'react';
import { ActiveTab, Territory } from './types';
import { StorageService } from './services/storage';
import { TerritoriesTab } from './components/TerritoriesTab';
import { AssignmentsTab } from './components/AssignmentsTab';
import { NzTab } from './components/NzTab';
import { ImportExportTab } from './components/ImportExportTab';
import { SettingsTab } from './components/SettingsTab';
import { PWAInstallButton } from './components/PWAInstallButton';
import { 
  Map, Users, ShieldAlert, FileSpreadsheet, Settings, 
  Wifi, WifiOff, RefreshCw, Smartphone
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tereny');
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);

  const refreshData = () => {
    setTerritories(StorageService.getTerritories());
    setQueueCount(StorageService.getSyncQueue().length);
  };

  useEffect(() => {
    refreshData();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900 pb-20 select-none">
      
      {/* Top Mobile App Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md safe-top">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-black text-white shadow-md shadow-blue-500/20">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight">Karty Terenu</h1>
                <span className="rounded-md bg-blue-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-blue-200 border border-blue-700/50">
                  Android Mobile
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Druk S-12-P i S-13</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Online / Offline indicator */}
            <div 
              title={isOnline ? 'Połączono z siecią' : 'Praca w trybie offline (dane zapisywane na telefonie)'}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                isOnline ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px]">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px]">Offline</span>
                </>
              )}
            </div>

            {/* Outbox Badge if pending sync */}
            {queueCount > 0 && (
              <button
                onClick={() => setActiveTab('ustawienia')}
                className="flex items-center gap-1 rounded-full bg-blue-600/80 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-blue-600"
                title={`${queueCount} zmian czeka na wysłanie na serwer`}
              >
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>{queueCount}</span>
              </button>
            )}

            {/* PWA Install Button */}
            <PWAInstallButton compact />
          </div>
        </div>

        {/* Offline notification banner if offline */}
        {!isOnline && (
          <div className="bg-amber-600 px-4 py-1 text-center text-[11px] font-medium text-white shadow-xs">
            Tryb offline — wszystkie zmiany zapisują się w pamięci telefonu i zsynchronizują po powrocie zasięgu.
          </div>
        )}
      </header>

      {/* Main View Area */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-3 py-3">
        {activeTab === 'tereny' && (
          <TerritoriesTab territories={territories} onRefresh={refreshData} />
        )}
        {activeTab === 'przydzialy' && (
          <AssignmentsTab territories={territories} onRefresh={refreshData} />
        )}
        {activeTab === 'nz' && (
          <NzTab territories={territories} onRefresh={refreshData} />
        )}
        {activeTab === 'import_export' && (
          <ImportExportTab onRefresh={refreshData} />
        )}
        {activeTab === 'ustawienia' && (
          <SettingsTab onRefresh={refreshData} />
        )}
      </main>

      {/* Mobile Android Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-lg safe-bottom">
        <div className="mx-auto grid max-w-2xl grid-cols-5 py-1">
          
          <button
            onClick={() => setActiveTab('tereny')}
            className={`flex flex-col items-center justify-center py-1.5 transition active:scale-95 ${
              activeTab === 'tereny' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${activeTab === 'tereny' ? 'bg-blue-50' : ''}`}>
              <Map className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">Tereny</span>
          </button>

          <button
            onClick={() => setActiveTab('przydzialy')}
            className={`flex flex-col items-center justify-center py-1.5 transition active:scale-95 ${
              activeTab === 'przydzialy' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${activeTab === 'przydzialy' ? 'bg-blue-50' : ''}`}>
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">Przydziały</span>
          </button>

          <button
            onClick={() => setActiveTab('nz')}
            className={`flex flex-col items-center justify-center py-1.5 transition active:scale-95 ${
              activeTab === 'nz' ? 'text-rose-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${activeTab === 'nz' ? 'bg-rose-50' : ''}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">NŻ</span>
          </button>

          <button
            onClick={() => setActiveTab('import_export')}
            className={`flex flex-col items-center justify-center py-1.5 transition active:scale-95 ${
              activeTab === 'import_export' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${activeTab === 'import_export' ? 'bg-blue-50' : ''}`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">Listy</span>
          </button>

          <button
            onClick={() => setActiveTab('ustawienia')}
            className={`flex flex-col items-center justify-center py-1.5 transition active:scale-95 relative ${
              activeTab === 'ustawienia' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-xl transition ${activeTab === 'ustawienia' ? 'bg-blue-50' : ''}`}>
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">Serwer</span>
            {queueCount > 0 && (
              <span className="absolute top-1 right-3 h-2 w-2 rounded-full bg-blue-600" />
            )}
          </button>

        </div>
      </nav>

    </div>
  );
}
