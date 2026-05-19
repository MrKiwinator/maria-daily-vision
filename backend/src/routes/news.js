import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import db from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();
const PER_PAGE = 10;

function buildListQuery(search, date) {
  let sql = 'SELECT id, title, content, image_path, published_at FROM news WHERE 1=1';
  const params = [];
  if (search) {
    sql += ' AND title LIKE ?';
    params.push(`%${search}%`);
  }
  if (date) {
    sql += " AND date(published_at) = date(?)";
    params.push(date);
  }
  sql += ' ORDER BY published_at DESC';
  return { sql, params };
}

router.get('/', authenticate, (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const search = (req.query.search || '').trim();
  const date = (req.query.date || '').trim();

  const { sql, params } = buildListQuery(search, date);
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM (${sql})`).get(...params);
  const total = countRow.total;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const offset = (page - 1) * PER_PAGE;

  const items = db.prepare(`${sql} LIMIT ? OFFSET ?`).all(...params, PER_PAGE, offset);
  res.json({ items, page, totalPages, total, perPage: PER_PAGE });
});

router.get('/:id', authenticate, (req, res) => {
  const item = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Новость не найдена' });
  res.json({ item });
});

router.post('/', authenticate, requireAdmin, upload.single('image'), (req, res) => {
  const { title, content, published_at } = req.body;
  if (!title?.trim() || !content?.trim()) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Укажите заголовок и текст' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Изображение обязательно' });
  }
  const image_path = `/uploads/${req.file.filename}`;
  const pubDate = published_at || new Date().toISOString();
  const result = db
    .prepare(
      'INSERT INTO news (title, content, image_path, published_at) VALUES (?, ?, ?, ?)'
    )
    .run(title.trim(), content.trim(), image_path, pubDate);
  const item = db.prepare('SELECT * FROM news WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ item });
});

router.put('/:id', authenticate, requireAdmin, upload.single('image'), (req, res) => {
  const item = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Новость не найдена' });

  const { title, content, published_at } = req.body;
  const newTitle = title?.trim() || item.title;
  const newContent = content?.trim() || item.content;
  let image_path = item.image_path;

  if (req.file) {
    const oldPath = path.join(process.cwd(), item.image_path.replace(/^\//, ''));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    image_path = `/uploads/${req.file.filename}`;
  }

  db.prepare(
    'UPDATE news SET title = ?, content = ?, image_path = ?, published_at = ? WHERE id = ?'
  ).run(newTitle, newContent, image_path, published_at || item.published_at, item.id);

  const updated = db.prepare('SELECT * FROM news WHERE id = ?').get(item.id);
  res.json({ item: updated });
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const item = db.prepare('SELECT * FROM news WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Новость не найдена' });
  const filePath = path.join(process.cwd(), 'uploads', path.basename(item.image_path));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.prepare('DELETE FROM news WHERE id = ?').run(item.id);
  res.json({ ok: true });
});

export default router;
