<script setup>
/**
 * Shows the updater state with a matching icon and offers a manual check
 * and, once a version is downloaded, the restart that installs it.
 */
import { computed } from "vue";

const props = defineProps({
  status: { type: Object, required: true }
});

const emit = defineEmits(["check", "install"]);

const ICONS = {
  idle: "fa-circle-info text-ink-faint",
  checking: "fa-rotate fa-spin text-brand-600",
  available: "fa-cloud-arrow-down text-brand-600",
  downloading: "fa-cloud-arrow-down fa-beat text-brand-600",
  downloaded: "fa-circle-check text-emerald-600",
  "not-available": "fa-circle-check text-emerald-600",
  error: "fa-triangle-exclamation text-amber-600"
};

const icon = computed(() => ICONS[props.status.state] ?? ICONS.idle);
</script>

<template>
  <section class="card">
    <h2 class="card-title">
      <i class="fa-solid fa-cloud-arrow-down text-brand-600" aria-hidden="true"></i>
      Güncelleme
      <button
        class="btn-icon ml-auto"
        type="button"
        title="Güncellemeleri denetle"
        aria-label="Güncellemeleri denetle"
        :disabled="status.state === 'checking'"
        @click="emit('check')"
      >
        <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': status.state === 'checking' }" aria-hidden="true"></i>
      </button>
    </h2>
    <p class="glass-inset flex items-start gap-2.5 px-3 py-2.5 text-[13px] text-ink-muted">
      <i class="fa-solid mt-0.5" :class="icon" aria-hidden="true"></i>
      <span>{{ status.message || "Henüz denetlenmedi." }}</span>
    </p>
    <button v-if="status.state === 'downloaded'" class="btn btn-primary mt-3 w-full justify-center" type="button" @click="emit('install')">
      <i class="fa-solid fa-power-off" aria-hidden="true"></i>
      Yeniden başlat ve kur
    </button>
  </section>
</template>
