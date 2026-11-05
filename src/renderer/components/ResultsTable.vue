<script setup>
/**
 * Lists the collected owner listings with their phone numbers and offers
 * search, row selection, export, copy and clear actions. Rows are filtered
 * by a text box and paged so a store with thousands of listings stays
 * responsive. The selection is a list of listing ids owned by the parent so
 * the export dialog can use it; the ids of the current search result are
 * reported the same way.
 */
import { computed, ref, watch } from "vue";

const props = defineProps({
  results: { type: Array, required: true },
  selectedIds: { type: Array, required: true }
});

const emit = defineEmits(["export", "clear", "open", "copy", "update:selectedIds", "update:filteredIds"]);

/** Rows per page; small enough to render instantly, large enough to scan by eye. */
const PAGE_SIZE = 100;

const query = ref("");
const pageIndex = ref(0);

const filtered = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase("tr");
  if (needle.length === 0) {
    return props.results;
  }
  return props.results.filter((record) =>
    [record.title, record.location, record.price, ...record.phones].some((text) => String(text).toLocaleLowerCase("tr").includes(needle))
  );
});

watch(
  filtered,
  (rows) => emit("update:filteredIds", rows.map((record) => record.id)),
  { immediate: true }
);

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)));

const pageRows = computed(() => filtered.value.slice(pageIndex.value * PAGE_SIZE, (pageIndex.value + 1) * PAGE_SIZE));

// Keep the page in range when results shrink (clear, filter) or grow.
watch(pageCount, (count) => {
  if (pageIndex.value >= count) {
    pageIndex.value = count - 1;
  }
});

watch(query, () => {
  pageIndex.value = 0;
});

const selectedSet = computed(() => new Set(props.selectedIds));

const allOnPageSelected = computed(() => pageRows.value.length > 0 && pageRows.value.every((record) => selectedSet.value.has(record.id)));

function toggleRow(id) {
  const next = new Set(props.selectedIds);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  emit("update:selectedIds", [...next]);
}

function togglePage() {
  const next = new Set(props.selectedIds);
  for (const record of pageRows.value) {
    if (allOnPageSelected.value) {
      next.delete(record.id);
    } else {
      next.add(record.id);
    }
  }
  emit("update:selectedIds", [...next]);
}

function clearSelection() {
  emit("update:selectedIds", []);
}

function dateOf(iso) {
  return new Date(iso).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}
</script>

<template>
  <section class="card flex min-h-0 flex-1 flex-col">
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <h2 class="card-title mb-0 whitespace-nowrap">
        <i class="fa-solid fa-house text-brand-600" aria-hidden="true"></i>
        Bulunan ilanlar
        <span class="pill-glass font-mono">{{ results.length }}</span>
      </h2>

      <div class="relative w-44">
        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-ink-faint" aria-hidden="true"></i>
        <input v-model="query" class="field pl-8" type="search" placeholder="Ara" :disabled="results.length === 0" />
      </div>

      <span v-if="selectedIds.length > 0" class="pill bg-brand-400/90 text-[#1d1d1f]">
        {{ selectedIds.length }} seçili
        <button class="ml-0.5 opacity-70 hover:opacity-100" type="button" title="Seçimi kaldır" @click="clearSelection">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      </span>

      <div class="ml-auto flex items-center gap-1.5">
        <button class="btn btn-glass" type="button" title="Dışa aktar" :disabled="results.length === 0" @click="emit('export')">
          <i class="fa-solid fa-file-export" aria-hidden="true"></i>Dışa aktar
        </button>
        <button class="btn btn-danger ml-1" type="button" :disabled="results.length === 0" @click="emit('clear')">
          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>Temizle
        </button>
      </div>
    </div>

    <div class="glass-inset scroll-thin min-h-0 flex-1 overflow-auto">
      <table class="w-full text-[13px]">
        <thead class="sticky top-0 bg-glass-raised text-left text-[11px] font-semibold tracking-wide text-ink-muted uppercase backdrop-blur-xl">
          <tr>
            <th class="w-8 px-3 py-2.5">
              <input type="checkbox" class="h-4 w-4 accent-brand-500" :checked="allOnPageSelected" :disabled="pageRows.length === 0" title="Sayfadakileri seç" @change="togglePage" />
            </th>
            <th class="px-3 py-2.5">İlan</th>
            <th class="px-3 py-2.5">Konum</th>
            <th class="px-3 py-2.5">Fiyat</th>
            <th class="px-3 py-2.5">Telefon</th>
            <th class="px-3 py-2.5">Bulunma</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="record in pageRows"
            :key="record.id"
            class="border-t border-row-line align-top transition-colors hover:bg-hover"
            :class="{ 'bg-brand-400/10': selectedSet.has(record.id) }"
          >
            <td class="px-3 py-2.5">
              <input type="checkbox" class="h-4 w-4 accent-brand-500" :checked="selectedSet.has(record.id)" @change="toggleRow(record.id)" />
            </td>
            <td class="px-3 py-2.5">
              <a href="#" class="font-semibold hover:underline" @click.prevent="emit('open', record.url)">{{ record.title }}</a>
              <div class="mt-0.5 text-[11px] text-ink-muted">
                {{ record.categorySlug }} · {{ record.citySlug }}
                <span v-if="record.sellerKind === 'unknown'" class="pill ml-1 bg-amber-400/20 text-amber-700 dark:text-amber-300">satıcı türü belirsiz</span>
              </div>
            </td>
            <td class="px-3 py-2.5 text-ink-muted">{{ record.location }}</td>
            <td class="px-3 py-2.5 font-mono whitespace-nowrap">{{ record.price }}</td>
            <td class="px-3 py-2.5 whitespace-nowrap">
              <div v-for="phone in record.phones" :key="phone" class="flex items-center gap-1">
                <span class="font-mono text-[12.5px] tabular-nums">{{ phone }}</span>
                <button class="btn-icon h-6 w-6 text-[11px]" type="button" title="Kopyala" @click="emit('copy', phone)">
                  <i class="fa-regular fa-copy" aria-hidden="true"></i>
                </button>
              </div>
            </td>
            <td class="px-3 py-2.5 font-mono text-[11px] whitespace-nowrap text-ink-muted">{{ dateOf(record.seenAt) }}</td>
          </tr>
          <tr v-if="results.length === 0">
            <td colspan="6" class="px-3 py-14 text-center text-[13px] text-ink-muted">
              <i class="fa-regular fa-folder-open mb-2 block text-3xl text-ink-faint" aria-hidden="true"></i>
              Henüz ilan yok. Tarama bittiğinde bulunan sahibinden ilanları burada listelenir.
            </td>
          </tr>
          <tr v-else-if="filtered.length === 0">
            <td colspan="6" class="px-3 py-8 text-center text-[13px] text-ink-muted">Aramayla eşleşen ilan yok.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pageCount > 1" class="mt-3 flex items-center justify-center gap-3 text-[12px] text-ink-muted">
      <button class="btn-icon" type="button" :disabled="pageIndex === 0" title="Önceki sayfa" @click="pageIndex -= 1">
        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
      </button>
      <span class="font-mono">Sayfa {{ pageIndex + 1 }} / {{ pageCount }} · {{ filtered.length }} ilan</span>
      <button class="btn-icon" type="button" :disabled="pageIndex >= pageCount - 1" title="Sonraki sayfa" @click="pageIndex += 1">
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </button>
    </div>
  </section>
</template>
