<script setup>
/**
 * Shows whether a scan runs, when the next one starts, running counters for
 * the current session and a live log with one icon per event level.
 */
import { computed } from "vue";

const props = defineProps({
  running: { type: Boolean, required: true },
  nextRunAt: { type: String, default: null },
  events: { type: Array, required: true }
});

const emit = defineEmits(["clear"]);

const LEVEL_ICONS = {
  info: "fa-circle-info text-ink-muted",
  warning: "fa-triangle-exclamation text-amber-600",
  error: "fa-circle-xmark text-red-700",
  blocked: "fa-hand text-red-700",
  found: "fa-phone text-green-700",
  done: "fa-flag-checkered text-ink"
};

const nextRunLabel = computed(() => {
  if (!props.nextRunAt) {
    return "Otomatik tarama kapalı";
  }
  const time = new Date(props.nextRunAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return `Sonraki tarama ${time}`;
});

const counters = computed(() => ({
  found: props.events.filter((event) => event.level === "found").length,
  warnings: props.events.filter((event) => event.level === "warning").length,
  errors: props.events.filter((event) => event.level === "error" || event.level === "blocked").length
}));

function timeOf(iso) {
  return new Date(iso).toLocaleTimeString("tr-TR");
}
</script>

<template>
  <section class="card flex max-h-72 flex-col">
    <div class="mb-3 flex items-center gap-3">
      <span v-if="running" class="pill bg-brand-100 text-ink">
        <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
        Tarama sürüyor
      </span>
      <span v-else class="pill bg-brand-50 text-ink-muted">
        <i class="fa-regular fa-circle-pause" aria-hidden="true"></i>
        Beklemede
      </span>
      <span class="text-xs text-ink-muted">
        <i class="fa-regular fa-clock mr-1" aria-hidden="true"></i>{{ nextRunLabel }}
      </span>

      <span class="ml-auto flex items-center gap-3 text-xs text-ink-muted">
        <span title="Bu oturumda bulunan ilan"><i class="fa-solid fa-phone mr-1 text-green-700" aria-hidden="true"></i>{{ counters.found }}</span>
        <span title="Uyarı"><i class="fa-solid fa-triangle-exclamation mr-1 text-amber-600" aria-hidden="true"></i>{{ counters.warnings }}</span>
        <span title="Hata veya engel"><i class="fa-solid fa-circle-xmark mr-1 text-red-700" aria-hidden="true"></i>{{ counters.errors }}</span>
        <button class="btn-icon" type="button" title="Günlüğü temizle" :disabled="events.length === 0" @click="emit('clear')">
          <i class="fa-solid fa-broom" aria-hidden="true"></i>
        </button>
      </span>
    </div>

    <ul class="scroll-thin min-h-0 flex-1 overflow-y-auto text-[13px]">
      <li v-for="event in events" :key="event.id" class="log-line flex items-start gap-2 py-1">
        <span class="w-16 shrink-0 font-mono text-[11px] text-ink-muted tabular-nums">{{ timeOf(event.at) }}</span>
        <i class="fa-solid mt-0.5 w-4 text-center text-xs" :class="LEVEL_ICONS[event.level] ?? LEVEL_ICONS.info" aria-hidden="true"></i>
        <span :class="{ 'text-red-700': event.level === 'error' || event.level === 'blocked', 'text-green-800': event.level === 'found' }">{{ event.message }}</span>
      </li>
      <li v-if="events.length === 0" class="flex flex-col items-center gap-2 py-6 text-center text-xs text-ink-muted">
        <i class="fa-regular fa-rectangle-list text-2xl" aria-hidden="true"></i>
        Henüz bir olay yok. "Siteyi aç / giriş yap" ile oturum açın, sonra "Şimdi tara".
      </li>
    </ul>
  </section>
</template>
