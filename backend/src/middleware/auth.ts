import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

function jwtSecret(): string {
  return process.env.JWT_SECRET || 'development-secret';
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Missing authorization token' });
  }

  try {
    jwt.verify(authHeader.substring(7), jwtSecret());
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function generateToken(): string {
  return jwt.sign({ userId: 'user' }, jwtSecret(), { expiresIn: '30d' });
}
