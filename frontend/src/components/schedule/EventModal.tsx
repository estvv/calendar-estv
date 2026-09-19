import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { Field, inputClass } from '../shared/Field';
import type { CalendarEvent, ScheduleSettings } from '../../types';
import { DAY_SHORT, DAY_NAMES, toTimeValue, fromTimeValue, visibleDays } from '../../utils/time';
import { PALETTE, DEFAULT_COLOR, isHexColor } from '../../utils/colors';

export interface EventFormValues {
  title: string;
  description: string;
  days: number[];
  start_min: number;
  end_min: number;
  color: string;
}

interface EventModalProps {
  mode: 'add' | 'edit';
  settings: ScheduleSettings;
  initial: Partial<EventFormValues>;
  onSubmit: (values: EventFormValues) => Promise<void>;
  onDelete?: () => Promise<void>;
  onDuplicate?: () => void;
  onClose: () => void;
}

export function eventToForm(ev: CalendarEvent): EventFormValues {
  return {
    title: ev.title,
    description: ev.description,
    days: [ev.day],
    start_min: ev.start_min,
    end_min: ev.end_min,
    color: ev.color,
  };
}

export function EventModal({ mode, settings, initial, onSubmit, onDelete, onDuplicate, onClose }: EventModalProps) {
  const [title, setTitle] = useState(initial.title ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [days, setDays] = useState<number[]>(initial.days ?? [0]);
  const [start, setStart] = useState(toTimeValue(initial.start_min ?? settings.start_hour * 60));
  const [end, setEnd] = useState(toTimeValue(initial.end_min ?? settings.start_hour * 60 + 60));
  const [color, setColor] = useState(initial.color ?? DEFAULT_COLOR);
  const [customColor, setCustomColor] = useState(PALETTE.includes(initial.color ?? DEFAULT_COLOR) ? '' : (initial.color ?? ''));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const orderedDays = visibleDays(settings.week_start, true);
  const hiddenDays = settings.show_weekend === 1 ? [] : [5, 6];

  const toggleDay = (d: number) => {
    if (mode === 'edit') {
      setDays([d]);
      return;
    }
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b));
  };

  const applyCustomColor = (value: string) => {
    setCustomColor(value);
    if (isHexColor(value)) setColor(value.toLowerCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const startMin = fromTimeValue(start);
    const endMin = fromTimeValue(end);
    if (!title.trim()) return setError('Title is required');
    if (days.length === 0) return setError('Pick at least one day');
    if (startMin === null || endMin === null) return setError('Invalid time');
    if (startMin >= endMin) return setError('The event must end after it starts');
    if (!isHexColor(color)) return setError('Invalid colour');

    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), days, start_min: startMin, end_min: endMin, color });
    } catch (err: any) {
      setError(err.message || 'Failed to save');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Delete this event?')) return;
    setSaving(true);
    try {
      await onDelete();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
      setSaving(false);
    }
  };

  return (
    <Modal title={mode === 'add' ? 'Add event' : 'Edit event'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          maxLength={120}
          className={`${inputClass} py-2.5`}
          autoFocus
        />

        <Field label="Colour">
          <div className="flex items-center gap-2 flex-wrap">
            {PALETTE.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { setColor(c); setCustomColor(''); }}
                title={c}
                className={`w-6 h-6 rounded-full transition-transform ${
                  color === c ? 'ring-2 ring-offset-2 ring-neutral-900 scale-110' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <label
              title={customColor ? `Custom colour ${customColor}` : 'Custom colour'}
              className={`relative w-6 h-6 rounded-full cursor-pointer overflow-hidden transition-transform ${
                customColor && color === customColor
                  ? 'ring-2 ring-offset-2 ring-neutral-900 scale-110'
                  : 'border border-dashed border-neutral-400 hover:scale-110'
              }`}
              style={customColor ? { backgroundColor: customColor } : undefined}
            >
              {!customColor && (
                <svg className="absolute inset-0 m-auto w-3 h-3 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
              <input
                type="color"
                value={isHexColor(color) ? color : DEFAULT_COLOR}
                onChange={(e) => applyCustomColor(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>
        </Field>

        <Field label={mode === 'add' ? 'Days' : 'Day'} hint={mode === 'add' && days.length > 1 ? `Creates ${days.length} events, one per day` : undefined}>
          <div className="flex gap-1.5">
            {orderedDays.map(d => {
              const selected = days.includes(d);
              const hidden = hiddenDays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  title={hidden ? `${DAY_NAMES[d]} (weekend hidden in settings)` : DAY_NAMES[d]}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    selected
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : `border-neutral-200 hover:bg-neutral-50 ${hidden ? 'text-neutral-300' : 'text-neutral-600 hover:text-neutral-900'}`
                  }`}
                >
                  {DAY_SHORT[d]}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <input
              type="time"
              value={start}
              step={300}
              onChange={(e) => setStart(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label="End">
            <input
              type="time"
              value={end}
              step={300}
              onChange={(e) => setEnd(e.target.value)}
              className={inputClass}
              required
            />
          </Field>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={3}
          maxLength={1000}
          className={`${inputClass} resize-none`}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          {mode === 'edit' && (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Delete
              </button>
              {onDuplicate && (
                <button
                  type="button"
                  onClick={onDuplicate}
                  disabled={saving}
                  className="px-3 py-2.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  Duplicate
                </button>
              )}
            </>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : mode === 'add' ? 'Add' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
