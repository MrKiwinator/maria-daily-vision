<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div
        class="modal-panel"
        :class="`modal-panel--${size}`"
        role="dialog"
        :aria-labelledby="titleId"
      >
        <header class="modal-header">
          <h3 :id="titleId" class="modal-title">{{ title }}</h3>
          <button type="button" class="modal-close" aria-label="Закрыть" @click="$emit('close')">
            ×
          </button>
        </header>
        <div class="modal-body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useId } from 'vue';

defineProps({
  title: { type: String, default: '' },
  size: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'wide'].includes(v),
  },
});

defineEmits(['close']);

const titleId = `modal-title-${useId()}`;
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.45);
}

.modal-panel {
  width: 100%;
  max-width: 480px;
  max-height: min(90vh, 720px);
  overflow: auto;
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
  border-radius: 6px;
}

.modal-panel--wide {
  max-width: min(920px, 96vw);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}

.modal-title {
  font-family: var(--font-headline);
  font-size: 1.25rem;
  line-height: 1.3;
}

.modal-close {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--text-muted);
}

.modal-close:hover {
  color: var(--accent);
}

.modal-body {
  padding: 1.25rem;
}

.modal-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 0 1.25rem 1.25rem;
}
</style>
