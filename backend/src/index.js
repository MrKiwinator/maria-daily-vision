import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import './initDb.js';

import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import newsRoutes from './routes/news.js';
import plansRoutes from './routes/plans.js';
import aboutRoutes from './routes/about.js';
import settingsRoutes from './routes/settings.js';
import lastUpdatesRoutes from './routes/lastUpdates.js';
import { uploadsDir } from './middleware/upload.js';
import { isTelegramConfigured, isTelegramProxyConfigured } from './services/telegram.js';

if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET not set. Using default (unsafe for production).');
  process.env.JWT_SECRET = 'dev-secret-change-in-production';
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/about', aboutRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/last-updates', lastUpdatesRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'Maria Daily Vision API' });
});

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (process.env.SERVE_FRONTEND === 'true') {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Файл слишком большой (макс. 5 МБ)' });
  }
  res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`Maria Daily Vision API: http://localhost:${PORT}`);
  if (isTelegramConfigured()) {
    console.log('Telegram: уведомления о новых новостях включены');
    if (isTelegramProxyConfigured()) {
      console.log('Telegram: запросы идут через TELEGRAM_PROXY_URL');
    }
  }
});
