import { Router } from 'express';
import { timingSafeEqual } from 'crypto';
import { generateToken } from '../middleware/auth.js';

const router = Router();

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

router.post('/login', (req, res) => {
  const { password } = req.body ?? {};

  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ success: false, error: 'Password required' });
  }

  const authPassword = process.env.AUTH_PASSWORD;
  if (!authPassword) {
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  if (!safeEqual(password, authPassword)) {
    return res.status(401).json({ success: false, error: 'Invalid password' });
  }

  res.json({ success: true, data: { token: generateToken() } });
});

export default router;
