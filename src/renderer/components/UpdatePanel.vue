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
      <i class="fa-solid fa-arrows-rotate text-brand-600" aria-hidden="true"></i>
      Güncelleme
    </h2>
    <p class="glass-inset mb-3 flex items-start gap-2.5 px-3 py-2.5 text-[13px] text-ink-muted">
      <i class="fa-solid mt-0.5" :class="icon" aria-hidden="true"></i>
      <span>{{ status.message || "Henüz denetlenmedi." }}</span>
    </p>
    <div class="flex gap-2">
      <button class="btn btn-glass" type="button" :disabled="status.state === 'checking'" @click="emit('check')">
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        Denetle
      </button>
      <button v-if="status.state === 'downloaded'" class="btn btn-primary" type="button" @click="emit('install')">
        <i class="fa-solid fa-power-off" aria-hidden="true"></i>
        Yeniden başlat ve kur
      </button>
    </div>
  </section>
</template>
