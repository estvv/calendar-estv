# calendar-estv

Password-protected weekly schedule maker. Build one or more recurring timetables (courses, work shifts, routines) on a day × hour grid, then print them, download them as PNG, export/import them as JSON, or share a read-only link.

## Features

- Multiple schedules, each with its own settings
- Events with title, colour, description, start/end time; one event can be created on several days at once
- Click an empty grid cell to add an event at that slot; click an event to edit, duplicate or delete it
- Per-schedule settings: 12h/24h clock, weekly/daily view, show weekend, week starts Monday/Sunday, 15/30/60 min increment, visible hour range
- Save: print (PDF), download PNG, export JSON; import JSON
- Read-only share links (`/s/<token>`)

## Stack

- Backend: Node 20, Express, TypeScript, better-sqlite3
- Frontend: React 19, Vite, Tailwind v4
- Deployed with Docker Compose behind Caddy (`caddy_net`)

## Local development

```bash
cp .env.example .env          # set AUTH_PASSWORD and JWT_SECRET
cd backend && npm install && npm run dev      # http://localhost:3013
cd frontend && npm install && npm run dev     # http://localhost:5173 (proxies /api)
```

## Production

```bash
docker compose up -d --build
```

The frontend container listens on port 80 inside `caddy_net`; the backend stores its SQLite database in `./data/calendar.db`.
