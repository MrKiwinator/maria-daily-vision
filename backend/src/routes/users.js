import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', (_req, res) => {
  const users = db
    .prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC')
    .all();
  res.json({ users });
});

router.post('/', (req, res) => {
  const { username, password, role = 'user' } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Укажите логин и пароль' });
  }
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Недопустимая роль' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: 'Пользователь уже существует' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .run(username, hash, role);
  const user = db
    .prepare('SELECT id, username, role, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json({ user });
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Нельзя удалить самого себя' });
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get().c;
  const target = db.prepare('SELECT role FROM users WHERE id = ?').get(id);
  if (target.role === 'admin' && adminCount <= 1) {
    return res.status(400).json({ error: 'Нельзя удалить последнего администратора' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

export default router;
