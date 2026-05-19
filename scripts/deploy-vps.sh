#!/bin/bash
# Запускать на VPS из корня проекта: bash scripts/deploy-vps.sh
set -e

echo "==> Установка зависимостей бэкенда..."
cd backend
npm install --production

echo "==> Сборка фронтенда..."
cd ../frontend
npm install
npm run build

echo "==> Перезапуск API..."
cd ../backend
pm2 restart mdv-api 2>/dev/null || pm2 start src/index.js --name mdv-api

pm2 save
echo "==> Готово. Проверьте: pm2 status && curl -s http://127.0.0.1:3001/api/health"
