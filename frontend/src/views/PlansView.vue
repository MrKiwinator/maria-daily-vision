<template>
  <section class="plans-page">
    <h2 class="page-title">Планы</h2>

    <div class="plans-layout">
      <div class="plans-map-col">
        <PlansMap
          :plans="allPlans"
          :selected-id="selectedPlan?.id ?? null"
          @select="openDetail"
        />
        <div class="map-legend">
          <span class="legend-item legend-item--planned">Запланировано</span>
          <span class="legend-item legend-item--visited">Посещено</span>
        </div>
      </div>

      <aside class="plans-list-col">
        <button
          v-if="auth.canManagePlans"
          type="button"
          class="btn btn-primary btn-block"
          @click="openCreateForm"
        >
          + Добавить план
        </button>

        <div class="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="tab"
            :class="{ 'tab--active': activeTab === 'planned' }"
            :aria-selected="activeTab === 'planned'"
            @click="activeTab = 'planned'"
          >
            Запланировано
          </button>
          <button
            type="button"
            role="tab"
            class="tab"
            :class="{ 'tab--active': activeTab === 'visited' }"
            :aria-selected="activeTab === 'visited'"
            @click="activeTab = 'visited'"
          >
            Посещено
          </button>
        </div>

        <p v-if="loading" class="empty-state">Загрузка…</p>
        <p v-else-if="error" class="error-msg">{{ error }}</p>
        <p v-else-if="!filteredPlans.length" class="empty-state">
          {{ activeTab === 'planned' ? 'Запланированных мест пока нет' : 'Посещённых мест пока нет' }}
        </p>
        <ul v-else class="plan-list">
          <li v-for="plan in filteredPlans" :key="plan.id" class="plan-list-item">
            <button type="button" class="plan-list-btn" @click="openDetail(plan)">
              <span
                class="plan-dot"
                :class="plan.status === 'visited' ? 'plan-dot--visited' : 'plan-dot--planned'"
              />
              <span class="plan-list-text">
                <strong>{{ plan.title }}</strong>
                <span v-if="plan.description" class="plan-list-desc">{{ plan.description }}</span>
              </span>
            </button>
            <button
              v-if="auth.canManagePlans"
              type="button"
              class="btn btn-danger btn-sm plan-delete"
              title="Удалить"
              @click="removePlan(plan.id)"
            >
              ×
            </button>
          </li>
        </ul>
      </aside>
    </div>

    <AppModal
      v-if="selectedPlan"
      :title="detailEditing ? 'Редактирование плана' : selectedPlan.title"
      @close="closeDetail"
    >
      <template v-if="!detailEditing">
        <div v-if="selectedPlan.image_path" class="plan-detail-photo">
          <img :src="imageUrl(selectedPlan.image_path)" :alt="selectedPlan.title" />
        </div>
        <p v-if="selectedPlan.description" class="plan-detail-desc">{{ selectedPlan.description }}</p>
        <p v-else class="plan-detail-desc plan-detail-desc--muted">Описание не указано</p>
        <p v-if="selectedPlan.link_url" class="plan-detail-link">
          <a :href="selectedPlan.link_url" target="_blank" rel="noopener noreferrer">
            Ссылка на место / событие
          </a>
        </p>
        <p class="plan-detail-status">
          Статус:
          <strong>{{ selectedPlan.status === 'visited' ? 'Посещено' : 'Запланировано' }}</strong>
        </p>
        <div v-if="selectedPlan.status === 'visited'" class="visit-photos-block">
          <button type="button" class="btn btn-secondary" @click="openVisitGallery">
            Фото посещения
            <span v-if="visitPhotoCount">({{ visitPhotoCount }})</span>
          </button>
        </div>
        <div v-if="auth.canManagePlans" class="detail-actions">
          <button type="button" class="btn btn-primary" @click="startEditDetail">
            Редактировать
          </button>
        </div>
      </template>
      <form v-else class="plan-form" @submit.prevent="submitPlan">
        <div class="form-group">
          <label>Название *</label>
          <input v-model="form.title" type="text" required />
        </div>
        <div class="form-group">
          <label>Краткое описание</label>
          <textarea v-model="form.description" rows="3" />
        </div>
        <div class="form-group">
          <label>Ссылка на место / событие</label>
          <input v-model="form.link_url" type="url" placeholder="https://…" />
        </div>
        <div class="form-group">
          <label>Фото</label>
          <div v-if="formPreviewImage" class="form-photo-preview">
            <img :src="formPreviewImage" alt="" />
          </div>
          <input type="file" accept="image/*" @change="onImageChange" />
          <p v-if="editingPlanId && !imageFile" class="form-hint form-hint--inline">
            Оставьте пустым, чтобы сохранить текущее фото
          </p>
        </div>
        <PlanCoordsFields v-model:latitude="form.latitude" v-model:longitude="form.longitude" />
        <div class="form-group">
          <label>Статус</label>
          <select v-model="form.status">
            <option value="planned">Запланировано</option>
            <option value="visited">Посещено</option>
          </select>
        </div>
        <div v-if="form.status === 'visited' && editingPlanId" class="visit-photos-edit-hint">
          <p class="form-hint">
            После сохранения откройте «Фото посещения», чтобы добавить снимки с места.
          </p>
        </div>
        <p v-if="formError" class="error-msg">{{ formError }}</p>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="cancelEditDetail">Отмена</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Сохранение…' : 'Сохранить' }}
          </button>
        </div>
      </form>
    </AppModal>

    <AppModal v-if="showForm" :title="formModalTitle" @close="closeForm">
      <form class="plan-form" @submit.prevent="submitPlan">
        <div class="form-group">
          <label>Название *</label>
          <input v-model="form.title" type="text" required />
        </div>
        <div class="form-group">
          <label>Краткое описание</label>
          <textarea v-model="form.description" rows="3" />
        </div>
        <div class="form-group">
          <label>Ссылка на место / событие</label>
          <input v-model="form.link_url" type="url" placeholder="https://…" />
        </div>
        <div class="form-group">
          <label>Фото</label>
          <div v-if="formPreviewImage" class="form-photo-preview">
            <img :src="formPreviewImage" alt="" />
          </div>
          <input type="file" accept="image/*" @change="onImageChange" />
        </div>
        <PlanCoordsFields v-model:latitude="form.latitude" v-model:longitude="form.longitude" />
        <div class="form-group">
          <label>Статус</label>
          <select v-model="form.status">
            <option value="planned">Запланировано</option>
            <option value="visited">Посещено</option>
          </select>
        </div>
        <p v-if="formError" class="error-msg">{{ formError }}</p>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="closeForm">Отмена</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Сохранение…' : 'Сохранить' }}
          </button>
        </div>
      </form>
    </AppModal>

    <PlanVisitGallery
      v-if="visitGalleryPlan"
      :plan-id="visitGalleryPlan.id"
      :plan-title="visitGalleryPlan.title"
      :can-edit="auth.canManagePlans"
      @close="closeVisitGallery"
      @updated="onVisitPhotosUpdated"
    />
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '../stores/auth.js';
import { api, imageUrl } from '../api/client.js';
import PlansMap from '../components/PlansMap.vue';
import AppModal from '../components/AppModal.vue';
import PlanVisitGallery from '../components/PlanVisitGallery.vue';
import PlanCoordsFields from '../components/PlanCoordsFields.vue';

