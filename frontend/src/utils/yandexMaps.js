const YANDEX_SCRIPT_ID = 'yandex-maps-api';

export function loadYandexMaps() {
  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;
  if (!apiKey) {
    return Promise.reject(new Error('Не задан ключ VITE_YANDEX_MAPS_API_KEY'));
  }

  if (window.ymaps?.Map) {
    return new Promise((resolve) => {
      window.ymaps.ready(() => resolve(window.ymaps));
    });
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(YANDEX_SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => {
        window.ymaps.ready(() => resolve(window.ymaps));
      });
      existing.addEventListener('error', () => reject(new Error('Не удалось загрузить Яндекс.Карты')));
      return;
    }

    const script = document.createElement('script');
    script.id = YANDEX_SCRIPT_ID;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      window.ymaps.ready(() => resolve(window.ymaps));
    };
    script.onerror = () => reject(new Error('Не удалось загрузить Яндекс.Карты'));
    document.head.appendChild(script);
  });
}

export const PLAN_MARKER_COLORS = {
  planned: '#2563eb',
  visited: '#16a34a',
};
