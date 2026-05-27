/** Парсинг координат из буфера Яндекс.Карт: «56.331398, 43.997294» */
export function parseCoordsString(raw) {
  const s = String(raw).trim();
  if (!s) return null;

  const match = s.match(/^(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)/);
  if (!match) return null;

  const latitude = Number(match[1].replace(',', '.'));
  const longitude = Number(match[2].replace(',', '.'));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  return { latitude, longitude };
}

export function formatCoordsString(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '';
  return `${latitude}, ${longitude}`;
}
