export type ClockType = '12h' | '24h';
export type ViewMode = 'weekly' | 'daily';
export type WeekStart = 'monday' | 'sunday';

export interface Schedule {
  id: number;
  name: string;
  clock_type: ClockType;
  view_mode: ViewMode;
  show_weekend: number;
  week_start: WeekStart;
  time_increment: number;
  start_hour: number;
  end_hour: number;
  share_token: string | null;
  is_shared: number;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduleSummary extends Schedule {
  event_count: number;
}

export type ScheduleSettings = Pick<Schedule,
  'clock_type' | 'view_mode' | 'show_weekend' | 'week_start' | 'time_increment' | 'start_hour' | 'end_hour'
>;

// day: 0 = Monday … 6 = Sunday. Times are minutes since midnight.
export interface CalendarEvent {
  id: number;
  schedule_id: number;
  title: string;
  description: string;
  day: number;
  start_min: number;
  end_min: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface EventInput {
  title: string;
  description?: string;
  day?: number;
  days?: number[];
  start_min: number;
  end_min: number;
  color?: string;
}

export interface ScheduleSettingsInput {
  name?: string;
  clock_type?: ClockType;
  view_mode?: ViewMode;
  show_weekend?: boolean;
  week_start?: WeekStart;
  time_increment?: number;
  start_hour?: number;
  end_hour?: number;
}

export interface ScheduleExport {
  version: 1;
  schedule: {
    name: string;
    clock_type: ClockType;
    view_mode: ViewMode;
    show_weekend: number;
    week_start: WeekStart;
    time_increment: number;
    start_hour: number;
    end_hour: number;
  };
  events: Array<Pick<CalendarEvent, 'title' | 'description' | 'day' | 'start_min' | 'end_min' | 'color'>>;
}

export interface PublicSchedule extends Omit<Schedule, 'share_token' | 'is_shared' | 'position'> {}
