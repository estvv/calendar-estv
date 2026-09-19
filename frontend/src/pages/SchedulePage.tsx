import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Schedule, CalendarEvent, ScheduleSettingsInput } from '../types';
import { schedulesApi, eventsApi } from '../utils/api';
import { useSchedules } from '../contexts/SchedulesContext';
import { ScheduleGrid } from '../components/schedule/ScheduleGrid';
import { EventModal, eventToForm, type EventFormValues } from '../components/schedule/EventModal';
import { SettingsModal } from '../components/schedule/SettingsModal';
import { SaveModal } from '../components/schedule/SaveModal';

type ModalState =
  | { kind: 'none' }
  | { kind: 'add'; initial: Partial<EventFormValues> }
  | { kind: 'edit'; event: CalendarEvent }
  | { kind: 'settings' }
  | { kind: 'save' };

export function SchedulePage() {
  const { id } = useParams();
  const scheduleId = Number(id);
  const navigate = useNavigate();
  const { refresh } = useSchedules();

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [modal, setModal] = useState<ModalState>({ kind: 'none' });
  const [activeDay, setActiveDay] = useState(0);

  const load = useCallback(async () => {
    if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const data = await schedulesApi.get(scheduleId);
      setSchedule(data.schedule);
      setEvents(data.events);
      setNotFound(false);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    setLoading(true);
    setModal({ kind: 'none' });
    load();
  }, [load]);

  const closeModal = useCallback(() => setModal({ kind: 'none' }), []);

  const handleAdd = async (values: EventFormValues) => {
    const created = await schedulesApi.createEvents(scheduleId, {
      title: values.title,
      description: values.description,
      days: values.days,
      start_min: values.start_min,
      end_min: values.end_min,
      color: values.color,
    });
    setEvents(prev => [...prev, ...created]);
    closeModal();
    refresh();
  };

  const handleEdit = (event: CalendarEvent) => async (values: EventFormValues) => {
    const updated = await eventsApi.update(event.id, {
      title: values.title,
      description: values.description,
      day: values.days[0],
      start_min: values.start_min,
      end_min: values.end_min,
      color: values.color,
    });
    setEvents(prev => prev.map(e => (e.id === updated.id ? updated : e)));
    closeModal();
  };

  const handleDelete = (event: CalendarEvent) => async () => {
    await eventsApi.delete(event.id);
    setEvents(prev => prev.filter(e => e.id !== event.id));
    closeModal();
    refresh();
  };

  const handleSaveSettings = async (updates: ScheduleSettingsInput) => {
    const updated = await schedulesApi.update(scheduleId, updates);
    setSchedule(updated);
    closeModal();
    refresh();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-neutral-400 text-sm">Loading...</div>;
  }

  if (notFound || !schedule) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm text-neutral-400">This schedule does not exist.</p>
        <button onClick={() => navigate('/')} className="text-sm font-medium text-neutral-900 hover:underline">
          Back to schedules
        </button>
      </div>
    );
  }

  const toolbarBtn = 'px-3 py-2 rounded-lg text-sm font-medium border border-neutral-200 bg-white text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 transition-colors';

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between gap-4 mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-neutral-900 truncate">{schedule.name}</h1>
        <div className="flex items-center gap-2 shrink-0 print-hidden">
          <button
            onClick={() => setModal({ kind: 'add', initial: {} })}
            className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            + Add
          </button>
          <button onClick={() => setModal({ kind: 'save' })} className={toolbarBtn}>Save</button>
          <button onClick={() => setModal({ kind: 'settings' })} className={toolbarBtn}>Settings</button>
        </div>
      </div>

      {events.length === 0 && (
        <p className="text-sm text-neutral-400 mb-4 print-hidden">
          Click a slot in the grid or press <span className="font-medium text-neutral-600">+ Add</span> to create your first event.
        </p>
      )}

      <ScheduleGrid
        settings={schedule}
        events={events}
        activeDay={activeDay}
        onActiveDayChange={setActiveDay}
        onCellClick={(day, startMin) => setModal({
          kind: 'add',
          initial: { days: [day], start_min: startMin, end_min: Math.min(startMin + 60, 1440) },
        })}
        onEventClick={(event) => setModal({ kind: 'edit', event })}
      />

      {modal.kind === 'add' && (
        <EventModal
          mode="add"
          settings={schedule}
          initial={modal.initial}
          onSubmit={handleAdd}
          onClose={closeModal}
        />
      )}

      {modal.kind === 'edit' && (
        <EventModal
          key={modal.event.id}
          mode="edit"
          settings={schedule}
          initial={eventToForm(modal.event)}
          onSubmit={handleEdit(modal.event)}
          onDelete={handleDelete(modal.event)}
          onDuplicate={() => setModal({ kind: 'add', initial: { ...eventToForm(modal.event), days: [] } })}
          onClose={closeModal}
        />
      )}

      {modal.kind === 'settings' && (
        <SettingsModal schedule={schedule} onSave={handleSaveSettings} onClose={closeModal} />
      )}

      {modal.kind === 'save' && (
        <SaveModal
          schedule={schedule}
          events={events}
          activeDay={activeDay}
          onScheduleChange={setSchedule}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
