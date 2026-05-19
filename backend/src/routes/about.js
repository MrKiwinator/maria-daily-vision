import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import db from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', authenticate, (_req, res) => {
  const about = db.prepare('SELECT * FROM about WHERE id = 1').get();
  res.json({ about });
});

router.put(
  '/',
  authenticate,
  requireAdmin,
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'inline_image', maxCount: 1 },
  ]),
  (req, res) => {
    const about = db.prepare('SELECT * FROM about WHERE id = 1').get();
    let { content_html, photo_path } = about;
    const { content_html: newContent, align } = req.body;

    if (newContent !== undefined) content_html = newContent;

    if (req.files?.photo?.[0]) {
      if (photo_path) {
        const old = path.join(process.cwd(), 'uploads', path.basename(photo_path));
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      photo_path = `/uploads/${req.files.photo[0].filename}`;
    }

    if (req.files?.inline_image?.[0]) {
      const imgPath = `/uploads/${req.files.inline_image[0].filename}`;
      const alignClass = align === 'right' ? 'float-right' : 'float-left';
      const imgTag = `<img src="${imgPath}" class="inline-photo ${alignClass}" alt="" />`;
      content_html = (content_html || '') + imgTag;
    }

    db.prepare(
      'UPDATE about SET photo_path = ?, content_html = ?, updated_at = datetime(\'now\') WHERE id = 1'
    ).run(photo_path, content_html);

    const updated = db.prepare('SELECT * FROM about WHERE id = 1').get();
    res.json({ about: updated });
  }
);

export default router;
