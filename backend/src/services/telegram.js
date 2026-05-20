function getConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const siteUrl = (process.env.PUBLIC_SITE_URL || '').replace(/\/$/, '');
  const mediaBase = (process.env.TELEGRAM_MEDIA_BASE_URL || siteUrl).replace(/\/$/, '');
  return { botToken, chatId, siteUrl, mediaBase };
}

export function isTelegramConfigured() {
  const { botToken, chatId } = getConfig();
  return Boolean(botToken && chatId);
}

function isPublicHttpsUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return host !== 'localhost' && host !== '127.0.0.1';
  } catch {
    return false;
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncate(text, max = 300) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trim()}…`;
}

function formatPublishedAt(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildNewsMessage(item, siteUrl, mediaBase) {
  const title = escapeHtml(item.title);
  const excerpt = escapeHtml(truncate(item.content, 300));
  const dateLine = formatPublishedAt(item.published_at);
  const link = siteUrl ? `${siteUrl}/news/${item.id}` : null;

  let text = '<b>Новая новость</b>\n\n';
  text += `<b>${title}</b>`;
  if (excerpt) text += `\n\n${excerpt}`;
  if (dateLine) text += `\n\n📅 ${escapeHtml(dateLine)}`;
  if (link) text += `\n\n<a href="${link}">Читать на сайте</a>`;

  const photoUrl =
    mediaBase && item.image_path
      ? `${mediaBase}${item.image_path.startsWith('/') ? '' : '/'}${item.image_path}`
      : null;

  return { text, photoUrl };
}

async function telegramApi(botToken, method, body) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || `Telegram ${method} failed`);
  }
  return data;
}

/** Уведомление о новой публикации (только при создании, не при редактировании). */
export async function notifyNewNews(item) {
  const { botToken, chatId, siteUrl, mediaBase } = getConfig();
  if (!botToken || !chatId) return;
  if (process.env.NOTIFY_ON_NEWS === 'false') return;

  const { text, photoUrl } = buildNewsMessage(item, siteUrl, mediaBase);

  if (photoUrl && isPublicHttpsUrl(photoUrl)) {
    try {
      await telegramApi(botToken, 'sendPhoto', {
        chat_id: chatId,
        photo: photoUrl,
        caption: text.slice(0, 1024),
        parse_mode: 'HTML',
      });
      return;
    } catch (err) {
      console.error('[telegram] sendPhoto failed, fallback to text:', err.message);
    }
  }

  await telegramApi(botToken, 'sendMessage', {
    chat_id: chatId,
    text: text.slice(0, 4096),
    parse_mode: 'HTML',
  });
}