const auth = useAuthStore();

const allPlans = ref([]);
const loading = ref(false);
const error = ref('');
const activeTab = ref('planned');
const selectedPlan = ref(null);
const detailEditing = ref(false);
const showForm = ref(false);
const editingPlanId = ref(null);
const saving = ref(false);
const formError = ref('');
const imageFile = ref(null);
const imagePreviewUrl = ref('');
const visitGalleryPlan = ref(null);
const visitPhotoCountOverride = ref(null);

const form = ref({
  title: '',
  description: '',
  link_url: '',
  latitude: 55.7558,
  longitude: 37.6173,
  status: 'planned',
});

const formModalTitle = computed(() => (editingPlanId.value ? 'Редактирование плана' : 'Новый план'));

const formPreviewImage = computed(() => {
  if (imagePreviewUrl.value) return imagePreviewUrl.value;
  if (editingPlanId.value && selectedPlan.value?.image_path) {
    return imageUrl(selectedPlan.value.image_path);
  }
  return '';
});

const filteredPlans = computed(() =>
  allPlans.value.filter((p) => p.status === activeTab.value)
);

const visitPhotoCount = computed(() => {
  if (visitPhotoCountOverride.value !== null) return visitPhotoCountOverride.value;
  return selectedPlan.value?.visit_photo_count ?? 0;
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await api('/api/plans');
    allPlans.value = data.items;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function openDetail(plan) {
  detailEditing.value = false;
  clearImagePreview();
  visitPhotoCountOverride.value = null;
  selectedPlan.value = plan;
}

function closeDetail() {
  detailEditing.value = false;
  editingPlanId.value = null;
  selectedPlan.value = null;
  visitPhotoCountOverride.value = null;
  visitGalleryPlan.value = null;
  clearImagePreview();
  formError.value = '';
}

function openVisitGallery() {
  if (!selectedPlan.value || selectedPlan.value.status !== 'visited') return;
  visitGalleryPlan.value = { ...selectedPlan.value };
}

function closeVisitGallery() {
  visitGalleryPlan.value = null;
}

function onVisitPhotosUpdated(count) {
  visitPhotoCountOverride.value = count;
  if (selectedPlan.value) {
    selectedPlan.value = { ...selectedPlan.value, visit_photo_count: count };
  }
  const idx = allPlans.value.findIndex((p) => p.id === visitGalleryPlan.value?.id);
  if (idx !== -1) {
    allPlans.value[idx] = { ...allPlans.value[idx], visit_photo_count: count };
  }
}

function fillFormFromPlan(plan) {
  form.value = {
    title: plan.title,
    description: plan.description || '',
    link_url: plan.link_url || '',
    latitude: plan.latitude,
    longitude: plan.longitude,
    status: plan.status,
  };
}

function startEditDetail() {
  if (!selectedPlan.value || !auth.canManagePlans) return;
  editingPlanId.value = selectedPlan.value.id;
  fillFormFromPlan(selectedPlan.value);
  imageFile.value = null;
  clearImagePreview();
  formError.value = '';
  detailEditing.value = true;
}

function cancelEditDetail() {
  detailEditing.value = false;
  editingPlanId.value = null;
  clearImagePreview();
  formError.value = '';
}

function openCreateForm() {
  editingPlanId.value = null;
  form.value = {
    title: '',
    description: '',
    link_url: '',
    latitude: 55.7558,
    longitude: 37.6173,
    status: activeTab.value,
  };
  imageFile.value = null;
  clearImagePreview();
  formError.value = '';
  detailEditing.value = false;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingPlanId.value = null;
  formError.value = '';
  clearImagePreview();
}

function clearImagePreview() {
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value);
    imagePreviewUrl.value = '';
  }
}

