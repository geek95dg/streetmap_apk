import React, { useState } from 'react';
import { Territory, AddressEntry } from '../types';
import { TerritoryMap } from './TerritoryMap';
import { Printer, MapPin, Calendar, FileText, ArrowLeftRight } from 'lucide-react';

interface CardS12PreviewProps {
  territory: Territory;
  entries: AddressEntry[];
  onClose: () => void;
}

export const CardS12Preview: React.FC<CardS12PreviewProps> = ({ territory, entries, onClose }) => {
  const [side, setSide] = useState<'awers' | 'rewers'>('awers');

  // Split entries into two columns for the back of the card
  const mid = Math.ceil(entries.length / 2);
  const col1 = entries.slice(0, Math.max(mid, 10));
  const col2 = entries.slice(Math.max(mid, 10));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-md">
      {/* Top Mobile Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
          <div>
            <h2 className="text-sm font-semibold">Karta terenu nr {territory.nr}</h2>
            <p className="text-[11px] text-slate-400">{territory.address}, {territory.city}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Flip Side Toggle */}
          <div className="flex rounded-lg bg-slate-800 p-0.5 text-xs">
            <button
              onClick={() => setSide('awers')}
              className={`rounded-md px-3 py-1 font-medium transition ${
                side === 'awers' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              Awers
            </button>
            <button
              onClick={() => setSide('rewers')}
              className={`rounded-md px-3 py-1 font-medium transition ${
                side === 'rewers' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              Rewers
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
            title="Drukuj kartę"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Drukuj</span>
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
        {/* Card Canvas: 146mm x 94.44mm aspect ratio ~ 1.545 */}
        <div className="w-full max-w-xl aspect-[146/94.44] bg-white text-slate-900 rounded-xl shadow-2xl p-5 border border-slate-300 flex flex-col justify-between select-text relative">
          
          {side === 'awers' ? (
            /* --- AWERS (FRONT) --- */
            <>
              {/* Header */}
              <div className="text-center border-b pb-2 border-slate-200">
                <h1 className="text-base font-bold uppercase tracking-wider font-serif">Karta Terenu</h1>
                <div className="flex justify-between items-center mt-1 text-xs font-serif">
                  <div>
                    <span className="font-semibold text-slate-600">Miejscowość:</span>{' '}
                    <span className="font-bold underline decoration-dotted decoration-1">{territory.city}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-600">Teren nr:</span>
                    <span className="inline-block px-2.5 py-0.5 rounded bg-slate-900 text-white font-bold font-sans text-xs">
                      {territory.nr}
                    </span>
                  </div>
                </div>
              </div>

              {/* Map Box */}
              <div className="my-2 flex-1 relative rounded-lg border border-slate-300 overflow-hidden min-h-[140px]">
                <TerritoryMap territory={territory} className="h-full w-full" interactive={false} zoomControl={false} />
                <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-medium shadow-xs text-slate-800">
                  📍 {territory.address} {territory.addr_notes}
                </div>
              </div>

              {/* Footer text */}
              <div className="flex justify-between items-end text-[9px] text-slate-500 font-serif pt-1 border-t border-slate-200">
                <span className="italic">Prosimy przechowywać kartę w czystości i nie zaginać.</span>
                <span className="font-bold tracking-widest text-[8px]">S-12-P 6/72</span>
              </div>
            </>
          ) : (
            /* --- REWERS (BACK) --- */
            <>
              {/* Back Header */}
              <div className="flex justify-between items-center border-b pb-1.5 border-slate-200 text-xs">
                <div>
                  <span className="font-serif font-semibold text-slate-600">Teren nr:</span>{' '}
                  <span className="font-bold text-slate-900">{territory.nr}</span>
                  <span className="text-slate-400 mx-2">|</span>
                  <span className="font-serif text-slate-600">{territory.address}</span>
                </div>
                <div className="text-[10px] font-medium text-slate-500">
                  Wykaz lokali i daty
                </div>
              </div>

              {/* Two Column Address Tables */}
              <div className="my-2 flex-1 grid grid-cols-2 gap-3 overflow-hidden text-[11px]">
                {/* Column 1 */}
                <div className="border border-slate-200 rounded overflow-hidden flex flex-col">
                  <div className="grid grid-cols-[1fr_40px_70px] bg-slate-100 font-bold px-2 py-1 text-[10px] border-b border-slate-200">
                    <span>Adres</span>
                    <span className="text-center">Lok.</span>
                    <span className="text-right">Data</span>
                  </div>
                  <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                    {col1.length > 0 ? col1.map((e, idx) => (
                      <div key={e.id || idx} className="grid grid-cols-[1fr_40px_70px] px-2 py-1 items-center">
                        <span className="truncate">{e.full_address}</span>
                        <span className="text-center font-mono">{e.unit || '—'}</span>
                        <span className="text-right font-mono text-[10px] text-slate-600">{e.entry_date || '......'}</span>
                      </div>
                    )) : (
                      <div className="p-3 text-center text-slate-400 text-[10px] italic">Brak pozycji</div>
                    )}
                  </div>
                </div>

                {/* Column 2 */}
                <div className="border border-slate-200 rounded overflow-hidden flex flex-col">
                  <div className="grid grid-cols-[1fr_40px_70px] bg-slate-100 font-bold px-2 py-1 text-[10px] border-b border-slate-200">
                    <span>Adres</span>
                    <span className="text-center">Lok.</span>
                    <span className="text-right">Data</span>
                  </div>
                  <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                    {col2.length > 0 ? col2.map((e, idx) => (
                      <div key={e.id || idx} className="grid grid-cols-[1fr_40px_70px] px-2 py-1 items-center">
                        <span className="truncate">{e.full_address}</span>
                        <span className="text-center font-mono">{e.unit || '—'}</span>
                        <span className="text-right font-mono text-[10px] text-slate-600">{e.entry_date || '......'}</span>
                      </div>
                    )) : (
                      <div className="p-3 text-center text-slate-400 text-[10px] italic">Brak kolejnych pozycji</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Back Footer */}
              <div className="flex justify-between items-center text-[8px] text-slate-400 pt-1 border-t border-slate-200">
                <span>Druk S-12-P Rewers</span>
                <span>Zapisano w telefonie</span>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
