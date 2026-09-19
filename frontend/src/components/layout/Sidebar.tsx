import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { schedulesApi } from '../../utils/api';
import { useSchedules } from '../../contexts/SchedulesContext';
import type { ScheduleExport } from '../../types';

export function Sidebar() {
  const navigate = useNavigate();
  const { id } = useParams();
  const activeId = id ? Number(id) : undefined;
  const { schedules, refresh } = useSchedules();

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setError('');
    try {
      const s = await schedulesApi.create({ name: newName.trim() });
      setNewName('');
      setShowNew(false);
      await refresh();
      navigate(`/schedule/${s.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create schedule');
    }
  };

  const handleDuplicate = async (scheduleId: number) => {
    setError('');
    try {
      const copy = await schedulesApi.duplicate(scheduleId);
      await refresh();
      navigate(`/schedule/${copy.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to duplicate');
    }
  };

  const handleDelete = async (scheduleId: number, name: string) => {
    if (!confirm(`Delete "${name}" and all its events?`)) return;
    setError('');
    try {
      await schedulesApi.delete(scheduleId);
      await refresh();
      if (activeId === scheduleId) navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    }
  };

  const handleImport = async (file: File) => {
    setError('');
    try {
      const text = await file.text();
      let parsed: ScheduleExport;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('This file is not valid JSON');
      }
      const { schedule } = await schedulesApi.import(parsed);
      await refresh();
      navigate(`/schedule/${schedule.id}`);
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <aside className="w-64 border-r border-neutral-200 hidden md:flex flex-col h-full print-hidden">
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2 px-3 mt-1">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Schedules</span>
          <button
            onClick={() => setShowNew(true)}
            className="text-neutral-400 hover:text-neutral-600"
            title="New schedule"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {showNew && (
          <div className="mb-3 px-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setShowNew(false); setNewName(''); }
              }}
              onBlur={() => { if (!newName.trim()) setShowNew(false); }}
              placeholder="Schedule name..."
              maxLength={80}
              className="w-full px-3 py-1.5 text-sm border border-neutral-200 rounded focus:outline-none focus:border-neutral-500"
              autoFocus
            />
          </div>
        )}

        {schedules.length === 0 && !showNew ? (
          <div className="px-3 py-2 text-sm text-neutral-400">No schedules yet.</div>
        ) : (
          <div className="space-y-0.5">
            {schedules.map(s => {
              const isActive = s.id === activeId;
              return (
                <div
                  key={s.id}
                  className={`flex items-center group px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                  }`}
                >
                  <button
                    onClick={() => navigate(`/schedule/${s.id}`)}
                    className="flex items-center gap-2 flex-1 text-left min-w-0"
                  >
                    <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className={`flex-1 text-sm font-medium truncate ${isActive ? 'text-neutral-900' : 'text-neutral-700'}`}>
                      {s.name}
                    </span>
                    <span className="text-xs text-neutral-400 mr-1">{s.event_count}</span>
                  </button>

                  <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDuplicate(s.id); }}
                      className="text-neutral-400 hover:text-neutral-600 mr-1"
                      title="Duplicate schedule"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(s.id, s.name); }}
                      className="text-neutral-400 hover:text-red-600"
                      title="Delete schedule"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && <p className="px-3 mt-3 text-xs text-red-600">{error}</p>}
      </div>

      <div className="p-3 border-t border-neutral-200">
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }}
        />
        <button
          onClick={() => fileInput.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import JSON
        </button>
      </div>
    </aside>
  );
}
