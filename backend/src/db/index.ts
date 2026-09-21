import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { Schedule, ScheduleSummary, ScheduleSettingsInput, Event, EventInput } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/calendar.db');

const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  console.log('Database initialized');
}

// ---------- Schedules ----------

export function getSchedules(): ScheduleSummary[] {
  return db.prepare(`
    SELECT s.*, (SELECT COUNT(*) FROM events e WHERE e.schedule_id = s.id) AS event_count
    FROM schedules s
    ORDER BY s.position ASC, s.created_at ASC
  `).all() as ScheduleSummary[];
}

export function getScheduleById(id: number): Schedule | undefined {
  return db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as Schedule | undefined;
}

export function getScheduleByShareToken(token: string): Schedule | undefined {
  return db.prepare('SELECT * FROM schedules WHERE share_token = ? AND is_shared = 1').get(token) as Schedule | undefined;
}

export function createSchedule(input: ScheduleSettingsInput & { name: string }): Schedule {
  const max = db.prepare('SELECT MAX(position) AS m FROM schedules').get() as { m: number | null };
  const result = db.prepare(`
    INSERT INTO schedules (name, clock_type, view_mode, show_weekend, week_start, time_increment, start_hour, end_hour, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.name,
    input.clock_type ?? '24h',
    input.view_mode ?? 'weekly',
    input.show_weekend === undefined ? 1 : (input.show_weekend ? 1 : 0),
    input.week_start ?? 'monday',
    input.time_increment ?? 60,
    input.start_hour ?? 8,
    input.end_hour ?? 18,
    (max.m ?? -1) + 1
  );
  return getScheduleById(result.lastInsertRowid as number)!;
}

export function updateSchedule(id: number, updates: ScheduleSettingsInput): Schedule | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  const map: Record<string, (v: unknown) => [string, unknown]> = {
    name: (v) => ['name = ?', v],
    clock_type: (v) => ['clock_type = ?', v],
    view_mode: (v) => ['view_mode = ?', v],
    show_weekend: (v) => ['show_weekend = ?', v ? 1 : 0],
    week_start: (v) => ['week_start = ?', v],
    time_increment: (v) => ['time_increment = ?', v],
    start_hour: (v) => ['start_hour = ?', v],
    end_hour: (v) => ['end_hour = ?', v],
  };

  for (const [key, value] of Object.entries(updates)) {
    if (key in map && value !== undefined) {
      const [clause, val] = map[key](value);
      fields.push(clause);
      values.push(val);
    }
  }

  if (fields.length === 0) return getScheduleById(id);

  values.push(id);
  db.prepare(`UPDATE schedules SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
  return getScheduleById(id);
}

export function deleteSchedule(id: number): void {
  db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
}

export function touchSchedule(id: number): void {
  db.prepare('UPDATE schedules SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
}

export const duplicateSchedule = db.transaction((id: number, name: string): Schedule => {
  const source = getScheduleById(id);
  if (!source) throw new Error('Schedule not found');
  const copy = createSchedule({
    name,
    clock_type: source.clock_type,
    view_mode: source.view_mode,
    show_weekend: source.show_weekend === 1,
    week_start: source.week_start,
    time_increment: source.time_increment,
    start_hour: source.start_hour,
    end_hour: source.end_hour,
  });
  for (const ev of getEvents(id)) {
    createEvent(copy.id, ev);
  }
  return copy;
});

export function generateShareToken(id: number): string {
  const token = uuidv4();
  db.prepare('UPDATE schedules SET share_token = ?, is_shared = 1 WHERE id = ?').run(token, id);
  return token;
}

export function disableSharing(id: number): void {
  db.prepare('UPDATE schedules SET share_token = NULL, is_shared = 0 WHERE id = ?').run(id);
}

// ---------- Events ----------

export function getEvents(scheduleId: number): Event[] {
  return db.prepare('SELECT * FROM events WHERE schedule_id = ? ORDER BY day, start_min').all(scheduleId) as Event[];
}

export function getEventById(id: number): Event | undefined {
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id) as Event | undefined;
}

export function createEvent(scheduleId: number, input: EventInput): Event {
  const result = db.prepare(`
    INSERT INTO events (schedule_id, title, description, day, start_min, end_min, color)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    scheduleId,
    input.title,
    input.description ?? '',
    input.day,
    input.start_min,
    input.end_min,
    input.color ?? '#00a7f5'
  );
  touchSchedule(scheduleId);
  return getEventById(result.lastInsertRowid as number)!;
}

export const createEvents = db.transaction((scheduleId: number, inputs: EventInput[]): Event[] => {
  return inputs.map(i => createEvent(scheduleId, i));
});

export function updateEvent(id: number, updates: Partial<EventInput>): Event | undefined {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const key of ['title', 'description', 'day', 'start_min', 'end_min', 'color'] as const) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) return getEventById(id);

  values.push(id);
  db.prepare(`UPDATE events SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
  const ev = getEventById(id);
  if (ev) touchSchedule(ev.schedule_id);
  return ev;
}

export function deleteEvent(id: number): void {
  const ev = getEventById(id);
  db.prepare('DELETE FROM events WHERE id = ?').run(id);
  if (ev) touchSchedule(ev.schedule_id);
}

export const replaceEvents = db.transaction((scheduleId: number, inputs: EventInput[]): Event[] => {
  db.prepare('DELETE FROM events WHERE schedule_id = ?').run(scheduleId);
  return inputs.map(i => createEvent(scheduleId, i));
});
