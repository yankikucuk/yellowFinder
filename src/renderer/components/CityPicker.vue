<script setup>
/**
 * Searchable multi-select for the 81 provinces. Selected cities show as
 * removable chips above a filter box; the list below is filtered as the
 * user types, with Turkish-aware matching ("ist" finds "İstanbul").
 */
import { computed, ref } from "vue";

const props = defineProps({
  cities: { type: Array, required: true }
});

const selected = defineModel({ type: Array, required: true });

const query = ref("");

/**
 * Lowercases with Turkish rules and strips diacritics so that "ist" matches
 * "İstanbul" and "canakkale" matches "Çanakkale".
 *
 * @param {string} text Any text.
 * @returns {string} Normalised text for matching.
 */
function normalise(text) {
  return text
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const filtered = computed(() => {
  const needle = normalise(query.value.trim());
  if (needle.length === 0) {
    return props.cities;
  }
  return props.cities.filter((city) => normalise(city.label).includes(needle) || city.slug.includes(needle));
});

const selectedCities = computed(() => selected.value.map((slug) => props.cities.find((city) => city.slug === slug)).filter(Boolean));

function toggle(slug) {
  const index = selected.value.indexOf(slug);
  if (index === -1) {
    selected.value.push(slug);
  } else {
    selected.value.splice(index, 1);
  }
}

function clearAll() {
  selected.value.splice(0, selected.value.length);
}
</script>

<template>
  <div>
    <div v-if="selectedCities.length > 0" class="mb-2 flex flex-wrap gap-1.5">
      <button
        v-for="city in selectedCities"
        :key="city.slug"
        class="pill bg-brand-100 text-ink hover:bg-brand-200"
        type="button"
        :title="`${city.label} seçimini kaldır`"
        @click="toggle(city.slug)"
      >
        {{ city.label }}
        <i class="fa-solid fa-xmark text-[10px] text-ink-muted" aria-hidden="true"></i>
      </button>
      <button v-if="selectedCities.length > 1" class="pill text-ink-muted hover:bg-brand-50" type="button" @click="clearAll">
        Tümünü kaldır
      </button>
    </div>

    <div class="relative mb-2">
      <i class="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-ink-muted" aria-hidden="true"></i>
      <input v-model="query" class="field pl-8" type="search" placeholder="Şehir ara" />
    </div>

    <div class="scroll-thin max-h-44 overflow-y-auto rounded-xl border border-line">
      <label v-for="city in filtered" :key="city.slug" class="check rounded-none">
        <input type="checkbox" :checked="selected.includes(city.slug)" @change="toggle(city.slug)" />
        {{ city.label }}
      </label>
      <p v-if="filtered.length === 0" class="px-3 py-4 text-center text-xs text-ink-muted">Eşleşen şehir yok.</p>
    </div>
  </div>
</template>
