import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Segmented } from '../shared/Segmented';
import { Field, inputClass } from '../shared/Field';
import type { Schedule, ScheduleSettingsInput } from '../../types';
import { formatTime } from '../../utils/time';

interface SettingsModalProps {
  schedule: Schedule;
  onSave: (updates: ScheduleSettingsInput) => Promise<void>;
  onClose: () => void;
}

const HOURS = Array.from({ length: 25 }, (_, i) => i);

export function SettingsModal({ schedule, onSave, onClose }: SettingsModalProps) {
  const [name, setName] = useState(schedule.name);
  const [clock, setClock] = useState(schedule.clock_type);
  const [view, setView] = useState(schedule.view_mode);
  const [weekend, setWeekend] = useState(schedule.show_weekend === 1);
  const [weekStart, setWeekStart] = useState(schedule.week_start);
  const [increment, setIncrement] = useState(schedule.time_increment);
  const [startHour, setStartHour] = useState(schedule.start_hour);
  const [endHour, setEndHour] = useState(schedule.end_hour);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Name is required');
    if (startHour >= endHour) return setError('The day must end after it starts');

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        clock_type: clock,
        view_mode: view,
        show_weekend: weekend,
        week_start: weekStart,
        time_increment: increment,
        start_hour: startHour,
        end_hour: endHour,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to save');
      setSaving(false);
    }
  };

  return (
    <Modal title="Settings" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Schedule name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className={inputClass}
          />
        </Field>

        <Field label="Clock type">
          <Segmented
            options={[{ value: '12h', label: '12 hours' }, { value: '24h', label: '24 hours' }]}
            value={clock}
            onChange={setClock}
          />
        </Field>

        <Field label="Schedule view">
          <Segmented
            options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }]}
            value={view}
            onChange={setView}
          />
        </Field>

        <Field label="Show weekend">
          <Segmented
            options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
            value={weekend ? 'yes' : 'no'}
            onChange={(v) => setWeekend(v === 'yes')}
          />
        </Field>

        <Field label="Start of the week">
          <Segmented
            options={[{ value: 'monday', label: 'Monday' }, { value: 'sunday', label: 'Sunday' }]}
            value={weekStart}
            onChange={setWeekStart}
          />
        </Field>

        <Field label="Time increment">
          <Segmented
            options={[{ value: 15, label: '15 min' }, { value: 30, label: '30 min' }, { value: 60, label: '1 hour' }]}
            value={increment}
            onChange={setIncrement}
          />
        </Field>

        <Field label="Visible hours" hint="The grid grows automatically to fit events outside this range.">
          <div className="grid grid-cols-2 gap-3">
            <select value={startHour} onChange={(e) => setStartHour(Number(e.target.value))} className={inputClass}>
              {HOURS.slice(0, 24).map(h => <option key={h} value={h}>{formatTime(h * 60, clock)}</option>)}
            </select>
            <select value={endHour} onChange={(e) => setEndHour(Number(e.target.value))} className={inputClass}>
              {HOURS.slice(1).map(h => <option key={h} value={h}>{h === 24 ? (clock === '24h' ? '24:00' : '12 AM') : formatTime(h * 60, clock)}</option>)}
            </select>
          </div>
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full px-4 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </form>
    </Modal>
  );
}
