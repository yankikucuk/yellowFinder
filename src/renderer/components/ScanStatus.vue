<script setup>
/**
 * Shows whether a scan runs, when the next one starts, and a live log.
 */
import { computed } from "vue";

const props = defineProps({
  running: { type: Boolean, required: true },
  nextRunAt: { type: String, default: null },
  events: { type: Array, required: true }
});

const nextRunLabel = computed(() => {
  if (!props.nextRunAt) {
    return "Otomatik tarama kapalı";
  }
  return `Sonraki tarama: ${new Date(props.nextRunAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
});

function timeOf(iso) {
  return new Date(iso).toLocaleTimeString("tr-TR");
}
</script>

<template>
  <section class="card">
    <div class="status-row">
      <h2>{{ running ? "Tarama sürüyor…" : "Beklemede" }}</h2>
      <span class="muted">{{ nextRunLabel }}</span>
    </div>
    <ul class="log">
      <li v-for="event in events" :key="event.id" :class="event.level">
        <span class="muted time">{{ timeOf(event.at) }}</span>
        {{ event.message }}
      </li>
      <li v-if="events.length === 0" class="muted">Henüz bir olay yok. "Siteyi aç / giriş yap" ile oturum açın, sonra "Şimdi tara".</li>
    </ul>
  </section>
</template>

<style scoped>
.status-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.log {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 220px;
  overflow: auto;
  font-size: 13px;
}

.log li {
  padding: 3px 0;
}

.time {
  margin-right: 8px;
  font-variant-numeric: tabular-nums;
}

.warning {
  color: #8a6d00;
}

.error,
.blocked {
  color: var(--danger);
}

.found {
  color: var(--ok);
}
</style>
