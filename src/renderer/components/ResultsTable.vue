<script setup>
/**
 * Lists the collected owner listings with their phone numbers and offers
 * export and clear actions. Rows are paged so a store with thousands of
 * listings does not put thousands of rows into the DOM at once.
 */
import { computed, ref, watch } from "vue";

const props = defineProps({
  results: { type: Array, required: true }
});

const emit = defineEmits(["export", "clear", "open"]);

/** Rows per page; small enough to render instantly, large enough to scan by eye. */
const PAGE_SIZE = 100;

const pageIndex = ref(0);

const pageCount = computed(() => Math.max(1, Math.ceil(props.results.length / PAGE_SIZE)));

const pageRows = computed(() => props.results.slice(pageIndex.value * PAGE_SIZE, (pageIndex.value + 1) * PAGE_SIZE));

// Keep the page in range when results shrink (clear) or grow.
watch(pageCount, (count) => {
  if (pageIndex.value >= count) {
    pageIndex.value = count - 1;
  }
});

function dateOf(iso) {
  return new Date(iso).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
}
</script>

<template>
  <section class="card results">
    <div class="toolbar">
      <h2>Bulunan ilanlar <span class="muted">({{ results.length }})</span></h2>
      <div class="actions">
        <button class="secondary" :disabled="results.length === 0" @click="emit('export', 'txt')">TXT</button>
        <button class="secondary" :disabled="results.length === 0" @click="emit('export', 'csv')">CSV</button>
        <button class="secondary" :disabled="results.length === 0" @click="emit('export', 'pdf')">PDF</button>
        <button class="danger" :disabled="results.length === 0" @click="emit('clear')">Temizle</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>İlan</th>
            <th>Konum</th>
            <th>Fiyat</th>
            <th>Telefon</th>
            <th>Bulunma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in pageRows" :key="record.id">
            <td>
              <a href="#" @click.prevent="emit('open', record.url)">{{ record.title }}</a>
              <div class="muted small">{{ record.categorySlug }} · {{ record.citySlug }}<span v-if="record.sellerKind === 'unknown'"> · satıcı türü belirsiz</span></div>
            </td>
            <td>{{ record.location }}</td>
            <td>{{ record.price }}</td>
            <td class="phones">
              <div v-for="phone in record.phones" :key="phone">{{ phone }}</div>
            </td>
            <td class="muted small">{{ dateOf(record.seenAt) }}</td>
          </tr>
          <tr v-if="results.length === 0">
            <td colspan="5" class="muted">Henüz ilan yok.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="pageCount > 1" class="pager">
      <button class="secondary" :disabled="pageIndex === 0" @click="pageIndex -= 1">Önceki</button>
      <span class="muted">Sayfa {{ pageIndex + 1 }} / {{ pageCount }}</span>
      <button class="secondary" :disabled="pageIndex >= pageCount - 1" @click="pageIndex += 1">Sonraki</button>
    </div>
  </section>
</template>

<style scoped>
.results {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.actions {
  display: flex;
  gap: 6px;
}

.table-wrap {
  overflow: auto;
  flex: 1;
}

.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
}

.small {
  font-size: 12px;
}

.phones {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

a {
  color: var(--text);
}
</style>
