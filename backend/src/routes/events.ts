import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getEventById, updateEvent, deleteEvent } from '../db/index.js';
import { parseId, validateEvent } from '../validation.js';

const router = Router();
router.use(authMiddleware);

router.put('/:id', (req, res) => {
  const id = parseId(req.params.id);
  const existing = id ? getEventById(id) : undefined;
  if (!existing) return res.status(404).json({ success: false, error: 'Event not found' });

  const updates = validateEvent(req.body, true);
  if (typeof updates === 'string') return res.status(400).json({ success: false, error: updates });

  const start = updates.start_min ?? existing.start_min;
  const end = updates.end_min ?? existing.end_min;
  if (start >= end) return res.status(400).json({ success: false, error: 'Event must end after it starts' });

  res.json({ success: true, data: updateEvent(existing.id, updates) });
});

router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id || !getEventById(id)) return res.status(404).json({ success: false, error: 'Event not found' });
  deleteEvent(id);
  res.json({ success: true, data: null });
});

export default router;
