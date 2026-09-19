import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { PublicSchedule, CalendarEvent } from '../types';
import { sharedApi } from '../utils/api';
import { ScheduleGrid } from '../components/schedule/ScheduleGrid';
import { downloadPng } from '../utils/renderPng';

export function SharedPage() {
  const { token } = useParams();
  const [schedule, setSchedule] = useState<PublicSchedule | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
    if (!token) return;
    sharedApi.get(token)
      .then(data => { setSchedule(data.schedule); setEvents(data.events); })
      .catch(() => setSchedule(null))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePng = async () => {
    if (!schedule) return;
    setBusy(true);
    try {
      await downloadPng({ title: schedule.name, settings: schedule, events, day: activeDay });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-400 text-sm">Loading...</div>;
  }

  if (!schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-neutral-400">This link is invalid or has been disabled.</p>
      </div>
    );
  }

  const btn = 'px-3 py-2 rounded-lg text-sm font-medium border border-neutral-200 bg-white text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 transition-colors disabled:opacity-50';

  return (
    <div className="min-h-screen bg-neutral-50/50 print:bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-neutral-900 truncate">{schedule.name}</h1>
            <p className="text-xs text-neutral-400 print-hidden">Shared schedule · read only</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 print-hidden">
            <button onClick={() => window.print()} className={btn}>Print</button>
            <button onClick={handlePng} disabled={busy} className={btn}>{busy ? 'Rendering...' : 'PNG'}</button>
          </div>
        </div>

        <ScheduleGrid settings={schedule} events={events} readOnly activeDay={activeDay} onActiveDayChange={setActiveDay} />
      </div>
    </div>
  );
}
