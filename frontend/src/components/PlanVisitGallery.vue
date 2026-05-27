<template>
  <AppModal :title="modalTitle" size="wide" @close="$emit('close')">
    <p v-if="loading" class="empty-state">Загрузка…</p>
    <p v-else-if="loadError" class="error-msg">{{ loadError }}</p>
    <template v-else>
      <div v-if="canEdit" class="gallery-upload">
        <label class="btn btn-secondary gallery-upload-btn">
          {{ uploading ? 'Загрузка…' : '+ Добавить фото' }}
          <input
            type="file"
            accept="image/*"
            multiple
            class="gallery-upload-input"
            :disabled="uploading"
            @change="onUpload"
          />
        </label>
        <p v-if="uploadError" class="error-msg">{{ uploadError }}</p>
      </div>

      <p v-if="!photos.length" class="empty-state gallery-empty">
        Фото посещения пока нет
      </p>
      <div v-else class="gallery-grid" role="list">
        <div v-for="(photo, index) in photos" :key="photo.id" class="gallery-cell" role="listitem">
          <button
            type="button"
            class="gallery-thumb"
            :aria-label="`Фото ${index + 1} из ${photos.length}`"
            @click="openLightbox(index)"
          >
            <img :src="imageUrl(photo.image_path)" :alt="`Фото ${index + 1}`" loading="lazy" />
          </button>
          <button
            v-if="canEdit"
            type="button"
            class="gallery-thumb-delete"
            title="Удалить фото"
            :disabled="deletingId === photo.id"
            @click.stop="removePhoto(photo.id)"
          >
            ×
          </button>
        </div>
      </div>
    </template>
  </AppModal>

  <Teleport to="body">
    <div
      v-if="lightboxIndex !== null"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="`Фото ${lightboxIndex + 1} из ${photos.length}`"
      @click.self="closeLightbox"
    >
      <button type="button" class="lightbox-close" aria-label="Закрыть" @click="closeLightbox">
        ×
      </button>
      <button
        v-if="photos.length > 1"
        type="button"
        class="lightbox-nav lightbox-nav--prev"
        aria-label="Предыдущее фото"
        @click="prevPhoto"
      >
        ‹
      </button>
      <div class="lightbox-stage">
        <img
          v-if="currentPhoto"
          :src="imageUrl(currentPhoto.image_path)"
          :alt="`Фото ${lightboxIndex + 1}`"
          class="lightbox-image"
        />
        <p v-if="photos.length > 1" class="lightbox-counter">
          {{ lightboxIndex + 1 }} / {{ photos.length }}
        </p>
      </div>
      <button
        v-if="photos.length > 1"
        type="button"
        class="lightbox-nav lightbox-nav--next"
        aria-label="Следующее фото"
        @click="nextPhoto"
      >
        ›
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { api, imageUrl } from '../api/client.js';
import AppModal from './AppModal.vue';

const props = defineProps({
  planId: { type: Number, required: true },
  planTitle: { type: String, default: '' },
  canEdit: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'updated']);

const photos = ref([]);
const loading = ref(true);
const loadError = ref('');
const uploading = ref(false);
const uploadError = ref('');
const deletingId = ref(null);
const lightboxIndex = ref(null);

const modalTitle = computed(() => {
  const base = 'Фото посещения';
  return props.planTitle ? `${base}: ${props.planTitle}` : base;
});

const currentPhoto = computed(() =>
  lightboxIndex.value !== null ? photos.value[lightboxIndex.value] : null
);

async function loadPhotos() {
  loading.value = true;
  loadError.value = '';
  try {
    const data = await api(`/api/plans/${props.planId}/photos`);
    photos.value = data.photos;
  } catch (e) {
    loadError.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function onUpload(e) {
  const files = [...(e.target.files || [])];
  e.target.value = '';
  if (!files.length) return;

  uploading.value = true;
  uploadError.value = '';
  try {
    const fd = new FormData();
    for (const file of files) fd.append('images', file);
    const data = await api(`/api/plans/${props.planId}/photos`, { method: 'POST', body: fd });
    photos.value = [...photos.value, ...data.photos];
    emit('updated', photos.value.length);
  } catch (err) {
    uploadError.value = err.message;
  } finally {
    uploading.value = false;
  }
}

async function removePhoto(photoId) {
  if (!confirm('Удалить это фото?')) return;
  deletingId.value = photoId;
  try {
    await api(`/api/plans/${props.planId}/photos/${photoId}`, { method: 'DELETE' });
    const removedIndex = photos.value.findIndex((p) => p.id === photoId);
    photos.value = photos.value.filter((p) => p.id !== photoId);
    emit('updated', photos.value.length);

    if (lightboxIndex.value !== null) {
      if (!photos.value.length) {
        lightboxIndex.value = null;
      } else if (removedIndex <= lightboxIndex.value) {
        lightboxIndex.value = Math.max(0, lightboxIndex.value - 1);
        if (lightboxIndex.value >= photos.value.length) {
          lightboxIndex.value = photos.value.length - 1;
        }
      }
    }
  } catch (err) {
    alert(err.message);
  } finally {
    deletingId.value = null;
  }
}

function openLightbox(index) {
  lightboxIndex.value = index;
}

function closeLightbox() {
  lightboxIndex.value = null;
}

function prevPhoto() {
  if (!photos.value.length) return;
  lightboxIndex.value =
    (lightboxIndex.value - 1 + photos.value.length) % photos.value.length;
}

function nextPhoto() {
  if (!photos.value.length) return;
  lightboxIndex.value = (lightboxIndex.value + 1) % photos.value.length;
}

function onKeydown(e) {
  if (lightboxIndex.value === null) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') prevPhoto();
  if (e.key === 'ArrowRight') nextPhoto();
}

watch(
  () => props.planId,
  () => {
    lightboxIndex.value = null;
    loadPhotos();
  }
);

onMounted(() => {
  loadPhotos();
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.gallery-upload {
  margin-bottom: 1rem;
}

.gallery-upload-btn {
  position: relative;
  cursor: pointer;
}

.gallery-upload-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  overflow: hidden;
}

.gallery-empty {
  padding: 2rem 1rem;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}

.gallery-cell {
  position: relative;
}

.gallery-thumb {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg);
  transition: box-shadow 0.2s, transform 0.15s;
}

.gallery-thumb:hover {
  box-shadow: var(--shadow);
  transform: scale(1.02);
}

.gallery-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-thumb-delete {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 1.5rem;
  height: 1.5rem;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.gallery-thumb-delete:hover {
  background: #a33;
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 3.5rem;
  background: rgba(0, 0, 0, 0.88);
}

.lightbox-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 100%;
  max-height: 100%;
}

.lightbox-image {
  max-width: 100%;
  max-height: calc(100vh - 5rem);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 4px;
}

.lightbox-counter {
  margin-top: 0.75rem;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.9rem;
}

.lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
}

.lightbox-close:hover {
  color: #f0c0c8;
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.28);
}

.lightbox-nav--prev {
  left: 0.75rem;
}

.lightbox-nav--next {
  right: 0.75rem;
}

@media (max-width: 600px) {
  .lightbox {
    padding: 1rem 2.5rem;
  }

  .lightbox-nav--prev {
    left: 0.25rem;
  }

  .lightbox-nav--next {
    right: 0.25rem;
  }
}
</style>
