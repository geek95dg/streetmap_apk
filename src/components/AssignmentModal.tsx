import React, { useState } from 'react';
import { Territory, Assignment } from '../types';
import { StorageService } from '../services/storage';
import { UserCheck, Check, RotateCcw, Clock, Calendar, AlertCircle } from 'lucide-react';

interface AssignmentModalProps {
  territory: Territory;
  currentAssignment?: Assignment | null;
  history: Assignment[];
  onClose: () => void;
  onSaved: () => void;
}

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  territory,
  currentAssignment,
  history,
  onClose,
  onSaved,
}) => {
  const [mode, setMode] = useState<'assign' | 'complete' | 'return' | 'history'>('assign');
  const [person, setPerson] = useState(currentAssignment?.person || '');
  const [assignedOn, setAssignedOn] = useState(new Date().toISOString().slice(0, 10));
  const [completedOn, setCompletedOn] = useState(new Date().toISOString().slice(0, 10));
  const [keepWithPerson, setKeepWithPerson] = useState(false);
  const [note, setNote] = useState(currentAssignment?.note || '');

  // Distinct known persons for quick autocomplete on mobile
  const allAssignments = StorageService.getAssignments();
  const knownPersons = Array.from(new Set(allAssignments.map(a => a.person).filter(Boolean)));

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!person.trim()) return;

    StorageService.saveAssignment({
      territory_nr: territory.nr,
      person: person.trim(),
      assigned_on: assignedOn,
      completed_on: null,
      note: note.trim(),
    });
    onSaved();
    onClose();
  };

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAssignment) return;

    StorageService.completeAssignment(currentAssignment.id, completedOn, keepWithPerson);
    onSaved();
    onClose();
  };

  const handleReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAssignment) return;

    StorageService.returnAssignment(currentAssignment.id, completedOn);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-bold">
                Teren {territory.nr}
              </span>
              <span className="text-xs font-medium text-slate-500">Druk S-13</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">{territory.address}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Current status banner */}
        <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500">Bieżący stan: </span>
            {currentAssignment ? (
              <span className="font-bold text-amber-700">
                Przydzielony ({currentAssignment.person})
              </span>
            ) : (
              <span className="font-bold text-emerald-700">Wolny w kartotece</span>
            )}
          </div>
          {currentAssignment && (
            <span className="text-[11px] text-slate-400">od {currentAssignment.assigned_on}</span>
          )}
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-medium mb-4">
          <button
            type="button"
            onClick={() => setMode('assign')}
            className={`py-2 rounded-lg transition ${
              mode === 'assign' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600'
            }`}
          >
            {currentAssignment ? 'Zmień' : 'Przydziel'}
          </button>
          
          {currentAssignment && (
            <button
              type="button"
              onClick={() => setMode('complete')}
              className={`py-2 rounded-lg transition ${
                mode === 'complete' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600'
              }`}
            >
              Opracowano
            </button>
          )}

          <button
            type="button"
            onClick={() => setMode('history')}
            className={`py-2 rounded-lg transition ${
              mode === 'history' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-600'
            }`}
          >
            Historia ({history.length})
          </button>
        </div>

        {/* MODE 1: ASSIGN / REASSIGN */}
        {mode === 'assign' && (
          <form onSubmit={handleAssign} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Głosiciel (komu wydano teren):
              </label>
              <input
                type="text"
                required
                value={person}
                onChange={e => setPerson(e.target.value)}
                placeholder="Imię i nazwisko"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {knownPersons.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <span className="text-[10px] text-slate-400 py-0.5">Podpowiedzi:</span>
                  {knownPersons.slice(0, 4).map(p => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPerson(p)}
                      className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data pobrania terenu:
              </label>
              <input
                type="date"
                required
                value={assignedOn}
                onChange={e => setAssignedOn(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notatka / uwagi:
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Np. telefon, rewir, specjalne wytyczne"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 active:scale-98 transition"
            >
              Zapisz przydział w telefonie
            </button>
          </form>
        )}

        {/* MODE 2: COMPLETE (OPRACOWANO) */}
        {mode === 'complete' && currentAssignment && (
          <form onSubmit={handleComplete} className="space-y-3.5">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              Oznaczenie daty opracowania terenu przez <strong>{currentAssignment.person}</strong>.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data opracowania:
              </label>
              <input
                type="date"
                required
                value={completedOn}
                onChange={e => setCompletedOn(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={keepWithPerson}
                onChange={e => setKeepWithPerson(e.target.checked)}
                className="mt-0.5 rounded text-blue-600"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">Teren zostaje u głosiciela</span>
                <span className="text-slate-500">Zapisze opracowanie i od razu rozpocznie kolejny cykl przydziału.</span>
              </div>
            </label>

            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 active:scale-98 transition"
            >
              Zatwierdź opracowanie
            </button>

            <button
              type="button"
              onClick={handleReturn}
              className="w-full rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Tylko zdaj teren (wraca do puli wolnych bez opracowania)
            </button>
          </form>
        )}

        {/* MODE 3: HISTORY */}
        {mode === 'history' && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-slate-700">Historia przydziałów terenu {territory.nr}:</h4>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Brak wcześniejszych przydziałów</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {history.map(item => (
                  <div key={item.id} className="py-2.5 text-xs flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-900">{item.person}</div>
                      <div className="text-[11px] text-slate-500">
                        {item.assigned_on} → {item.completed_on || 'w trakcie'}
                      </div>
                      {item.note && <div className="text-[10px] text-slate-400 italic">{item.note}</div>}
                    </div>
                    <div>
                      {item.completed_on ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-medium">
                          Opracowano
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-medium">
                          U głosiciela
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
