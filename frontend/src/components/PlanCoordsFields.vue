<template>
  <div class="plan-coords">
    <div class="form-group">
      <label for="plan-coords-paste">Координаты из Яндекс.Карт</label>
      <input
        id="plan-coords-paste"
        v-model="coordsText"
        type="text"
        class="coords-paste-input"
        placeholder="56.331398, 43.997294"
        autocomplete="off"
        @paste="onPaste"
        @blur="applyFromText"
      />
      <p class="form-hint form-hint--inline">
        Скопируйте координаты в Яндекс.Картах и вставьте сюда (Ctrl+V)
      </p>
      <p v-if="coordsError" class="error-msg">{{ coordsError }}</p>
    </div>
    <div class="form-row-coords">
      <div class="form-group">
        <label>Широта *</label>
        <input
          v-model.number="latitude"
          type="number"
          step="any"
          required
          @input="onLatLngInput"
        />
      </div>
      <div class="form-group">
        <label>Долгота *</label>
        <input
          v-model.number="longitude"
          type="number"
          step="any"
          required
          @input="onLatLngInput"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { parseCoordsString, formatCoordsString } from '../utils/coords.js';

const latitude = defineModel('latitude', { type: Number, required: true });
const longitude = defineModel('longitude', { type: Number, required: true });

const coordsText = ref('');
const coordsError = ref('');

function syncTextFromModel() {
  if (Number.isFinite(latitude.value) && Number.isFinite(longitude.value)) {
    coordsText.value = formatCoordsString(latitude.value, longitude.value);
  }
}

watch([latitude, longitude], syncTextFromModel, { immediate: true });

function applyFromText() {
  const parsed = parseCoordsString(coordsText.value);
  if (!parsed) {
    if (coordsText.value.trim()) {
      coordsError.value = 'Не удалось разобрать координаты. Пример: 56.331398, 43.997294';
    } else {
      coordsError.value = '';
    }
    return;
  }
  coordsError.value = '';
  latitude.value = parsed.latitude;
  longitude.value = parsed.longitude;
  coordsText.value = formatCoordsString(parsed.latitude, parsed.longitude);
}

function onPaste(e) {
  const text = e.clipboardData?.getData('text/plain') || '';
  const parsed = parseCoordsString(text);
  if (!parsed) return;

  e.preventDefault();
  coordsError.value = '';
  latitude.value = parsed.latitude;
  longitude.value = parsed.longitude;
  coordsText.value = formatCoordsString(parsed.latitude, parsed.longitude);
}

function onLatLngInput() {
  coordsError.value = '';
  syncTextFromModel();
}
</script>

<style scoped>
.form-hint--inline {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.coords-paste-input {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-card);
  font-family: inherit;
  font-size: 1rem;
}

.form-row-coords {
  display: grid;
  gap: 0.75rem;
}

@media (min-width: 480px) {
  .form-row-coords {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
