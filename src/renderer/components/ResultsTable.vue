<script setup>
/**
 * Lists the collected owner listings with their phone numbers and offers
 * search, export, copy and clear actions. Rows are filtered by a text box
 * and paged so a store with thousands of listings stays responsive.
 */
import { computed, ref, watch } from "vue";

const props = defineProps({
  results: { type: Array, required: true }
});

const emit = defineEmits(["export", "clear", "open", "copy"]);

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
        <span class="pill bg-brand-50 text-ink-muted">{{ results.length }}</span>
      </h2>

      <div class="relative w-48">
        <i class="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-ink-muted" aria-hidden="true"></i>
        <input v-model="query" class="field pl-8" type="search" placeholder="Başlık, konum veya telefon ara" :disabled="results.length === 0" />
      </div>

      <div class="ml-auto flex items-center gap-1.5">
        <button class="btn btn-secondary" type="button" :disabled="results.length === 0" title="Metin olarak dışa aktar" @click="emit('export', 'txt')">
          <i class="fa-solid fa-file-lines" aria-hidden="true"></i>TXT
        </button>
        <button class="btn btn-secondary" type="button" :disabled="results.length === 0" title="CSV olarak dışa aktar" @click="emit('export', 'csv')">
          <i class="fa-solid fa-file-csv" aria-hidden="true"></i>CSV
        </button>
        <button class="btn btn-secondary" type="button" :disabled="results.length === 0" title="PDF olarak dışa aktar" @click="emit('export', 'pdf')">
          <i class="fa-solid fa-file-pdf" aria-hidden="true"></i>PDF
        </button>
        <button class="btn btn-danger ml-1" type="button" :disabled="results.length === 0" @click="emit('clear')">
          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>Temizle
        </button>
      </div>
    </div>

    <div class="scroll-thin min-h-0 flex-1 overflow-auto rounded-xl border border-line">
      <table class="w-full text-sm">
        <thead class="sticky top-0 bg-brand-100 text-left text-xs text-ink-muted">
          <tr>
            <th class="px-3 py-2 font-medium">İlan</th>
            <th class="px-3 py-2 font-medium">Konum</th>
            <th class="px-3 py-2 font-medium">Fiyat</th>
            <th class="px-3 py-2 font-medium">Telefon</th>
            <th class="px-3 py-2 font-medium">Bulunma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in pageRows" :key="record.id" class="border-t border-line align-top hover:bg-brand-50">
            <td class="px-3 py-2">
              <a href="#" class="font-medium hover:underline" @click.prevent="emit('open', record.url)">{{ record.title }}</a>
              <div class="mt-0.5 text-xs text-ink-muted">
                {{ record.categorySlug }} · {{ record.citySlug }}
                <span v-if="record.sellerKind === 'unknown'" class="pill ml-1 bg-amber-50 text-amber-700">satıcı türü belirsiz</span>
              </div>
            </td>
            <td class="px-3 py-2 text-ink-muted">{{ record.location }}</td>
            <td class="px-3 py-2 whitespace-nowrap">{{ record.price }}</td>
            <td class="px-3 py-2 whitespace-nowrap">
              <div v-for="phone in record.phones" :key="phone" class="flex items-center gap-1">
                <span class="font-mono text-[13px] tabular-nums">{{ phone }}</span>
                <button class="btn-icon h-6 w-6 text-xs" type="button" title="Kopyala" @click="emit('copy', phone)">
                  <i class="fa-regular fa-copy" aria-hidden="true"></i>
                </button>
              </div>
            </td>
            <td class="px-3 py-2 text-xs whitespace-nowrap text-ink-muted">{{ dateOf(record.seenAt) }}</td>
          </tr>
          <tr v-if="results.length === 0">
            <td colspan="5" class="px-3 py-12 text-center text-sm text-ink-muted">
              <i class="fa-regular fa-folder-open mb-2 block text-3xl" aria-hidden="true"></i>
              Henüz ilan yok. Tarama bittiğinde bulunan sahibinden ilanları burada listelenir.
            </td>
          </tr>
          <tr v-else-if="filtered.length === 0">
            <td colspan="5" class="px-3 py-8 text-center text-sm text-ink-muted">Aramayla eşleşen ilan yok.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pageCount > 1" class="mt-3 flex items-center justify-center gap-3 text-xs text-ink-muted">
      <button class="btn-icon" type="button" :disabled="pageIndex === 0" title="Önceki sayfa" @click="pageIndex -= 1">
        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
      </button>
      <span>Sayfa {{ pageIndex + 1 }} / {{ pageCount }} · {{ filtered.length }} ilan</span>
      <button class="btn-icon" type="button" :disabled="pageIndex >= pageCount - 1" title="Sonraki sayfa" @click="pageIndex += 1">
        <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
      </button>
    </div>
  </section>
</template>
