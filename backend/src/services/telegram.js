import { fetch as undiciFetch, ProxyAgent } from 'undici';
import { SocksProxyAgent } from 'socks-proxy-agent';

let telegramDispatcher;

function getTelegramDispatcher() {
  const proxyUrl = process.env.TELEGRAM_PROXY_URL?.trim();
  if (!proxyUrl) return undefined;
  if (!telegramDispatcher || telegramDispatcher._proxyUrl !== proxyUrl) {
    const lower = proxyUrl.toLowerCase();
    telegramDispatcher =
      lower.startsWith('socks4://') ||
      lower.startsWith('socks5://') ||
      lower.startsWith('socks://')
        ? new SocksProxyAgent(proxyUrl)
        : new ProxyAgent(proxyUrl);
    telegramDispatcher._proxyUrl = proxyUrl;
  }
  return telegramDispatcher;
}

export function isTelegramProxyConfigured() {
  return Boolean(process.env.TELEGRAM_PROXY_URL?.trim());
}

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

/** Обрезка HTML для Telegram без «оборванных» тегов (иначе parse_mode: HTML падает). */
function truncateTelegramHtml(text, maxLen) {
  if (text.length <= maxLen) return text;
  let s = text.slice(0, maxLen);
  const lastOpen = s.lastIndexOf('<');
  const lastClose = s.lastIndexOf('>');
  if (lastOpen > lastClose) s = s.slice(0, lastOpen);
  return s.trimEnd();
}

const TELEGRAM_RETRY_ATTEMPTS = 4;
const TELEGRAM_RETRY_BASE_MS = 1500;

function isRetryableTelegramError(err) {
  const msg = String(err?.message || err).toLowerCase();
  if (msg.includes('нет связи с api.telegram.org')) return true;
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted')) {
    return true;
  }
  if (msg.includes('too many requests') || msg.includes('retry after')) return true;
  if (msg.includes('internal server error') || msg.includes('bad gateway')) return true;
  if (msg.includes('service unavailable') || msg.includes('gateway timeout')) return true;
  return false;
}

function parseRetryAfterMs(err) {
  const match = String(err?.message || '').match(/retry after (\d+)/i);
  if (!match) return null;
  return Math.min(Number(match[1]) * 1000, 60_000);
}

