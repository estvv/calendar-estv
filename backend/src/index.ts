import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import { initDatabase } from './db/index.js';
import authRoutes from './routes/auth.js';
import schedulesRoutes from './routes/schedules.js';
import eventsRoutes from './routes/events.js';
import sharedRoutes from './routes/shared.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3013;

// Reached through Caddy -> nginx -> here (two proxies), so req.ip is taken
// from the client-facing end of the X-Forwarded-For chain.
app.set('trust proxy', 2);
app.disable('x-powered-by');

initDatabase();

app.use(helmet({
  contentSecurityPolicy: {
    directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
}));

app.use(compression());
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, slow down' },
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts' },
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', limiter);
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/shared', sharedRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err && typeof err === 'object' && (err as { type?: string }).type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Invalid JSON' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
