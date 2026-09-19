import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getSchedules, getScheduleById, createSchedule, updateSchedule, deleteSchedule,
  duplicateSchedule, generateShareToken, disableSharing,
  getEvents, createEvents, replaceEvents,
} from '../db/index.js';
import { parseId, validateSettings, validateEvent, validateImport } from '../validation.js';
import type { EventInput, ScheduleExport } from '../types/index.js';

const router = Router();
router.use(authMiddleware);

const MAX_SCHEDULES = 50;

function toExport(id: number): ScheduleExport | null {
  const s = getScheduleById(id);
  if (!s) return null;
  return {
    version: 1,
    schedule: {
      name: s.name,
      clock_type: s.clock_type,
      view_mode: s.view_mode,
      show_weekend: s.show_weekend,
      week_start: s.week_start,
      time_increment: s.time_increment,
      start_hour: s.start_hour,
      end_hour: s.end_hour,
    },
    events: getEvents(id).map(e => ({
      title: e.title,
      description: e.description,
      day: e.day,
      start_min: e.start_min,
      end_min: e.end_min,
      color: e.color,
    })),
  };
}

router.get('/', (_req, res) => {
  res.json({ success: true, data: getSchedules() });
});

router.post('/', (req, res) => {
  if (getSchedules().length >= MAX_SCHEDULES) {
    return res.status(400).json({ success: false, error: `Maximum ${MAX_SCHEDULES} schedules` });
  }
  const settings = validateSettings(req.body, true);
  if (typeof settings === 'string') return res.status(400).json({ success: false, error: settings });
  const schedule = createSchedule({ ...settings, name: settings.name! });
  res.status(201).json({ success: true, data: schedule });
});

router.post('/import', (req, res) => {
  if (getSchedules().length >= MAX_SCHEDULES) {
    return res.status(400).json({ success: false, error: `Maximum ${MAX_SCHEDULES} schedules` });
  }
  const parsed = validateImport(req.body);
  if (typeof parsed === 'string') return res.status(400).json({ success: false, error: parsed });
  const schedule = createSchedule({
    ...parsed.schedule,
    show_weekend: parsed.schedule.show_weekend === 1,
  });
  const events = createEvents(schedule.id, parsed.events);
  res.status(201).json({ success: true, data: { schedule: getScheduleById(schedule.id), events } });
});

router.get('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const schedule = id ? getScheduleById(id) : undefined;
  if (!schedule) return res.status(404).json({ success: false, error: 'Schedule not found' });
  res.json({ success: true, data: { schedule, events: getEvents(schedule.id) } });
});

router.put('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const existing = id ? getScheduleById(id) : undefined;
  if (!existing) return res.status(404).json({ success: false, error: 'Schedule not found' });

  const settings = validateSettings(req.body, false);
  if (typeof settings === 'string') return res.status(400).json({ success: false, error: settings });

  const start = settings.start_hour ?? existing.start_hour;
  const end = settings.end_hour ?? existing.end_hour;
  if (start >= end) return res.status(400).json({ success: false, error: 'start_hour must be before end_hour' });

  res.json({ success: true, data: updateSchedule(existing.id, settings) });
});

router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id || !getScheduleById(id)) return res.status(404).json({ success: false, error: 'Schedule not found' });
  deleteSchedule(id);
  res.json({ success: true, data: null });
});

router.post('/:id/duplicate', (req, res) => {
  const id = parseId(req.params.id);
  const existing = id ? getScheduleById(id) : undefined;
  if (!existing) return res.status(404).json({ success: false, error: 'Schedule not found' });
  if (getSchedules().length >= MAX_SCHEDULES) {
    return res.status(400).json({ success: false, error: `Maximum ${MAX_SCHEDULES} schedules` });
  }
  const copy = duplicateSchedule(existing.id, `${existing.name} (copy)`.slice(0, 80));
  res.status(201).json({ success: true, data: copy });
});

router.post('/:id/share', (req, res) => {
  const id = parseId(req.params.id);
  const existing = id ? getScheduleById(id) : undefined;
  if (!existing) return res.status(404).json({ success: false, error: 'Schedule not found' });
  const token = existing.is_shared && existing.share_token ? existing.share_token : generateShareToken(existing.id);
  res.json({ success: true, data: { share_token: token } });
});

router.delete('/:id/share', (req, res) => {
  const id = parseId(req.params.id);
  if (!id || !getScheduleById(id)) return res.status(404).json({ success: false, error: 'Schedule not found' });
  disableSharing(id);
  res.json({ success: true, data: null });
});

router.get('/:id/export', (req, res) => {
  const id = parseId(req.params.id);
  const data = id ? toExport(id) : null;
  if (!data) return res.status(404).json({ success: false, error: 'Schedule not found' });
  res.json({ success: true, data });
});

// Replace every event of a schedule in one go (used by "import into this schedule").
router.put('/:id/events', (req, res) => {
  const id = parseId(req.params.id);
  if (!id || !getScheduleById(id)) return res.status(404).json({ success: false, error: 'Schedule not found' });
  if (!Array.isArray(req.body?.events)) return res.status(400).json({ success: false, error: 'events must be an array' });
  if (req.body.events.length > 500) return res.status(400).json({ success: false, error: 'Too many events (max 500)' });

  const inputs: EventInput[] = [];
  for (let i = 0; i < req.body.events.length; i++) {
    const ev = validateEvent(req.body.events[i], false);
    if (typeof ev === 'string') return res.status(400).json({ success: false, error: `events[${i}]: ${ev}` });
    inputs.push(ev as EventInput);
  }
  res.json({ success: true, data: replaceEvents(id, inputs) });
});

// Create one event on one or more days. Body: EventInput with `days: number[]`
// in place of (or in addition to) `day`.
router.post('/:id/events', (req, res) => {
  const id = parseId(req.params.id);
  if (!id || !getScheduleById(id)) return res.status(404).json({ success: false, error: 'Schedule not found' });

  const body = req.body ?? {};
  let days: unknown = body.days;
  if (!Array.isArray(days)) days = body.day !== undefined ? [body.day] : [];
  const dayList = days as unknown[];
  if (dayList.length === 0) return res.status(400).json({ success: false, error: 'At least one day required' });
  if (dayList.length > 7) return res.status(400).json({ success: false, error: 'Too many days' });

  const inputs: EventInput[] = [];
  for (const day of new Set(dayList)) {
    const ev = validateEvent({ ...body, day }, false);
    if (typeof ev === 'string') return res.status(400).json({ success: false, error: ev });
    inputs.push(ev as EventInput);
  }

  if (getEvents(id).length + inputs.length > 500) {
    return res.status(400).json({ success: false, error: 'Too many events (max 500)' });
  }

  res.status(201).json({ success: true, data: createEvents(id, inputs) });
});

export default router;