function onImageChange(e) {
  imageFile.value = e.target.files?.[0] || null;
  clearImagePreview();
  if (imageFile.value) {
    imagePreviewUrl.value = URL.createObjectURL(imageFile.value);
  }
}

async function submitPlan() {
  formError.value = '';
  saving.value = true;
  const planId = editingPlanId.value;
  try {
    const fd = new FormData();
    fd.append('title', form.value.title);
    fd.append('description', form.value.description);
    fd.append('link_url', form.value.link_url);
    fd.append('latitude', String(form.value.latitude));
    fd.append('longitude', String(form.value.longitude));
    fd.append('status', form.value.status);
    if (imageFile.value) fd.append('image', imageFile.value);

    if (planId) {
      const data = await api(`/api/plans/${planId}`, { method: 'PUT', body: fd });
      if (detailEditing.value) {
        selectedPlan.value = data.item;
        detailEditing.value = false;
        editingPlanId.value = null;
        clearImagePreview();
      } else {
        closeForm();
      }
    } else {
      await api('/api/plans', { method: 'POST', body: fd });
      closeForm();
    }

    await load();
    activeTab.value = form.value.status;

    if (selectedPlan.value) {
      const updated = allPlans.value.find((p) => p.id === selectedPlan.value.id);
      if (updated) {
        selectedPlan.value = updated;
        visitPhotoCountOverride.value = updated.visit_photo_count ?? 0;
      }
    }
  } catch (e) {
    formError.value = e.message;
  } finally {
    saving.value = false;
  }
}

