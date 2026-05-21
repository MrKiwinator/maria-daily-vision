import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import db from './db.js';

dotenv.config();

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_path TEXT NOT NULL,
    published_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_path TEXT NOT NULL,
    published_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS about (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    photo_path TEXT,
    content_html TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    tagline TEXT NOT NULL DEFAULT 'Ежедневные новости и планы из жизни Марии'
  );

  CREATE TABLE IF NOT EXISTS news_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_news_comments_news_id ON news_comments(news_id);

  CREATE TABLE IF NOT EXISTS last_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const mrKiwiExists = db.prepare("SELECT id FROM users WHERE username = 'MrKiwi'").get();
const legacyAdmin = db
  .prepare("SELECT id FROM users WHERE username = 'admin' AND role = 'admin'")
  .get();
if (legacyAdmin && !mrKiwiExists) {
  db.prepare("UPDATE users SET username = 'MrKiwi' WHERE id = ?").run(legacyAdmin.id);
  console.log('Admin username updated: admin → MrKiwi');
}

const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
if (!adminExists) {
  const username = process.env.ADMIN_USERNAME || 'MrKiwi';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
  ).run(username, hash, 'admin');
  console.log(`Admin created: ${username}`);
}

const aboutExists = db.prepare('SELECT id FROM about WHERE id = 1').get();
if (!aboutExists) {
  db.prepare('INSERT INTO about (id, content_html) VALUES (1, ?)').run(
    '<p>Добро пожаловать на страницу о Марии. Здесь будет её история и фотографии.</p>'
  );
}

const settingsExists = db.prepare('SELECT id FROM site_settings WHERE id = 1').get();
if (!settingsExists) {
  db.prepare('INSERT INTO site_settings (id, tagline) VALUES (1, ?)').run(
    'Ежедневные новости и планы из жизни Марии — личный взгляд на каждый день'
  );
}

console.log('Database initialized.');
