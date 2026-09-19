import type {
  Schedule, ScheduleSummary, ScheduleSettingsInput, CalendarEvent, EventInput, ScheduleExport, PublicSchedule,
} from '../types';
import { getToken, removeToken } from './auth';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request<T>(endpoint: string, options: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (auth && response.status === 401) {
    removeToken();
    window.location.href = '/login';
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

export const schedulesApi = {
  list: (): Promise<ScheduleSummary[]> => request('/schedules'),

  get: (id: number): Promise<{ schedule: Schedule; events: CalendarEvent[] }> =>
    request(`/schedules/${id}`),

  create: (input: ScheduleSettingsInput & { name: string }): Promise<Schedule> =>
    request('/schedules', { method: 'POST', body: JSON.stringify(input) }),

  update: (id: number, updates: ScheduleSettingsInput): Promise<Schedule> =>
    request(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

  delete: (id: number): Promise<void> => request(`/schedules/${id}`, { method: 'DELETE' }),

  duplicate: (id: number): Promise<Schedule> => request(`/schedules/${id}/duplicate`, { method: 'POST' }),

  share: (id: number): Promise<{ share_token: string }> =>
    request(`/schedules/${id}/share`, { method: 'POST' }),

  unshare: (id: number): Promise<void> => request(`/schedules/${id}/share`, { method: 'DELETE' }),

  export: (id: number): Promise<ScheduleExport> => request(`/schedules/${id}/export`),

  import: (file: ScheduleExport): Promise<{ schedule: Schedule; events: CalendarEvent[] }> =>
    request('/schedules/import', { method: 'POST', body: JSON.stringify(file) }),

  createEvents: (scheduleId: number, input: EventInput): Promise<CalendarEvent[]> =>
    request(`/schedules/${scheduleId}/events`, { method: 'POST', body: JSON.stringify(input) }),
};

export const eventsApi = {
  update: (id: number, updates: Partial<EventInput>): Promise<CalendarEvent> =>
    request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

  delete: (id: number): Promise<void> => request(`/events/${id}`, { method: 'DELETE' }),
};

export const sharedApi = {
  get: (token: string): Promise<{ schedule: PublicSchedule; events: CalendarEvent[] }> =>
    request(`/shared/${token}`, {}, false),
};
