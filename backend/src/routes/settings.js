import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/tagline', authenticate, (_req, res) => {
  const row = db.prepare('SELECT tagline FROM site_settings WHERE id = 1').get();
  res.json({ tagline: row?.tagline || '' });
});

router.put('/tagline', authenticate, requireAdmin, (req, res) => {
  const { tagline } = req.body;
  if (!tagline?.trim()) {
    return res.status(400).json({ error: 'Укажите описание сайта' });
  }
  db.prepare('UPDATE site_settings SET tagline = ? WHERE id = 1').run(tagline.trim());
  res.json({ tagline: tagline.trim() });
});

export default router;
