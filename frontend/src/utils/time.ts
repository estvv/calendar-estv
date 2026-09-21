import type { ClockType, WeekStart } from '../types';

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Ordered list of day indices (0 = Monday … 6 = Sunday) to display.
export function visibleDays(weekStart: WeekStart, showWeekend: boolean): number[] {
  const days = weekStart === 'sunday' ? [6, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];
  return showWeekend ? days : days.filter(d => d < 5);
}

export function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function formatTime(minutes: number, clock: ClockType): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  if (clock === '24h') return `${pad(h)}:${pad(m)}`;
  const suffix = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${pad(m)} ${suffix}`;
}

export function formatRange(start: number, end: number, clock: ClockType): string {
  return `${formatTime(start, clock)} - ${formatTime(end, clock)}`;
}

// "HH:MM" (input[type=time] value) <-> minutes since midnight
export function toTimeValue(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 1439));
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

export function fromTimeValue(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function snap(minutes: number, increment: number): number {
  return Math.round(minutes / increment) * increment;
}
