export function truncate(text, max = 180) {
  if (!text) return '';
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trim() + '…';
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Время публикации в формате чч:мм (локаль пользователя). */
export function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toInputDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

export function toInputTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** dateStr YYYY-MM-DD, timeStr HH:mm — в ISO UTC для API. */
export function fromLocalDateTimeToIso(dateStr, timeStr) {
  if (!dateStr) return new Date().toISOString();
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [hh, mm] = (timeStr || '00:00').split(':').map((x) => Number(x) || 0);
  return new Date(y, mo - 1, d, hh, mm, 0, 0).toISOString();
}
