import React, { useState } from 'react';
import { Territory, Assignment } from '../types';
import { StorageService } from '../services/storage';
import { AssignmentModal } from './AssignmentModal';
import { 
  Users, CheckCircle2, Clock, AlertTriangle, Search, Filter, 
  Plus, Calendar, ArrowRight, UserCheck, Check
} from 'lucide-react';

interface AssignmentsTabProps {
  territories: Territory[];
  onRefresh: () => void;
}

export const AssignmentsTab: React.FC<AssignmentsTabProps> = ({ territories, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'assigned' | 'free' | 'overdue'>('all');
  const [activeModalTerritory, setActiveModalTerritory] = useState<Territory | null>(null);

  const assignments = StorageService.getAssignments();

  // Active assignments (completed_on === null)
  const activeAssignments = assignments.filter(a => a.completed_on === null);

  // Check overdue assignments (> 4 months / 120 days)
  const now = new Date();
  const overdueAssignments = activeAssignments.filter(a => {
    const assignedDate = new Date(a.assigned_on);
    const diffDays = Math.floor((now.getTime() - assignedDate.getTime()) / (1000 * 3600 * 24));
    return diffDays > 120;
  });

  // Territories with their assignment status
  const territoryStatusList = territories.map(t => {
    const active = activeAssignments.find(a => a.territory_nr === t.nr);
    const history = assignments.filter(a => a.territory_nr === t.nr);
    const lastCompleted = history.filter(a => a.completed_on !== null).sort((a, b) => (b.completed_on || '').localeCompare(a.completed_on || ''))[0];

    const isOverdue = active ? overdueAssignments.some(oa => oa.id === active.id) : false;

    return {
      territory: t,
      active,
      lastCompleted,
      isOverdue,
      history,
    };
  });

  // Filter list
  const filteredList = territoryStatusList.filter(item => {
    const matchesSearch = 
      item.territory.nr.toLowerCase().includes(search.toLowerCase()) ||
      item.territory.address.toLowerCase().includes(search.toLowerCase()) ||
      (item.active && item.active.person.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filter === 'assigned') return !!item.active;
    if (filter === 'free') return !item.active;
    if (filter === 'overdue') return item.isOverdue;
    return true;
  });

  const freeCount = territories.length - activeAssignments.length;

  return (
    <div className="space-y-4">
      {/* S-13 KPI Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div 
          onClick={() => setFilter('free')}
          className={`cursor-pointer rounded-2xl p-3 border transition active:scale-95 ${
            filter === 'free' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Wolne</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{freeCount}</div>
          <span className="text-[10px] text-slate-500">gotowe do pobrania</span>
        </div>

        <div 
          onClick={() => setFilter('assigned')}
          className={`cursor-pointer rounded-2xl p-3 border transition active:scale-95 ${
            filter === 'assigned' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Przydzielone</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{activeAssignments.length}</div>
          <span className="text-[10px] text-slate-500">u głosicieli</span>
        </div>

        <div 
          onClick={() => setFilter('overdue')}
          className={`cursor-pointer rounded-2xl p-3 border transition active:scale-95 ${
            filter === 'overdue' ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">&gt; 4 m-ce</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-700">{overdueAssignments.length}</div>
          <span className="text-[10px] text-slate-500">wymagają uwagi</span>
        </div>

        <div 
          onClick={() => setFilter('all')}
          className={`cursor-pointer rounded-2xl p-3 border transition active:scale-95 ${
            filter === 'all' ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-500' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Kartoteka</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900">{territories.length}</div>
          <span className="text-[10px] text-slate-500">terenów łącznie</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Szukaj po nazwisku głosiciela, numerze terenu..."
          className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm shadow-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Quick Filter bar */}
      <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full font-medium transition ${
            filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Wszystkie
        </button>
        <button
          onClick={() => setFilter('free')}
          className={`px-3 py-1.5 rounded-full font-medium transition ${
            filter === 'free' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Wolne ({freeCount})
        </button>
        <button
          onClick={() => setFilter('assigned')}
          className={`px-3 py-1.5 rounded-full font-medium transition ${
            filter === 'assigned' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Przydzielone ({activeAssignments.length})
        </button>
        {overdueAssignments.length > 0 && (
          <button
            onClick={() => setFilter('overdue')}
            className={`px-3 py-1.5 rounded-full font-medium transition ${
              filter === 'overdue' ? 'bg-rose-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Przetrzymane ({overdueAssignments.length})
          </button>
        )}
      </div>

      {/* Assignment Items List */}
      <div className="space-y-3">
        {filteredList.map(({ territory, active, lastCompleted, isOverdue, history }) => (
          <div
            key={territory.id}
            className={`rounded-2xl border bg-white p-4 shadow-xs transition ${
              isOverdue ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200 hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-bold text-white text-base">
                  {territory.nr}
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm leading-snug">
                    {territory.address}
                  </h3>
                  <p className="text-xs text-slate-500">{territory.city}</p>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {active ? (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                    isOverdue ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {active.person}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    Wolny
                  </span>
                )}
              </div>
            </div>

            {/* Assignment Details */}
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs space-y-1">
              {active ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Pobrany:</span>
                    <span className="font-semibold text-slate-800">{active.assigned_on}</span>
                  </div>
                  {isOverdue && (
                    <div className="flex items-center gap-1 text-rose-600 font-bold text-[11px] pt-0.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>U głosiciela ponad 4 miesiące!</span>
                    </div>
                  )}
                  {active.note && (
                    <div className="text-[11px] text-slate-500 italic pt-0.5">
                      Uwaga: {active.note}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between items-center text-slate-500">
                  <span>Ostatnie opracowanie:</span>
                  <span className="font-semibold text-slate-700">
                    {lastCompleted ? `${lastCompleted.completed_on} (${lastCompleted.person})` : 'Brak danych'}
                  </span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setActiveModalTerritory(territory)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-95"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{active ? 'Zarządzaj / Opracowano' : 'Przydziel teren'}</span>
              </button>

              <button
                onClick={() => setActiveModalTerritory(territory)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Historia ({history.length})
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Assignment / Status Modal */}
      {activeModalTerritory && (
        <AssignmentModal
          territory={activeModalTerritory}
          currentAssignment={activeAssignments.find(a => a.territory_nr === activeModalTerritory.nr)}
          history={assignments.filter(a => a.territory_nr === activeModalTerritory.nr)}
          onClose={() => setActiveModalTerritory(null)}
          onSaved={onRefresh}
        />
      )}

    </div>
  );
};
