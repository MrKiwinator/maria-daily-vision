import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import db from '../db.js';
import { authenticate, requirePlanEditor } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  deleteVisitPhotosForPlan,
  getVisitPhotoCount,
  unlinkUpload,
} from '../utils/planPhotos.js';

const router = Router();

const PLAN_FIELDS =
  'id, title, description, link_url, image_path, latitude, longitude, status, created_at, updated_at';

const PHOTO_FIELDS = 'id, plan_id, image_path, created_at';

function attachPhotoCounts(items) {
  const countStmt = db.prepare(
    'SELECT COUNT(*) as c FROM plan_visit_photos WHERE plan_id = ?'
  );
  return items.map((item) => ({
    ...item,
    visit_photo_count: countStmt.get(item.id).c,
  }));
}

function parseCoords(body, fallback) {
  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return fallback;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { latitude: lat, longitude: lng };
}

function getPlanOr404(id, res) {
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
  if (!plan) {
    res.status(404).json({ error: 'План не найден' });
    return null;
  }
  return plan;
}

router.get('/', authenticate, (req, res) => {
  const status = (req.query.status || '').trim();
  let sql = `SELECT ${PLAN_FIELDS} FROM plans WHERE 1=1`;
  const params = [];
  if (status === 'planned' || status === 'visited') {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY updated_at DESC';
  const items = attachPhotoCounts(db.prepare(sql).all(...params));
  res.json({ items });
});

router.get('/:id/photos', authenticate, (req, res) => {
  const plan = getPlanOr404(req.params.id, res);
  if (!plan) return;
  if (plan.status !== 'visited') {
    return res.json({ photos: [] });
  }
  const photos = db
    .prepare(
      `SELECT ${PHOTO_FIELDS} FROM plan_visit_photos WHERE plan_id = ? ORDER BY created_at ASC, id ASC`
    )
    .all(plan.id);
  res.json({ photos });
});

router.post(
  '/:id/photos',
  authenticate,
  requirePlanEditor,
  upload.array('images', 30),
  (req, res) => {
    const plan = getPlanOr404(req.params.id, res);
    if (!plan) {
      for (const file of req.files || []) fs.unlinkSync(file.path);
      return;
    }
    if (plan.status !== 'visited') {
      for (const file of req.files || []) fs.unlinkSync(file.path);
      return res.status(400).json({
        error: 'Фото посещения можно добавлять только к местам со статусом «Посещено»',
      });
    }
    if (!req.files?.length) {
      return res.status(400).json({ error: 'Выберите хотя бы одно изображение' });
    }

    const insert = db.prepare(
      'INSERT INTO plan_visit_photos (plan_id, image_path) VALUES (?, ?)'
    );
    const photos = [];
    for (const file of req.files) {
      const image_path = `/uploads/${file.filename}`;
      const result = insert.run(plan.id, image_path);
      photos.push(
        db.prepare(`SELECT ${PHOTO_FIELDS} FROM plan_visit_photos WHERE id = ?`).get(
          result.lastInsertRowid
        )
      );
    }

    db.prepare("UPDATE plans SET updated_at = datetime('now') WHERE id = ?").run(plan.id);
    res.status(201).json({ photos });
  }
);

router.delete('/:id/photos/:photoId', authenticate, requirePlanEditor, (req, res) => {
  const plan = getPlanOr404(req.params.id, res);
  if (!plan) return;

  const photo = db
    .prepare(`SELECT ${PHOTO_FIELDS} FROM plan_visit_photos WHERE id = ? AND plan_id = ?`)
    .get(req.params.photoId, plan.id);
  if (!photo) return res.status(404).json({ error: 'Фото не найдено' });

  unlinkUpload(photo.image_path);
  db.prepare('DELETE FROM plan_visit_photos WHERE id = ?').run(photo.id);
  db.prepare("UPDATE plans SET updated_at = datetime('now') WHERE id = ?").run(plan.id);
  res.json({ ok: true });
});

router.get('/:id', authenticate, (req, res) => {
  const item = db
    .prepare(`SELECT ${PLAN_FIELDS} FROM plans WHERE id = ?`)
    .get(req.params.id);
  if (!item) return res.status(404).json({ error: 'План не найден' });
  res.json({
    item: { ...item, visit_photo_count: getVisitPhotoCount(item.id) },
  });
});

router.post('/', authenticate, requirePlanEditor, upload.single('image'), (req, res) => {
  const { title, description, link_url, status } = req.body;
  if (!title?.trim()) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Укажите название' });
  }

  const coords = parseCoords(req.body, { latitude: 55.7558, longitude: 37.6173 });
  if (!coords) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Некорректные координаты' });
  }

  const planStatus = status === 'visited' ? 'visited' : 'planned';
  const image_path = req.file ? `/uploads/${req.file.filename}` : null;

  const result = db
    .prepare(
      `INSERT INTO plans (title, description, link_url, image_path, latitude, longitude, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      title.trim(),
      (description || '').trim(),
      (link_url || '').trim() || null,
      image_path,
      coords.latitude,
      coords.longitude,
      planStatus
    );

  const item = db
    .prepare(`SELECT ${PLAN_FIELDS} FROM plans WHERE id = ?`)
    .get(result.lastInsertRowid);
  res.status(201).json({ item: { ...item, visit_photo_count: 0 } });
});

router.put('/:id', authenticate, requirePlanEditor, upload.single('image'), (req, res) => {
  const item = db.prepare('SELECT * FROM plans WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'План не найден' });

  const { title, description, link_url, status } = req.body;
  const newTitle = title?.trim() || item.title;
  const newDescription = description !== undefined ? String(description).trim() : item.description;
  const newLink = link_url !== undefined ? (String(link_url).trim() || null) : item.link_url;
  const planStatus =
    status === 'visited' ? 'visited' : status === 'planned' ? 'planned' : item.status;

  let image_path = item.image_path;
  if (req.file) {
    if (item.image_path) unlinkUpload(item.image_path);
    image_path = `/uploads/${req.file.filename}`;
  }

  const coords = parseCoords(req.body, {
    latitude: item.latitude,
    longitude: item.longitude,
  });
  if (!coords) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Некорректные координаты' });
  }

  db.prepare(
    `UPDATE plans SET title = ?, description = ?, link_url = ?, image_path = ?,
     latitude = ?, longitude = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    newTitle,
    newDescription,
    newLink,
    image_path,
    coords.latitude,
    coords.longitude,
    planStatus,
    item.id
  );

  const updated = db.prepare(`SELECT ${PLAN_FIELDS} FROM plans WHERE id = ?`).get(item.id);
  res.json({
    item: { ...updated, visit_photo_count: getVisitPhotoCount(item.id) },
  });
});

router.delete('/:id', authenticate, requirePlanEditor, (req, res) => {
  const item = db.prepare('SELECT * FROM plans WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'План не найден' });
  if (item.image_path) unlinkUpload(item.image_path);
  deleteVisitPhotosForPlan(item.id);
  db.prepare('DELETE FROM plans WHERE id = ?').run(item.id);
  res.json({ ok: true });
});

export default router;
