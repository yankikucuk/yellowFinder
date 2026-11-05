<script setup>
/**
 * Root component: loads the bootstrap payload from the main process, keeps
 * the shared state, applies the colour scheme and lays the screen out as
 * header, sidebar and content, with the settings dialog on top.
 */
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from "vue";
import AppHeader from "./components/AppHeader.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import SettingsDialog from "./components/SettingsDialog.vue";
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
const settingsOpen = ref(false);

/** Log lines kept in memory; older ones are dropped. */
const MAX_EVENTS = 300;
let nextEventId = 1;
let unsubscribe = [];

/* ---------- colour scheme ---------- */

const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const systemPrefersDark = ref(systemDark.matches);

const themeChoice = computed(() => settings.value?.theme ?? "system");

/** The scheme actually applied: the user's choice, or the OS setting for "system". */
const resolvedTheme = computed(() => {
  if (themeChoice.value === "system") {
    return systemPrefersDark.value ? "dark" : "light";
  }
  return themeChoice.value;
});

watch(
  resolvedTheme,
  (theme) => {
    document.documentElement.dataset.theme = theme;
  },
  { immediate: true }
);

function onSystemThemeChange(event) {
  systemPrefersDark.value = event.matches;
}

async function setTheme(theme) {
  settings.value = await bridge.updateSettings({ theme });
}

/* ---------- log ---------- */

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
 * Adds a line produced by the interface itself (exports, errors).
 *
 * @param {string} level Event level.
 * @param {string} message Message in Turkish.
 */
function note(level, message) {
  pushEvent({ level, message, at: new Date().toISOString() });
}

function clearLog() {
  events.value = [];
}

/* ---------- data ---------- */

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
  note("info", "Ayarlar kaydedildi.");
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
    note("info", "Liste temizlendi.");
  }
}

async function exportResults(format) {
  try {
    const path = await bridge.exportResults(format);
    if (path) {
      note("info", `Dışa aktarıldı: ${path}`);
    }
  } catch (error) {
    note("error", `Dışa aktarma başarısız: ${error.message}`);
  }
}

async function copyPhone(phone) {
  try {
    await navigator.clipboard.writeText(phone);
    note("info", `Kopyalandı: ${phone}`);
  } catch {
    note("warning", "Panoya kopyalanamadı.");
  }
}

/* ---------- lifecycle ---------- */

onMounted(async () => {
  systemDark.addEventListener("change", onSystemThemeChange);
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
  systemDark.removeEventListener("change", onSystemThemeChange);
  for (const stop of unsubscribe) {
    stop();
  }
});
</script>

<template>
  <div class="flex h-full flex-col">
    <AppHeader
      :version="version"
      :running="scanState.running"
      @open-site="bridge.openSite()"
      @start="bridge.startScan()"
      @stop="bridge.stopScan()"
      @open-settings="settingsOpen = true"
    />

    <!-- Sidebar widens a step on large screens; the content column takes the rest. -->
    <main class="grid min-h-0 flex-1 grid-cols-[320px_1fr] gap-4 p-4 2xl:grid-cols-[380px_1fr] 2xl:gap-5 2xl:p-5">
      <aside class="scroll-thin flex min-h-0 flex-col gap-4 overflow-y-auto pr-1 pb-1">
        <SettingsPanel
          v-if="settings"
          :settings="settings"
          :cities="cities"
          :categories="categories"
          @save="saveSettings"
        />
      </aside>

      <section class="flex min-h-0 min-w-0 flex-col gap-4">
        <ScanStatus
          :running="scanState.running"
          :next-run-at="scanState.nextRunAt"
          :events="events"
          @clear="clearLog"
        />
        <ResultsTable
          :results="results"
          @export="exportResults"
          @clear="clearResults"
          @open="bridge.openExternal"
          @copy="copyPhone"
        />
      </section>
    </main>

    <SettingsDialog
      v-if="settingsOpen"
      :theme="themeChoice"
      :update-status="updateStatus"
      :version="version"
      @close="settingsOpen = false"
      @set-theme="setTheme"
      @check-updates="bridge.checkForUpdates()"
      @install-update="bridge.installUpdate()"
    />
  </div>
</template>
