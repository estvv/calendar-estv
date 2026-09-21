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
        <div className="flex border-b border-neutral-100" style={{ paddingLeft: GUTTER_PX }}>
          {days.map(d => (
            <div
              key={d}
              className="flex-1 min-w-0 py-4 text-center text-[11px] font-bold uppercase tracking-wide text-neutral-800"
            >
              {DAY_NAMES[d]}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="relative flex" style={{ height: heightPx }}>
          {/* Time gutter */}
          <div className="relative shrink-0" style={{ width: GUTTER_PX }}>
            {hours.map(m => (
              <div
                key={m}
                className="absolute right-3 text-[10px] font-semibold text-neutral-700 select-none"
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
              <div key={m} className="absolute left-0 right-0 border-t border-dashed border-neutral-100/80" style={{ top: toY(m) }} />
            ))}
          </div>

          {/* Day columns */}
          {days.map(d => (
            <div
              key={d}
              className={`relative flex-1 min-w-0 border-l border-neutral-200 first:border-l-0 ${
                readOnly ? '' : 'cursor-pointer hover:bg-neutral-50/60 transition-colors'
              }`}
              onClick={(e) => handleColumnClick(d, e)}
            >
              {(byDay.get(d) ?? []).map(({ event, lane, lanes }) => {
                const top = toY(event.start_min);
                const height = toY(event.end_min) - top;
                const compact = height < 44;
                return (
                  <div
                    key={event.id}
                    className="absolute px-[3px] py-[2px]"
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
                      className={`w-full h-full flex flex-col items-stretch text-left rounded-lg overflow-hidden border-2 transition-opacity ${
                        readOnly ? 'cursor-default' : 'hover:opacity-80'
                      }`}
                      style={{ backgroundColor: tint(event.color), borderColor: event.color }}
                    >
                      <div className={`shrink-0 ${compact ? 'h-1' : 'h-2'}`} style={{ backgroundColor: event.color }} />
                      <div className={`min-h-0 ${compact ? 'px-2 py-0.5' : 'px-3 pt-2 pb-1.5'}`}>
                        {compact ? (
                          <div className="text-[11px] font-bold leading-tight truncate" style={{ color: event.color }}>
                            {event.title}
                            <span className="font-semibold opacity-80 ml-1.5">{formatTime(event.start_min, settings.clock_type)}</span>
                          </div>
                        ) : (
                          <>
                            <div className="text-[13px] font-bold leading-snug line-clamp-2" style={{ color: event.color }}>
                              {event.title}
                            </div>
                            <div className="text-[11px] font-semibold leading-tight mt-1.5" style={{ color: event.color }}>
                              {formatRange(event.start_min, event.end_min, settings.clock_type)}
                            </div>
                            {height >= 96 && event.description && (
                              <div className="text-[11px] text-neutral-600 leading-snug mt-1.5 line-clamp-3 whitespace-pre-line">
                                {event.description}
                              </div>
                            )}
                          </>
                        )}
                      </div>
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
