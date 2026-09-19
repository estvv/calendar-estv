import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ScheduleSummary } from '../types';
import { schedulesApi } from '../utils/api';

interface SchedulesContextValue {
  schedules: ScheduleSummary[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const SchedulesContext = createContext<SchedulesContextValue | null>(null);

export function SchedulesProvider({ children }: { children: React.ReactNode }) {
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setSchedules(await schedulesApi.list());
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <SchedulesContext.Provider value={{ schedules, loading, refresh }}>
      {children}
    </SchedulesContext.Provider>
  );
}

export function useSchedules(): SchedulesContextValue {
  const ctx = useContext(SchedulesContext);
  if (!ctx) throw new Error('useSchedules must be used within SchedulesProvider');
  return ctx;
}
