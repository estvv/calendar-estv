CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    clock_type TEXT NOT NULL DEFAULT '24h',
    view_mode TEXT NOT NULL DEFAULT 'weekly',
    show_weekend INTEGER NOT NULL DEFAULT 1,
    week_start TEXT NOT NULL DEFAULT 'monday',
    time_increment INTEGER NOT NULL DEFAULT 60,
    start_hour INTEGER NOT NULL DEFAULT 8,
    end_hour INTEGER NOT NULL DEFAULT 18,
    share_token TEXT UNIQUE,
    is_shared INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    day INTEGER NOT NULL,
    start_min INTEGER NOT NULL,
    end_min INTEGER NOT NULL,
    color TEXT NOT NULL DEFAULT '#0ea5e9',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_events_schedule ON events(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedules_share_token ON schedules(share_token);
