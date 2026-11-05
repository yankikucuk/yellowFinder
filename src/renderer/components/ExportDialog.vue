<script setup>
/**
 * Modal that collects the export choices: file format, which rows (all,
 * the current search result, or the ticked rows) and an optional range of
 * days by the time the listing was found. Emits the format and a selection
 * object the main process understands.
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps({
  totalCount: { type: Number, required: true },
  filteredCount: { type: Number, required: true },
  selectedIds: { type: Array, required: true },
  filteredIds: { type: Array, required: true }
});

const emit = defineEmits(["close", "export"]);

const FORMATS = [
  { value: "xlsx", label: "Excel", icon: "fa-file-excel" },
  { value: "csv", label: "CSV", icon: "fa-file-csv" },
  { value: "pdf", label: "PDF", icon: "fa-file-pdf" },
  { value: "txt", label: "Metin", icon: "fa-file-lines" }
];

const format = ref("xlsx");
const scope = ref(props.selectedIds.length > 0 ? "selected" : "all");
const from = ref("");
const to = ref("");

const scopes = computed(() => [
  { value: "all", label: "Tümü", count: props.totalCount, enabled: true },
  { value: "filtered", label: "Aramadakiler", count: props.filteredCount, enabled: props.filteredCount !== props.totalCount },
  { value: "selected", label: "Seçililer", count: props.selectedIds.length, enabled: props.selectedIds.length > 0 }
]);

const rangeInvalid = computed(() => from.value !== "" && to.value !== "" && from.value > to.value);

function submit() {
  if (rangeInvalid.value) {
    return;
  }
  const selection = {};
  if (scope.value === "selected") {
    selection.ids = [...props.selectedIds];
  } else if (scope.value === "filtered") {
    selection.ids = [...props.filteredIds];
  }
  if (from.value) {
    selection.from = from.value;
  }
  if (to.value) {
    selection.to = to.value;
  }
  emit("export", format.value, selection);
}

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
    <section class="glass-raised w-[460px] p-5" role="dialog" aria-modal="true" aria-labelledby="export-title">
      <div class="mb-4 flex items-center">
        <h2 id="export-title" class="flex items-center gap-2 text-[15px] font-bold">
          <i class="fa-solid fa-file-export text-brand-600" aria-hidden="true"></i>
          Dışa aktar
        </h2>
        <button class="btn-icon ml-auto" type="button" title="Kapat" aria-label="Kapat" @click="emit('close')">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <span class="label">Biçim</span>
      <div class="segmented mb-4 w-full">
        <button v-for="option in FORMATS" :key="option.value" class="flex-1 justify-center" type="button" :aria-pressed="format === option.value" @click="format = option.value">
          <i class="fa-solid" :class="option.icon" aria-hidden="true"></i>
          {{ option.label }}
        </button>
      </div>

      <span class="label">Hangi ilanlar</span>
      <div class="segmented mb-4 w-full">
        <button
          v-for="option in scopes"
          :key="option.value"
          class="flex-1 justify-center disabled:opacity-40"
          type="button"
          :aria-pressed="scope === option.value"
          :disabled="!option.enabled"
          @click="scope = option.value"
        >
          {{ option.label }}
          <span class="font-mono text-[11px]">{{ option.count }}</span>
        </button>
      </div>

      <span class="label">Bulunma tarihi (isteğe bağlı)</span>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <span class="mb-1 block text-[11px] text-ink-muted">Başlangıç</span>
          <input v-model="from" class="field font-mono" type="date" />
        </div>
        <div>
          <span class="mb-1 block text-[11px] text-ink-muted">Bitiş</span>
          <input v-model="to" class="field font-mono" type="date" />
        </div>
      </div>
      <p v-if="rangeInvalid" class="mt-2 text-[12px] text-red-600 dark:text-red-400">Başlangıç bitişten sonra olamaz.</p>

      <div class="mt-5 flex justify-end gap-2">
        <button class="btn btn-glass" type="button" @click="emit('close')">Vazgeç</button>
        <button class="btn btn-primary" type="button" :disabled="rangeInvalid" @click="submit">
          <i class="fa-solid fa-download" aria-hidden="true"></i>
          Dosyayı kaydet
        </button>
      </div>
    </section>
  </div>
</template>
