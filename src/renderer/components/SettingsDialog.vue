<script setup>
/**
 * Modal glass sheet with the app-level preferences: colour scheme and
 * software updates. Opened from the gear in the header; closes on the
 * backdrop, the close button or Escape.
 */
import { computed, onBeforeUnmount, onMounted } from "vue";

const props = defineProps({
  theme: { type: String, required: true },
  updateStatus: { type: Object, required: true },
  version: { type: String, required: true }
});

const emit = defineEmits(["close", "set-theme", "check-updates", "install-update"]);

const THEME_OPTIONS = [
  { value: "system", label: "Sistem", icon: "fa-circle-half-stroke" },
  { value: "light", label: "Açık", icon: "fa-sun" },
  { value: "dark", label: "Koyu", icon: "fa-moon" }
];

const UPDATE_ICONS = {
  idle: "fa-circle-info text-ink-faint",
  checking: "fa-rotate fa-spin text-brand-600",
  available: "fa-cloud-arrow-down text-brand-600",
  downloading: "fa-cloud-arrow-down fa-beat text-brand-600",
  downloaded: "fa-circle-check text-emerald-600",
  "not-available": "fa-circle-check text-emerald-600",
  error: "fa-triangle-exclamation text-amber-600"
};

const updateIcon = computed(() => UPDATE_ICONS[props.updateStatus.state] ?? UPDATE_ICONS.idle);

function onKeydown(event) {
  if (event.key === "Escape") {
    emit("close");
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm" @click.self="emit('close')">
    <section class="glass-raised w-[440px] p-5" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="mb-4 flex items-center">
        <h2 id="settings-title" class="flex items-center gap-2 text-[15px] font-bold">
          <i class="fa-solid fa-gear text-brand-600" aria-hidden="true"></i>
          Ayarlar
        </h2>
        <button class="btn-icon ml-auto" type="button" title="Kapat" aria-label="Kapat" @click="emit('close')">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div class="mb-5">
        <span class="label">Görünüm</span>
        <div class="segmented w-full">
          <button
            v-for="option in THEME_OPTIONS"
            :key="option.value"
            class="flex-1 justify-center"
            type="button"
            :aria-pressed="theme === option.value"
            @click="emit('set-theme', option.value)"
          >
            <i class="fa-solid" :class="option.icon" aria-hidden="true"></i>
            {{ option.label }}
          </button>
        </div>
      </div>

      <div>
        <div class="mb-1 flex items-center">
          <span class="label mb-0">Güncelleme</span>
          <button
            class="btn-icon ml-auto"
            type="button"
            title="Güncellemeleri denetle"
            aria-label="Güncellemeleri denetle"
            :disabled="updateStatus.state === 'checking'"
            @click="emit('check-updates')"
          >
            <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': updateStatus.state === 'checking' }" aria-hidden="true"></i>
          </button>
        </div>
        <p class="glass-inset flex items-start gap-2.5 px-3 py-2.5 text-[13px] text-ink-muted">
          <i class="fa-solid mt-0.5" :class="updateIcon" aria-hidden="true"></i>
          <span>{{ updateStatus.message || "Henüz denetlenmedi." }}</span>
        </p>
        <button v-if="updateStatus.state === 'downloaded'" class="btn btn-primary mt-3 w-full justify-center" type="button" @click="emit('install-update')">
          <i class="fa-solid fa-power-off" aria-hidden="true"></i>
          Yeniden başlat ve kur
        </button>
      </div>

      <p class="mt-5 text-center font-mono text-[11px] text-ink-faint">YellowFinder v{{ version }}</p>
    </section>
  </div>
</template>
