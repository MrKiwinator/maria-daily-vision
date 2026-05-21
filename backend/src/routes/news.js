import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import db from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { notifyNewNews } from '../services/telegram.js';

const router = Router();
const PER_PAGE = 11;
const MAX_COMMENT_LENGTH = 2000;

const commentsForNewsSql = `
  SELECT c.id, c.news_id, c.user_id, u.username, c.body, c.created_at
  FROM news_comments c
  JOIN users u ON u.id = c.user_id
  WHERE c.news_id = ?
  ORDER BY c.created_at ASC
`;

function buildListQuery(search, date) {
  let sql = `SELECT n.id, n.title, n.content, n.image_path, n.published_at,
    (SELECT COUNT(*) FROM news_comments c WHERE c.news_id = n.id) AS comment_count
    FROM news n WHERE 1=1`;
  const params = [];
  if (search) {
    sql += ' AND n.title LIKE ?';
    params.push(`%${search}%`);
  }
  if (date) {
    sql += " AND date(n.published_at) = date(?)";
    params.push(date);
  }
  sql += ' ORDER BY n.published_at DESC';
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

router.get('/:id/comments', authenticate, (req, res) => {
  const news = db.prepare('SELECT id FROM news WHERE id = ?').get(req.params.id);
  if (!news) return res.status(404).json({ error: 'Новость не найдена' });
  const comments = db.prepare(commentsForNewsSql).all(req.params.id);
  res.json({ comments });
});

router.post('/:id/comments', authenticate, (req, res) => {
  const news = db.prepare('SELECT id FROM news WHERE id = ?').get(req.params.id);
  if (!news) return res.status(404).json({ error: 'Новость не найдена' });

  const body = (req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Введите текст комментария' });
  if (body.length > MAX_COMMENT_LENGTH) {
    return res.status(400).json({ error: `Комментарий не длиннее ${MAX_COMMENT_LENGTH} символов` });
  }

  const result = db
    .prepare('INSERT INTO news_comments (news_id, user_id, body) VALUES (?, ?, ?)')
    .run(news.id, req.user.id, body);

  const comment = db
    .prepare(
      `SELECT c.id, c.news_id, c.user_id, u.username, c.body, c.created_at
       FROM news_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`
    )
    .get(result.lastInsertRowid);

  res.status(201).json({ comment });
});

router.delete('/:id/comments/:commentId', authenticate, (req, res) => {
  const comment = db
    .prepare('SELECT * FROM news_comments WHERE id = ? AND news_id = ?')
    .get(req.params.commentId, req.params.id);
  if (!comment) return res.status(404).json({ error: 'Комментарий не найден' });

  const isOwner = comment.user_id === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Нельзя удалить чужой комментарий' });
  }

  db.prepare('DELETE FROM news_comments WHERE id = ?').run(comment.id);
  res.json({ ok: true });
});

router.get('/:id', authenticate, (req, res) => {
  const item = db
    .prepare(
      `SELECT n.*,
        (SELECT COUNT(*) FROM news_comments c WHERE c.news_id = n.id) AS comment_count
       FROM news n WHERE n.id = ?`
    )
    .get(req.params.id);
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
  void notifyNewNews(item).catch((err) => console.error('[telegram]', err.message || err));
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
