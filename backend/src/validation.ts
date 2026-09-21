import type { EventInput, ScheduleSettingsInput, ScheduleExport } from './types/index.js';

const CLOCK_TYPES = ['12h', '24h'];
const VIEW_MODES = ['weekly', 'daily'];
const WEEK_STARTS = ['monday', 'sunday'];
const INCREMENTS = [15, 30, 60];
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export const MAX_TITLE = 120;
export const MAX_DESCRIPTION = 1000;
export const MAX_NAME = 80;

function isInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v);
}

export function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Returns the sanitised settings or an error message.
export function validateSettings(body: unknown, requireName: boolean): ScheduleSettingsInput | string {
  if (!body || typeof body !== 'object') return 'Invalid body';
  const b = body as Record<string, unknown>;
  const out: ScheduleSettingsInput = {};

  if (b.name !== undefined) {
    if (typeof b.name !== 'string' || !b.name.trim()) return 'Name required';
    if (b.name.length > MAX_NAME) return `Name too long (max ${MAX_NAME})`;
    out.name = b.name.trim();
  } else if (requireName) {
    return 'Name required';
  }

  if (b.clock_type !== undefined) {
    if (!CLOCK_TYPES.includes(b.clock_type as string)) return 'Invalid clock_type';
    out.clock_type = b.clock_type as ScheduleSettingsInput['clock_type'];
  }
  if (b.view_mode !== undefined) {
    if (!VIEW_MODES.includes(b.view_mode as string)) return 'Invalid view_mode';
    out.view_mode = b.view_mode as ScheduleSettingsInput['view_mode'];
  }
  if (b.show_weekend !== undefined) {
    if (typeof b.show_weekend !== 'boolean') return 'Invalid show_weekend';
    out.show_weekend = b.show_weekend;
  }
  if (b.week_start !== undefined) {
    if (!WEEK_STARTS.includes(b.week_start as string)) return 'Invalid week_start';
    out.week_start = b.week_start as ScheduleSettingsInput['week_start'];
  }
  if (b.time_increment !== undefined) {
    if (!isInt(b.time_increment) || !INCREMENTS.includes(b.time_increment)) return 'Invalid time_increment';
    out.time_increment = b.time_increment;
  }
  if (b.start_hour !== undefined) {
    if (!isInt(b.start_hour) || b.start_hour < 0 || b.start_hour > 23) return 'Invalid start_hour';
    out.start_hour = b.start_hour;
  }
  if (b.end_hour !== undefined) {
    if (!isInt(b.end_hour) || b.end_hour < 1 || b.end_hour > 24) return 'Invalid end_hour';
    out.end_hour = b.end_hour;
  }
  if (out.start_hour !== undefined && out.end_hour !== undefined && out.start_hour >= out.end_hour) {
    return 'start_hour must be before end_hour';
  }

  return out;
}

export function validateEvent(body: unknown, partial: boolean): Partial<EventInput> | string {
  if (!body || typeof body !== 'object') return 'Invalid body';
  const b = body as Record<string, unknown>;
  const out: Partial<EventInput> = {};

  if (b.title !== undefined) {
    if (typeof b.title !== 'string' || !b.title.trim()) return 'Title required';
    if (b.title.length > MAX_TITLE) return `Title too long (max ${MAX_TITLE})`;
    out.title = b.title.trim();
  } else if (!partial) {
    return 'Title required';
  }

  if (b.description !== undefined) {
    if (typeof b.description !== 'string') return 'Invalid description';
    if (b.description.length > MAX_DESCRIPTION) return `Description too long (max ${MAX_DESCRIPTION})`;
    out.description = b.description;
  }

  if (b.day !== undefined) {
    if (!isInt(b.day) || b.day < 0 || b.day > 6) return 'Invalid day';
    out.day = b.day;
  } else if (!partial) {
    return 'Day required';
  }

  if (b.start_min !== undefined) {
    if (!isInt(b.start_min) || b.start_min < 0 || b.start_min >= 1440) return 'Invalid start_min';
    out.start_min = b.start_min;
  } else if (!partial) {
    return 'start_min required';
  }

  if (b.end_min !== undefined) {
    if (!isInt(b.end_min) || b.end_min <= 0 || b.end_min > 1440) return 'Invalid end_min';
    out.end_min = b.end_min;
  } else if (!partial) {
    return 'end_min required';
  }

  if (out.start_min !== undefined && out.end_min !== undefined && out.start_min >= out.end_min) {
    return 'Event must end after it starts';
  }

  if (b.color !== undefined) {
    if (typeof b.color !== 'string' || !COLOR_RE.test(b.color)) return 'Invalid color';
    out.color = b.color.toLowerCase();
  }

  return out;
}

export function validateImport(body: unknown): ScheduleExport | string {
  if (!body || typeof body !== 'object') return 'Invalid file';
  const b = body as Record<string, unknown>;
  if (b.version !== 1) return 'Unsupported file version';

  // Exports store show_weekend as 0/1 (the DB shape); accept both forms.
  let rawSchedule: unknown = b.schedule;
  if (rawSchedule && typeof rawSchedule === 'object') {
    const copy = { ...(rawSchedule as Record<string, unknown>) };
    if (copy.show_weekend === 0 || copy.show_weekend === 1) copy.show_weekend = copy.show_weekend === 1;
    rawSchedule = copy;
  }
  const settings = validateSettings(rawSchedule, true);
  if (typeof settings === 'string') return `schedule: ${settings}`;

  if (!Array.isArray(b.events)) return 'events must be an array';
  if (b.events.length > 500) return 'Too many events (max 500)';

  const events: EventInput[] = [];
  for (let i = 0; i < b.events.length; i++) {
    const ev = validateEvent(b.events[i], false);
    if (typeof ev === 'string') return `events[${i}]: ${ev}`;
    events.push(ev as EventInput);
  }

  return {
    version: 1,
    schedule: {
      name: settings.name!,
      clock_type: settings.clock_type ?? '24h',
      view_mode: settings.view_mode ?? 'weekly',
      show_weekend: settings.show_weekend === false ? 0 : 1,
      week_start: settings.week_start ?? 'monday',
      time_increment: settings.time_increment ?? 60,
      start_hour: settings.start_hour ?? 8,
      end_hour: settings.end_hour ?? 18,
    },
    events: events.map(e => ({
      title: e.title,
      description: e.description ?? '',
      day: e.day,
      start_min: e.start_min,
      end_min: e.end_min,
      color: e.color ?? '#00a7f5',
    })),
  };
}
