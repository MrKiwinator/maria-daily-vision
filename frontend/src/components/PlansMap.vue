<template>
  <div class="plans-map-wrap">
    <div ref="mapEl" class="plans-map" />
    <p v-if="mapError" class="map-error">{{ mapError }}</p>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { loadYandexMaps, PLAN_MARKER_COLORS } from '../utils/yandexMaps.js';

const props = defineProps({
  plans: { type: Array, default: () => [] },
  selectedId: { type: Number, default: null },
});

const emit = defineEmits(['select']);

const mapEl = ref(null);
const mapError = ref('');

let map = null;
let collection = null;

function defaultCenter(plans) {
  if (!plans.length) return [55.7558, 37.6173];
  const lat = plans.reduce((s, p) => s + p.latitude, 0) / plans.length;
  const lng = plans.reduce((s, p) => s + p.longitude, 0) / plans.length;
  return [lat, lng];
}

function buildPlacemark(plan) {
  const color = PLAN_MARKER_COLORS[plan.status] || PLAN_MARKER_COLORS.planned;
  const placemark = new window.ymaps.Placemark(
    [plan.latitude, plan.longitude],
    { hintContent: plan.title },
    {
      preset: 'islands#circleDotIcon',
      iconColor: color,
    }
  );
  placemark.events.add('click', () => emit('select', plan));
  return placemark;
}

function renderMarkers() {
  if (!map || !collection) return;
  collection.removeAll();
  for (const plan of props.plans) {
    collection.add(buildPlacemark(plan));
  }
  if (props.plans.length) {
    const bounds = collection.getBounds();
    if (bounds) {
      map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
    }
  }
}

function focusSelected() {
  if (!map || props.selectedId == null) return;
  const plan = props.plans.find((p) => p.id === props.selectedId);
  if (plan) {
    map.setCenter([plan.latitude, plan.longitude], 14, { duration: 300 });
  }
}

onMounted(async () => {
  try {
    await loadYandexMaps();
    map = new window.ymaps.Map(mapEl.value, {
      center: defaultCenter(props.plans),
      zoom: props.plans.length ? 10 : 5,
      controls: ['zoomControl', 'geolocationControl'],
    });
    collection = new window.ymaps.GeoObjectCollection();
    map.geoObjects.add(collection);
    renderMarkers();
    focusSelected();
  } catch (e) {
    mapError.value = e.message;
  }
});

watch(
  () => props.plans,
  () => {
    renderMarkers();
  },
  { deep: true }
);

watch(
  () => props.selectedId,
  () => {
    focusSelected();
  }
);

onBeforeUnmount(() => {
  if (map) {
    map.destroy();
    map = null;
  }
});
</script>

<style scoped>
.plans-map-wrap {
  position: relative;
  min-height: 320px;
  height: 100%;
}

.plans-map {
  width: 100%;
  height: 100%;
  min-height: 320px;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
}

.map-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  text-align: center;
  background: var(--bg-card);
  color: var(--text-muted);
  font-size: 0.9rem;
}
</style>