async function withTelegramRetry(label, fn) {
  let lastErr;
  for (let attempt = 0; attempt < TELEGRAM_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isLast = attempt >= TELEGRAM_RETRY_ATTEMPTS - 1;
      if (!isRetryableTelegramError(err) || isLast) throw err;
      const retryAfter = parseRetryAfterMs(err);
      const delay = retryAfter ?? TELEGRAM_RETRY_BASE_MS * 2 ** attempt;
      console.warn(
        `[telegram] ${label}: попытка ${attempt + 1}/${TELEGRAM_RETRY_ATTEMPTS} не удалась, повтор через ${delay}ms:`,
        err.message
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
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

function formatFetchError(err) {
  const parts = [err.message];
  const code = err.cause?.code;
  if (code) parts.push(`code=${code}`);
  if (err.cause?.message && err.cause.message !== err.message) {
    parts.push(err.cause.message);
  }
  return parts.join(' | ');
}

async function telegramFetch(url, init) {
  const dispatcher = getTelegramDispatcher();
  return undiciFetch(url, dispatcher ? { ...init, dispatcher } : init);
}

async function telegramApi(botToken, method, body) {
  let res;
  try {
    res = await telegramFetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    const proxyHint = isTelegramProxyConfigured()
      ? ''
      : '. Если Telegram заблокирован на сервере — задайте TELEGRAM_PROXY_URL';
    throw new Error(
      `нет связи с api.telegram.org (${formatFetchError(err)})${proxyHint}`
    );
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(
      `Telegram ${method}: неверный ответ (HTTP ${res.status})`
    );
  }
  if (!data.ok) {
    const desc = data.description || `Telegram ${method} failed`;
    const migrateId = data.parameters?.migrate_to_chat_id;
    if (migrateId != null) {
      throw new Error(
        `${desc}. Обновите TELEGRAM_CHAT_ID в backend/.env на: ${migrateId}`
      );
    }
    throw new Error(desc);
  }
  return data;
}

function planStatusLabel(status) {
  return status === 'visited' ? 'Посещено' : 'Запланировано';
}

function buildPlanMessage(item, siteUrl, mediaBase) {
  const title = escapeHtml(item.title);
  const excerpt = escapeHtml(truncate(item.description, 300));
  const statusLine = escapeHtml(planStatusLabel(item.status));
  const dateLine = formatPublishedAt(item.created_at);
  const plansLink = siteUrl ? `${siteUrl}/plans` : null;
  const placeLink = item.link_url?.trim() || null;

  let text = '<b>Новый план</b>\n\n';
  text += `<b>${title}</b>`;
  if (excerpt) text += `\n\n${excerpt}`;
  text += `\n\n📌 ${statusLine}`;
  if (dateLine) text += `\n\n📅 ${escapeHtml(dateLine)}`;
  if (placeLink && isPublicHttpsUrl(placeLink)) {
    text += `\n\n<a href="${placeLink}">Ссылка на место / событие</a>`;
  }
  if (plansLink) text += `\n\n<a href="${plansLink}">Открыть на карте</a>`;

  const photoUrl =
    mediaBase && item.image_path
      ? `${mediaBase}${item.image_path.startsWith('/') ? '' : '/'}${item.image_path}`
      : null;

  return { text, photoUrl };
}

/** Уведомление о новом плане (только при создании, не при редактировании). */
export async function notifyNewPlan(item) {
  const { botToken, chatId, siteUrl, mediaBase } = getConfig();
  if (!botToken || !chatId) return;
  if (process.env.NOTIFY_ON_PLANS === 'false') return;

  const { text, photoUrl } = buildPlanMessage(item, siteUrl, mediaBase);

  if (photoUrl && isPublicHttpsUrl(photoUrl)) {
    try {
      await withTelegramRetry('sendPhoto', () =>
        telegramApi(botToken, 'sendPhoto', {
          chat_id: chatId,
          photo: photoUrl,
          caption: truncateTelegramHtml(text, 1024),
          parse_mode: 'HTML',
        })
      );
      return;
    } catch (err) {
      console.error('[telegram] plan sendPhoto failed, fallback to text:', err.message);
    }
  }

  await withTelegramRetry('sendMessage', () =>
    telegramApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text: truncateTelegramHtml(text, 4096),
      parse_mode: 'HTML',
    })
  );
}

/** Уведомление о новой публикации (только при создании, не при редактировании). */
export async function notifyNewNews(item) {
  const { botToken, chatId, siteUrl, mediaBase } = getConfig();
  if (!botToken || !chatId) return;
  if (process.env.NOTIFY_ON_NEWS === 'false') return;

  const { text, photoUrl } = buildNewsMessage(item, siteUrl, mediaBase);

  if (photoUrl && isPublicHttpsUrl(photoUrl)) {
    try {
      await withTelegramRetry('sendPhoto', () =>
        telegramApi(botToken, 'sendPhoto', {
          chat_id: chatId,
          photo: photoUrl,
          caption: truncateTelegramHtml(text, 1024),
          parse_mode: 'HTML',
        })
      );
      return;
    } catch (err) {
      console.error('[telegram] sendPhoto failed, fallback to text:', err.message);
    }
  }

  await withTelegramRetry('sendMessage', () =>
    telegramApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text: truncateTelegramHtml(text, 4096),
      parse_mode: 'HTML',
    })
  );
}

function buildLastUpdateMessage(item, siteUrl) {
  const body = escapeHtml(truncate(item.body, 500));
  const dateLine = formatPublishedAt(item.created_at);
  const link = siteUrl ? `${siteUrl}/last-updates` : null;

  let text = '<b>Новое в «Последних изменениях»</b>\n\n';
  if (body) text += body;
  if (dateLine) text += `\n\n📅 ${escapeHtml(dateLine)}`;
  if (link) text += `\n\n<a href="${link}">Открыть на сайте</a>`;

  return text;
}

/** Уведомление о новой записи в «Последних изменениях» (только при создании). */
export async function notifyNewLastUpdate(item) {
  const { botToken, chatId, siteUrl } = getConfig();
  if (!botToken || !chatId) return;
  if (process.env.NOTIFY_ON_LAST_UPDATES === 'false') return;

  const text = buildLastUpdateMessage(item, siteUrl);

  await withTelegramRetry('sendMessage', () =>
    telegramApi(botToken, 'sendMessage', {
      chat_id: chatId,
      text: truncateTelegramHtml(text, 4096),
      parse_mode: 'HTML',
    })
  );
}
