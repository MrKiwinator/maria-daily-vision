import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { notifyNewLastUpdate } from '../services/telegram.js';

const router = Router();
const MAX_BODY = 2000;

router.get('/', authenticate, (req, res) => {
  const limit = Number(req.query.limit);
  const items =
    limit > 0
      ? db
          .prepare(
            `SELECT id, body, created_at, updated_at FROM last_updates
             ORDER BY created_at DESC LIMIT ?`
          )
          .all(Math.min(100, Math.floor(limit)))
      : db
          .prepare(
            'SELECT id, body, created_at, updated_at FROM last_updates ORDER BY created_at DESC'
          )
          .all();
  res.json({ items });
});

router.post('/', authenticate, requireAdmin, (req, res) => {
  const body = (req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Введите текст изменения' });
  if (body.length > MAX_BODY) {
    return res.status(400).json({ error: `Не более ${MAX_BODY} символов` });
  }
  const result = db
    .prepare('INSERT INTO last_updates (body) VALUES (?)')
    .run(body);
  const item = db
    .prepare('SELECT id, body, created_at, updated_at FROM last_updates WHERE id = ?')
    .get(result.lastInsertRowid);
  void notifyNewLastUpdate(item).catch((err) =>
    console.error('[telegram] last-updates:', err.message || err)
  );
  res.status(201).json({ item });
});

router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT id FROM last_updates WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Запись не найдена' });

  const body = (req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Введите текст изменения' });
  if (body.length > MAX_BODY) {
    return res.status(400).json({ error: `Не более ${MAX_BODY} символов` });
  }

  db.prepare(
    "UPDATE last_updates SET body = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(body, existing.id);

  const item = db
    .prepare('SELECT id, body, created_at, updated_at FROM last_updates WHERE id = ?')
    .get(existing.id);
  res.json({ item });
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT id FROM last_updates WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Запись не найдена' });
  db.prepare('DELETE FROM last_updates WHERE id = ?').run(existing.id);
  res.json({ ok: true });
});

export default router;