onBeforeUnmount(clearImagePreview);

async function removePlan(id) {
  if (!confirm('Удалить этот план?')) return;
  try {
    await api(`/api/plans/${id}`, { method: 'DELETE' });
    if (selectedPlan.value?.id === id) closeDetail();
    await load();
  } catch (e) {
    alert(e.message);
  }
}

onMounted(load);
</script>

<style scoped>
.plans-page {
  width: 100%;
}

.page-title {
  font-family: var(--font-headline);
  font-size: 1.75rem;
  margin-bottom: 1rem;
}

.plans-layout {
  display: grid;
  gap: 1.25rem;
  min-height: 480px;
}

@media (min-width: 900px) {
  .plans-layout {
    grid-template-columns: 1fr minmax(260px, 340px);
    align-items: stretch;
    min-height: 560px;
  }
}

.plans-map-col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 320px;
}

@media (min-width: 900px) {
  .plans-map-col {
    min-height: 560px;
  }
}

.map-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.legend-item::before {
  content: '';
  display: inline-block;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  margin-right: 0.35rem;
  vertical-align: middle;
}

.legend-item--planned::before {
  background: #2563eb;
}

.legend-item--visited::before {
  background: #16a34a;
}

.plans-list-col {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 1rem;
  border-radius: 4px;
}

.btn-block {
  width: 100%;
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.2rem;
  background: var(--bg);
}

.tab {
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  border-radius: 3px;
  color: var(--text-muted);
}

.tab--active {
  background: var(--bg-card);
  color: var(--accent);
  box-shadow: var(--shadow);
}

.plan-list {
  list-style: none;
  overflow-y: auto;
  max-height: 420px;
  flex: 1;
}

.plan-list-item {
  display: flex;
  align-items: stretch;
  gap: 0.35rem;
  border-bottom: 1px solid var(--border);
}

.plan-list-item:last-child {
  border-bottom: none;
}

.plan-list-btn {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.65rem 0.25rem;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.plan-list-btn:hover {
  background: rgba(122, 32, 56, 0.05);
}

.plan-dot {
  flex-shrink: 0;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  margin-top: 0.45rem;
}

.plan-dot--planned {
  background: #2563eb;
}

.plan-dot--visited {
  background: #16a34a;
}

.plan-list-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.plan-list-text strong {
  font-size: 0.95rem;
}

.plan-list-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.plan-delete {
  align-self: center;
  min-width: 2rem;
  padding: 0.25rem 0.5rem;
}

.plan-detail-photo {
  margin-bottom: 1rem;
  border-radius: 4px;
  overflow: hidden;
}

.plan-detail-photo img {
  width: 100%;
  max-height: 240px;
  object-fit: cover;
}

.plan-detail-desc {
  margin-bottom: 0.75rem;
  white-space: pre-wrap;
}

.plan-detail-desc--muted {
  color: var(--text-muted);
  font-style: italic;
}

.plan-detail-link {
  margin-bottom: 0.75rem;
}

.plan-detail-status {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.visit-photos-block {
  margin-top: 1rem;
}

.visit-photos-edit-hint {
  margin-top: 0.5rem;
}

.detail-actions {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.form-photo-preview {
  margin-bottom: 0.75rem;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border);
}

.form-photo-preview img {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
}

.form-hint--inline {
  margin: 0.35rem 0 0;
}

.form-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: -0.5rem 0 1rem;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.btn-sm {
  padding: 0.35rem 0.5rem;
  font-size: 1rem;
  line-height: 1;
}
</style>
