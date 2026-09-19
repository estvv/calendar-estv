import type { CalendarEvent, ScheduleSettings } from '../types';

export const HOUR_PX = 64;
export const GUTTER_PX = 56;

export interface Positioned {
  event: CalendarEvent;
  lane: number;
  lanes: number;
}

// Assign overlapping events to side-by-side lanes. Events are grouped into
// clusters of transitively-overlapping events; every event in a cluster gets
// the same total lane count so the columns line up.
export function layoutDay(events: CalendarEvent[]): Positioned[] {
  const sorted = [...events].sort((a, b) => a.start_min - b.start_min || b.end_min - a.end_min);
  const result: Positioned[] = [];

  let cluster: { event: CalendarEvent; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const lanes = laneEnds.length;
    for (const c of cluster) result.push({ event: c.event, lane: c.lane, lanes });
    cluster = [];
    laneEnds = [];
  };

  for (const ev of sorted) {
    if (cluster.length > 0 && ev.start_min >= clusterEnd) flush();

    let lane = laneEnds.findIndex(end => end <= ev.start_min);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(ev.end_min);
    } else {
      laneEnds[lane] = ev.end_min;
    }
    cluster.push({ event: ev, lane });
    clusterEnd = Math.max(clusterEnd, ev.end_min);
  }
  flush();
  return result;
}

// The visible range always covers the configured hours and grows to fit any
// event (on a visible day) that falls outside them. Both ends are whole hours.
export function computeRange(settings: ScheduleSettings, events: CalendarEvent[], days: number[]) {
  let gridStart = settings.start_hour * 60;
  let gridEnd = settings.end_hour * 60;
  for (const ev of events) {
    if (!days.includes(ev.day)) continue;
    gridStart = Math.min(gridStart, Math.floor(ev.start_min / 60) * 60);
    gridEnd = Math.max(gridEnd, Math.ceil(ev.end_min / 60) * 60);
  }
  return { gridStart, gridEnd };
}

export function hourMarks(gridStart: number, gridEnd: number): number[] {
  const out: number[] = [];
  for (let m = gridStart; m < gridEnd; m += 60) out.push(m);
  return out;
}

export function subMarks(gridStart: number, gridEnd: number, increment: number): number[] {
  if (increment >= 60) return [];
  const out: number[] = [];
  for (let m = gridStart; m < gridEnd; m += increment) {
    if (m % 60 !== 0) out.push(m);
  }
  return out;
}
