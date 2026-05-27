import fs from 'fs';
import path from 'path';
import db from '../db.js';

export function unlinkUpload(imagePath) {
  if (!imagePath) return;
  const filePath = path.join(process.cwd(), 'uploads', path.basename(imagePath));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export function deleteVisitPhotosForPlan(planId) {
  const photos = db
    .prepare('SELECT id, image_path FROM plan_visit_photos WHERE plan_id = ?')
    .all(planId);
  for (const photo of photos) {
    unlinkUpload(photo.image_path);
  }
  db.prepare('DELETE FROM plan_visit_photos WHERE plan_id = ?').run(planId);
}

export function getVisitPhotoCount(planId) {
  return db
    .prepare('SELECT COUNT(*) as c FROM plan_visit_photos WHERE plan_id = ?')
    .get(planId).c;
}
