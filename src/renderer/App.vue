<script setup>
/**
 * Root component: loads the bootstrap payload from the main process and
 * splits the screen into settings, status and results.
 */
import { onMounted, onBeforeUnmount, reactive, ref } from "vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import ScanStatus from "./components/ScanStatus.vue";
import ResultsTable from "./components/ResultsTable.vue";

const bridge = window.yellowFinder;

const version = ref("");
const settings = ref(null);
const cities = ref([]);
const categories = ref([]);
const results = ref([]);
const scanState = reactive({ running: false, nextRunAt: null });
const events = ref([]);
const updateStatus = ref({ state: "idle", message: "" });

/** Log lines kept in memory; older ones are dropped. */
const MAX_EVENTS = 300;
let nextEventId = 1;
let unsubscribe = [];

/**
 * Adds a log line at the top with a stable key for list rendering.
 *
 * @param {{level: string, message: string, at: string}} event Event from the main process or the UI.
 */
function pushEvent(event) {
  events.value.unshift({ ...event, id: nextEventId });
  nextEventId += 1;
  if (events.value.length > MAX_EVENTS) {
    events.value.length = MAX_EVENTS;
  }
}

/**
 * Pulls the initial state from the main process.
 */
async function load() {
  const bootstrap = await bridge.getBootstrap();
  version.value = bootstrap.version;
  settings.value = bootstrap.settings;
  cities.value = bootstrap.cities;
  categories.value = bootstrap.categories;
  results.value = bootstrap.results;
  scanState.running = bootstrap.scanRunning;
  scanState.nextRunAt = bootstrap.nextRunAt;
  updateStatus.value = bootstrap.updateStatus;
}

async function saveSettings(partial) {
  settings.value = await bridge.updateSettings(partial);
}

async function refreshResults() {
  results.value = await bridge.listResults();
}

/**
 * Puts a listing found during the scan at the top of the table without
 * fetching the whole list again. A retried listing replaces its old row.
 *
 * @param {object} record Listing record carried by the "found" event.
 */
function addFoundListing(record) {
  const index = results.value.findIndex((existing) => existing.id === record.id);
  if (index !== -1) {
    results.value.splice(index, 1);
  }
  results.value.unshift(record);
}

async function clearResults() {
  if (window.confirm("Tüm liste silinecek. Emin misiniz?")) {
    results.value = await bridge.clearResults();
  }
}

async function exportResults(format) {
  try {
    const path = await bridge.exportResults(format);
    if (path) {
      pushEvent({ level: "info", message: `Dışa aktarıldı: ${path}`, at: new Date().toISOString() });
    }
  } catch (error) {
    pushEvent({ level: "error", message: `Dışa aktarma başarısız: ${error.message}`, at: new Date().toISOString() });
  }
}

onMounted(async () => {
  await load();
  unsubscribe = [
    bridge.onScanEvent((event) => {
      pushEvent(event);
      if (event.level === "found" && event.data) {
        addFoundListing(event.data);
      }
    }),
    bridge.onScanState((state) => {
      const wasRunning = scanState.running;
      scanState.running = state.running;
      scanState.nextRunAt = state.nextRunAt;
      if (wasRunning && !state.running) {
        refreshResults();
      }
    }),
    bridge.onUpdateStatus((status) => {
      updateStatus.value = status;
    })
  ];
});

onBeforeUnmount(() => {
  for (const stop of unsubscribe) {
    stop();
  }
});
</script>

<template>
  <div class="layout">
    <header class="header">
      <div>
        <h1>yellowFinder</h1>
        <span class="muted">sahibinden.com · emlakçısı olmayan ilanlar · v{{ version }}</span>
      </div>
      <div class="header-actions">
        <button class="secondary" @click="bridge.openSite()">Siteyi aç / giriş yap</button>
        <button v-if="!scanState.running" @click="bridge.startScan()">Şimdi tara</button>
        <button v-else class="danger" @click="bridge.stopScan()">Taramayı durdur</button>
      </div>
    </header>

    <main class="columns">
      <aside class="sidebar">
        <SettingsPanel
          v-if="settings"
          :settings="settings"
          :cities="cities"
          :categories="categories"
          @save="saveSettings"
        />
        <section class="card">
          <h2>Güncelleme</h2>
          <p class="muted">{{ updateStatus.message || "Henüz denetlenmedi." }}</p>
          <div class="row">
            <button class="secondary" @click="bridge.checkForUpdates()">Denetle</button>
            <button v-if="updateStatus.state === 'downloaded'" @click="bridge.installUpdate()">Yeniden başlat ve kur</button>
          </div>
        </section>
      </aside>

      <section class="content">
        <ScanStatus :running="scanState.running" :next-run-at="scanState.nextRunAt" :events="events" />
        <ResultsTable
          :results="results"
          @export="exportResults"
          @clear="clearResults"
          @open="bridge.openExternal"
        />
      </section>
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: var(--card-tint);
  border-bottom: 1px solid var(--border);
}

.header h1 {
  margin: 0;
  font-size: 20px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.columns {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 16px;
  padding: 16px;
  flex: 1;
  min-height: 0;
}

.sidebar,
.content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  overflow: auto;
}

.row {
  display: flex;
  gap: 8px;
}
</style>
