import { useMemo } from 'react';
import type { CalendarEvent, ScheduleSettings } from '../../types';
import { DAY_NAMES, DAY_SHORT, formatTime, formatRange, visibleDays } from '../../utils/time';
import { tint } from '../../utils/colors';
import { HOUR_PX, GUTTER_PX, layoutDay, computeRange, hourMarks, subMarks, type Positioned } from '../../utils/layout';

interface ScheduleGridProps {
  settings: ScheduleSettings;
  events: CalendarEvent[];
  readOnly?: boolean;
  onCellClick?: (day: number, startMin: number) => void;
  onEventClick?: (event: CalendarEvent) => void;
  // Daily view: which day is shown. Controlled by the parent so exports match.
  activeDay?: number;
  onActiveDayChange?: (day: number) => void;
}

export function ScheduleGrid({
  settings, events, readOnly = false, onCellClick, onEventClick, activeDay, onActiveDayChange,
}: ScheduleGridProps) {
  const allDays = useMemo(
    () => visibleDays(settings.week_start, settings.show_weekend === 1),
    [settings.week_start, settings.show_weekend],
  );

  const daily = settings.view_mode === 'daily';
  const shownDay = activeDay !== undefined && allDays.includes(activeDay) ? activeDay : allDays[0];
  const days = daily ? [shownDay] : allDays;

  const { gridStart, gridEnd } = useMemo(
    () => computeRange(settings, events, allDays),
    [settings, events, allDays],
  );

  const totalMin = gridEnd - gridStart;
  const heightPx = (totalMin / 60) * HOUR_PX;
  const hours = useMemo(() => hourMarks(gridStart, gridEnd), [gridStart, gridEnd]);
  const subLines = useMemo(
    () => subMarks(gridStart, gridEnd, settings.time_increment),
    [gridStart, gridEnd, settings.time_increment],
  );

  const byDay = useMemo(() => {
    const map = new Map<number, Positioned[]>();
    for (const d of days) map.set(d, layoutDay(events.filter(e => e.day === d)));
    return map;
  }, [events, days]);

  const toY = (min: number) => ((min - gridStart) / 60) * HOUR_PX;

  const handleColumnClick = (day: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !onCellClick) return;
    if (e.target !== e.currentTarget) return; // click landed on an event
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const raw = gridStart + (y / HOUR_PX) * 60;
    const snapped = Math.floor(raw / settings.time_increment) * settings.time_increment;
    onCellClick(day, Math.max(gridStart, Math.min(snapped, gridEnd - settings.time_increment)));
  };

  return (
    <div className="flex flex-col">
      {daily && (
        <div className="flex gap-1 mb-4 print-hidden">
          {allDays.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => onActiveDayChange?.(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                d === days[0]
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 border border-neutral-200'
              }`}
            >
              <span className="hidden sm:inline">{DAY_NAMES[d]}</span>
              <span className="sm:hidden">{DAY_SHORT[d]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden print-grid">
        {/* Day header */}
        <div className="flex border-b border-neutral-200" style={{ paddingLeft: GUTTER_PX }}>
          {days.map(d => (
            <div
              key={d}
              className="flex-1 min-w-0 py-3 text-center text-xs font-semibold uppercase tracking-wider text-neutral-500 border-l border-neutral-100 first:border-l-0"
            >
              {DAY_NAMES[d]}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="relative flex" style={{ height: heightPx }}>
          {/* Time gutter */}
          <div className="relative shrink-0 border-r border-neutral-100" style={{ width: GUTTER_PX }}>
            {hours.map(m => (
              <div
                key={m}
                className="absolute right-2 text-[11px] font-medium text-neutral-400 select-none"
                style={{ top: toY(m) + 4 }}
              >
                {formatTime(m, settings.clock_type)}
              </div>
            ))}
          </div>

          {/* Horizontal lines */}
          <div className="absolute inset-0 pointer-events-none" style={{ left: GUTTER_PX }}>
            {hours.map(m => (
              m !== gridStart && (
                <div key={m} className="absolute left-0 right-0 border-t border-neutral-200" style={{ top: toY(m) }} />
              )
            ))}
            {subLines.map(m => (
              <div key={m} className="absolute left-0 right-0 border-t border-dashed border-neutral-100" style={{ top: toY(m) }} />
            ))}
          </div>

          {/* Day columns */}
          {days.map(d => (
            <div
              key={d}
              className={`relative flex-1 min-w-0 border-l border-neutral-100 first:border-l-0 ${
                readOnly ? '' : 'cursor-pointer hover:bg-neutral-50/60 transition-colors'
              }`}
              onClick={(e) => handleColumnClick(d, e)}
            >
              {(byDay.get(d) ?? []).map(({ event, lane, lanes }) => {
                const top = toY(event.start_min);
                const height = toY(event.end_min) - top;
                const compact = height < 40;
                return (
                  <div
                    key={event.id}
                    className="absolute p-0.5"
                    style={{
                      top,
                      height,
                      left: `${(lane / lanes) * 100}%`,
                      width: `${(1 / lanes) * 100}%`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}
                      disabled={readOnly && !onEventClick}
                      title={`${event.title}\n${formatRange(event.start_min, event.end_min, settings.clock_type)}${event.description ? `\n${event.description}` : ''}`}
                      className={`w-full h-full flex flex-col items-stretch justify-start text-left rounded-md overflow-hidden px-2 ${compact ? 'py-0.5' : 'py-1.5'} border-l-[3px] transition-opacity ${
                        readOnly ? 'cursor-default' : 'hover:opacity-80'
                      }`}
                      style={{ backgroundColor: tint(event.color), borderLeftColor: event.color }}
                    >
                      <div className={`font-semibold text-neutral-900 leading-tight truncate ${compact ? 'text-[11px]' : 'text-xs'}`}>
                        {event.title}
                        {compact && (
                          <span className="font-normal text-neutral-500 ml-1.5">{formatTime(event.start_min, settings.clock_type)}</span>
                        )}
                      </div>
                      {!compact && (
                        <div className="text-[11px] text-neutral-500 leading-tight truncate">
                          {formatRange(event.start_min, event.end_min, settings.clock_type)}
                        </div>
                      )}
                      {!compact && height >= 72 && event.description && (
                        <div className="text-[11px] text-neutral-600 leading-snug mt-1 line-clamp-3 whitespace-pre-line">
                          {event.description}
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
