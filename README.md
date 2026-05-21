# Maria Daily Vision

Небольшой новостной сайт о Марии: читатели просматривают новости и планы, администраторы публикуют материалы и управляют пользователями.

**Стек:** Vue 3 (фронтенд) + Node.js / Express / SQLite (бэкенд).

---

## Возможности

| Роль | Возможности |
|------|-------------|
| **Пользователь** | Новости, Планы, О Марии, поиск и пагинация |
| **Администратор** | Всё выше + добавление новостей/планов, управление пользователями, редактирование страницы «О Марии» |

При первом запуске создаётся администратор (логин/пароль — в `.env`, по умолчанию `admin` / `admin123`).

---

## Локальный запуск

### Требования

- [Node.js](https://nodejs.org/) 18 или новее
- npm

### 1. Бэкенд

```bash
cd backend
npm install
copy .env.example .env
```

Отредактируйте `backend/.env`:

```env
PORT=3001
JWT_SECRET=ваша-длинная-случайная-строка
ADMIN_USERNAME=admin
ADMIN_PASSWORD=надёжный-пароль
CORS_ORIGIN=http://localhost:5173
```

Запуск:

```bash
npm run dev
```

API: http://localhost:3001  
Проверка: http://localhost:3001/api/health

### 2. Фронтенд (отдельный терминал)

```bash
cd frontend
npm install
npm run dev
```

Сайт: http://localhost:5173  

Vite проксирует `/api` и `/uploads` на бэкенд.

### 3. Вход

Откройте http://localhost:5173 — страница входа.  
Используйте логин и пароль из `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

---

## Структура проекта

```
MariaDailyVision/
├── backend/          # Express API, SQLite, загрузка изображений
│   ├── data/         # База maria.db (создаётся автоматически)
│   ├── uploads/      # Загруженные фото
│   └── src/
├── frontend/         # Vue 3 + Vite
│   └── src/
│       ├── components/
│       ├── views/
│       └── router/
└── README.md
```

---

## Развёртывание на своём сервере (VPS)

Ниже — типичная схема: **Linux VPS** (Ubuntu/Debian), домен, Nginx, SSL, PM2.

### Шаг 1. Подготовка сервера

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### Шаг 2. Клонирование и сборка

```bash
cd /var/www
sudo git clone <URL-вашего-репозитория> maria-daily-vision
cd maria-daily-vision
```

**Бэкенд:**

```bash
cd backend
npm install --production
cp .env.example .env
nano .env
```

Пример продакшен `.env`:

```env
PORT=3001
JWT_SECRET=очень-длинный-секрет-минимум-32-символа
ADMIN_USERNAME=admin
ADMIN_PASSWORD=сложный-пароль
CORS_ORIGIN=https://ваш-домен.ru
SERVE_FRONTEND=true
NODE_ENV=production
PUBLIC_SITE_URL=https://ваш-домен.ru
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=-1001234567890
```

### Telegram-уведомления о новых новостях

1. Создайте бота через [@BotFather](https://t.me/BotFather), скопируйте токен в `TELEGRAM_BOT_TOKEN`.
2. Добавьте бота в канал или группу (для канала — права администратора с публикацией сообщений).
3. Узнайте `chat_id`: для канала обычно вида `-100…` (можно через [@userinfobot](https://t.me/userinfobot) в группе или API `getUpdates` после сообщения в чат).
4. Укажите `PUBLIC_SITE_URL` — публичный HTTPS-адрес сайта (для ссылки «Читать на сайте» и превью фото).
5. Перезапустите API. При старте в логе появится строка `Telegram: уведомления о новых новостях включены`.

Уведомление отправляется только при **создании** новости (не при редактировании). Локально (`localhost`) фото в Telegram не отправляется — только текст; на продакшене с HTTPS уходит сообщение с картинкой.

**Telegram заблокирован на VPS:** в `backend/.env` укажите прокси, через который сервер выходит в интернет:

```env
TELEGRAM_PROXY_URL=http://127.0.0.1:3128
# или socks5://127.0.0.1:1080
```

Проверка с сервера: `curl -x http://127.0.0.1:3128 -I https://api.telegram.org`. После изменения — `pm2 restart mdv-api`; в логе: `Telegram: запросы идут через TELEGRAM_PROXY_URL`.

**Фронтенд:**

```bash
cd ../frontend
npm install
npm run build
```

### Шаг 3. Запуск API через PM2

```bash
cd /var/www/maria-daily-vision/backend
pm2 start src/index.js --name mdv-api
pm2 save
pm2 startup
```

При `SERVE_FRONTEND=true` Express отдаёт собранный фронт из `frontend/dist` и API на одном порту.

### Шаг 4. Nginx + HTTPS

```bash
sudo nano /etc/nginx/sites-available/maria-daily-vision
```

```nginx
server {
    listen 80;
    server_name ваш-домен.ru www.ваш-домен.ru;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/maria-daily-vision /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d ваш-домен.ru -d www.ваш-домен.ru
```

### Шаг 5. Обновление после изменений

```bash
cd /var/www/maria-daily-vision
git pull
cd frontend && npm install && npm run build
cd ../backend && npm install --production
pm2 restart mdv-api
```

### Резервное копирование

Сохраняйте:

- `backend/data/maria.db` — база
- `backend/uploads/` — изображения

---

## Альтернатива: фронт и бэк раздельно

1. Соберите фронт: `cd frontend && npm run build`
2. Разместите `frontend/dist` на Nginx как статику
3. Проксируйте `/api` и `/uploads` на `http://127.0.0.1:3001`
4. В `frontend/.env` укажите `VITE_API_URL=https://ваш-домен.ru` перед сборкой (если API на другом origin)

---

## API (кратко)

| Метод | Путь | Доступ |
|-------|------|--------|
| POST | `/api/auth/login` | Все |
| GET | `/api/auth/me` | Авторизованные |
| GET/POST/DELETE | `/api/users` | Админ |
| GET/POST/PUT/DELETE | `/api/news` | GET — все; POST/PUT/DELETE — админ |
| GET/POST/PUT/DELETE | `/api/plans` | Аналогично |
| GET/PUT | `/api/about` | GET — все; PUT — админ |
| GET/PUT | `/api/settings/tagline` | GET — все; PUT — админ |

Заголовок авторизации: `Authorization: Bearer <token>`

---

## Безопасность

- Смените пароль администратора сразу после первого входа
- Используйте длинный `JWT_SECRET` в продакшене
- Включите HTTPS (Let's Encrypt)
- Не коммитьте `.env` в git

---

## Устранение неполадок

| Проблема | Решение |
|----------|---------|
| CORS ошибка | Проверьте `CORS_ORIGIN` в `.env` бэкенда |
| 401 при запросах | Войдите заново; токен хранится в `localStorage` |
| Не грузятся картинки | Убедитесь, что папка `backend/uploads` доступна и проксируется |
| better-sqlite3 не ставится | На Windows может понадобиться Visual Studio Build Tools |

---

## Лицензия

Проект создан для личного использования.
