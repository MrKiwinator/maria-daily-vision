import db from './db.js';

function plansColumns() {
  return db.prepare('PRAGMA table_info(plans)').all().map((c) => c.name);
}

function usersRoleAllowsSuperuser() {
  const row = db.prepare('SELECT sql FROM sqlite_master WHERE type = ? AND name = ?').get(
    'table',
    'users'
  );
  return row?.sql?.includes('superuser') ?? false;
}

export function runMigrations() {
  migrateUsersRole();
  migratePlansTable();
  migratePlanVisitPhotos();
}

function migratePlanVisitPhotos() {
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'plan_visit_photos'")
    .get();
  if (exists) return;

  db.exec(`
    CREATE TABLE plan_visit_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      image_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_plan_visit_photos_plan_id ON plan_visit_photos(plan_id);
  `);
  console.log('Migration: plan_visit_photos table created');
}

function migrateUsersRole() {
  if (usersRoleAllowsSuperuser()) return;

  db.exec(`
    PRAGMA foreign_keys = OFF;
    CREATE TABLE users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'superuser', 'user')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO users_new (id, username, password_hash, role, created_at)
      SELECT id, username, password_hash, role, created_at FROM users;
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
    PRAGMA foreign_keys = ON;
  `);
  console.log('Migration: users table supports superuser role');
}

function migratePlansTable() {
  const cols = plansColumns();
  if (cols.includes('latitude')) return;

  db.exec(`
    CREATE TABLE plans_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      link_url TEXT,
      image_path TEXT,
      latitude REAL NOT NULL DEFAULT 55.7558,
      longitude REAL NOT NULL DEFAULT 37.6173,
      status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned', 'visited')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  if (cols.length > 0) {
    const rows = db.prepare('SELECT * FROM plans').all();
    const insert = db.prepare(`
      INSERT INTO plans_new (title, description, image_path, latitude, longitude, status, created_at, updated_at)
      VALUES (?, ?, ?, 55.7558, 37.6173, 'planned', ?, datetime('now'))
    `);
    for (const row of rows) {
      const desc = row.content ?? row.description ?? '';
      insert.run(row.title, desc, row.image_path || null, row.created_at || new Date().toISOString());
    }
  }

  db.exec('DROP TABLE plans; ALTER TABLE plans_new RENAME TO plans;');
  console.log('Migration: plans table updated for map planner');
}
