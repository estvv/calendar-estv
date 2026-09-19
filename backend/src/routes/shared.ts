import { Router } from 'express';
import { getScheduleByShareToken, getEvents } from '../db/index.js';

const router = Router();

const TOKEN_RE = /^[0-9a-f-]{36}$/;

// Public, read-only view of a shared schedule.
router.get('/:token', (req, res) => {
  const { token } = req.params;
  if (!TOKEN_RE.test(token)) return res.status(404).json({ success: false, error: 'Not found' });

  const schedule = getScheduleByShareToken(token);
  if (!schedule) return res.status(404).json({ success: false, error: 'Not found' });

  const { share_token, is_shared, position, ...publicSchedule } = schedule;
  res.json({ success: true, data: { schedule: publicSchedule, events: getEvents(schedule.id) } });
});

export default router;
