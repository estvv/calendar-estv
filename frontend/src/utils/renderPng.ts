import type { CalendarEvent, ScheduleSettings } from '../types';
import { DAY_NAMES, formatTime, formatRange, visibleDays } from './time';
import { tint } from './colors';
import { HOUR_PX, GUTTER_PX, layoutDay, computeRange, hourMarks, subMarks } from './layout';

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const COLORS = {
  text: '#171717',
  muted: '#737373',
  faint: '#a3a3a3',
  line: '#e5e5e5',
  subline: '#f0f0f0',
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
      if (lines.length >= maxLines) break;
    }
    if (lines.length >= maxLines) break;
    if (line) lines.push(line);
  }
  if (lines.length > maxLines) lines.length = maxLines;
  if (lines.length === maxLines && ctx.measureText(lines[maxLines - 1]).width > maxWidth) {
    lines[maxLines - 1] = truncate(ctx, lines[maxLines - 1], maxWidth);
  }
  return lines;
}

export interface RenderOptions {
  title: string;
  settings: ScheduleSettings;
  events: CalendarEvent[];
  // Only used in daily view: which day to draw.
  day?: number;
}

// Draws the schedule to an offscreen canvas in the same style as the on-screen
// grid, and returns it as a PNG blob. Runs entirely from data, so it does not
// depend on DOM serialisation or cross-origin stylesheets.
export async function renderSchedulePng({ title, settings, events, day }: RenderOptions): Promise<Blob> {
  await document.fonts.ready.catch(() => {});

  const allDays = visibleDays(settings.week_start, settings.show_weekend === 1);
  const days = settings.view_mode === 'daily' ? [day ?? allDays[0]] : allDays;
  const { gridStart, gridEnd } = computeRange(settings, events, allDays);

  const scale = 2;
  const pad = 32;
  const titleH = 44;
  const headerH = 40;
  const width = settings.view_mode === 'daily' ? 720 : 1280;
  const gridW = width - pad * 2;
  const colW = (gridW - GUTTER_PX) / days.length;
  const bodyH = ((gridEnd - gridStart) / 60) * HOUR_PX;
  const height = pad + titleH + headerH + bodyH + pad;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = `700 22px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(truncate(ctx, title, gridW), pad, pad + 16);

  const gx = pad;
  const gy = pad + titleH;
  const gh = headerH + bodyH;
  const bodyY = gy + headerH;
  const toY = (min: number) => bodyY + ((min - gridStart) / 60) * HOUR_PX;

  // Card outline
  ctx.save();
  roundRect(ctx, gx, gy, gridW, gh, 12);
  ctx.clip();

  // Header
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(gx, bodyY + 0.5);
  ctx.lineTo(gx + gridW, bodyY + 0.5);
  ctx.stroke();

  ctx.font = `600 11px ${FONT}`;
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = 'center';
  days.forEach((d, i) => {
    const x = gx + GUTTER_PX + colW * i;
    ctx.fillText(DAY_NAMES[d].toUpperCase(), x + colW / 2, gy + headerH / 2);
    if (i > 0) {
      ctx.strokeStyle = COLORS.subline;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, gy);
      ctx.lineTo(Math.round(x) + 0.5, gy + gh);
      ctx.stroke();
    }
  });

  // Gutter separator
  ctx.strokeStyle = COLORS.subline;
  ctx.beginPath();
  ctx.moveTo(gx + GUTTER_PX + 0.5, bodyY);
  ctx.lineTo(gx + GUTTER_PX + 0.5, gy + gh);
  ctx.stroke();

  // Hour lines and labels
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = `500 11px ${FONT}`;
  for (const m of hourMarks(gridStart, gridEnd)) {
    const y = Math.round(toY(m)) + 0.5;
    if (m !== gridStart) {
      ctx.strokeStyle = COLORS.line;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(gx + GUTTER_PX, y);
      ctx.lineTo(gx + gridW, y);
      ctx.stroke();
    }
    ctx.fillStyle = COLORS.faint;
    ctx.fillText(formatTime(m, settings.clock_type), gx + GUTTER_PX - 8, toY(m) + 4);
  }
  for (const m of subMarks(gridStart, gridEnd, settings.time_increment)) {
    const y = Math.round(toY(m)) + 0.5;
    ctx.strokeStyle = COLORS.subline;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(gx + GUTTER_PX, y);
    ctx.lineTo(gx + gridW, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Events
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  days.forEach((d, i) => {
    const colX = gx + GUTTER_PX + colW * i;
    for (const { event, lane, lanes } of layoutDay(events.filter(e => e.day === d))) {
      const laneW = colW / lanes;
      const x = colX + laneW * lane + 2;
      const w = laneW - 4;
      const y = toY(event.start_min) + 2;
      const h = toY(event.end_min) - toY(event.start_min) - 4;
      const compact = h < 36;

      ctx.save();
      roundRect(ctx, x, y, w, h, 6);
      ctx.clip();
      ctx.fillStyle = tint(event.color);
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = event.color;
      ctx.fillRect(x, y, 3, h);

      const tx = x + 9;
      const tw = w - 12;
      let ty = y + (compact ? 3 : 6);

      ctx.fillStyle = COLORS.text;
      ctx.font = `600 ${compact ? 11 : 12}px ${FONT}`;
      if (compact) {
        const time = formatTime(event.start_min, settings.clock_type);
        const titleText = truncate(ctx, event.title, tw - ctx.measureText(` ${time}`).width);
        ctx.fillText(titleText, tx, ty);
        ctx.fillStyle = COLORS.muted;
        ctx.font = `400 11px ${FONT}`;
        ctx.fillText(time, tx + ctx.measureText(titleText).width + 5, ty);
      } else {
        ctx.fillText(truncate(ctx, event.title, tw), tx, ty);
        ty += 15;
        ctx.fillStyle = COLORS.muted;
        ctx.font = `400 11px ${FONT}`;
        ctx.fillText(truncate(ctx, formatRange(event.start_min, event.end_min, settings.clock_type), tw), tx, ty);
        ty += 17;
        if (event.description && h >= 72) {
          ctx.fillStyle = '#525252';
          const maxLines = Math.max(1, Math.floor((y + h - 6 - ty) / 14));
          for (const line of wrap(ctx, event.description, tw, Math.min(3, maxLines))) {
            ctx.fillText(line, tx, ty);
            ty += 14;
          }
        }
      }
      ctx.restore();
    }
  });

  ctx.restore();

  // Card border on top of everything
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  roundRect(ctx, gx + 0.5, gy + 0.5, gridW - 1, gh - 1, 12);
  ctx.stroke();

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Failed to render PNG'))), 'image/png');
  });
}

export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'schedule';
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadPng(options: RenderOptions) {
  const blob = await renderSchedulePng(options);
  downloadBlob(blob, `${slug(options.title)}.png`);
}
