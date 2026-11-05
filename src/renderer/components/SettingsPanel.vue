<script setup>
/**
 * Lets the user pick categories, cities and timing. Changes are sent to the
 * main process with the "save" event; the parent stores the result. The
 * panel tracks whether the draft differs from the saved settings so the
 * save button only lights up when there is something to save.
 */
import { computed, reactive, watch } from "vue";
import CityPicker from "./CityPicker.vue";

const props = defineProps({
  settings: { type: Object, required: true },
  cities: { type: Array, required: true },
  categories: { type: Array, required: true }
});

const emit = defineEmits(["save"]);

/**
 * Copies settings so that editing the draft never mutates the parent's state.
 *
 * @param {object} settings Settings from the main process.
 * @returns {object} Independent copy.
 */
function copySettings(settings) {
  return { ...settings, categories: [...settings.categories], cities: [...settings.cities] };
}

const draft = reactive(copySettings(props.settings));

watch(
  () => props.settings,
  (next) => Object.assign(draft, copySettings(next))
);

const dirty = computed(() => JSON.stringify(copySettings(draft)) !== JSON.stringify(copySettings(props.settings)));

const categoryGroups = computed(() => {
  const groups = new Map();
  for (const category of props.categories) {
    if (!groups.has(category.group)) {
      groups.set(category.group, []);
    }
    groups.get(category.group).push(category);
  }
  return [...groups.entries()];
});

function toggleCategory(slug) {
  const index = draft.categories.indexOf(slug);
  if (index === -1) {
    draft.categories.push(slug);
  } else {
    draft.categories.splice(index, 1);
  }
}

function save() {
  emit("save", copySettings(draft));
}
</script>

<template>
  <section class="card">
    <h2 class="card-title">
      <i class="fa-solid fa-layer-group text-brand-600" aria-hidden="true"></i>
      Kategoriler
      <span class="pill-glass ml-auto font-mono">{{ draft.categories.length }}</span>
    </h2>
    <div class="glass-inset p-1">
      <div v-for="[group, items] in categoryGroups" :key="group" class="mb-1 last:mb-0">
        <div class="label px-2.5 pt-2">{{ group }}</div>
        <label v-for="category in items" :key="category.slug" class="check">
          <input type="checkbox" :checked="draft.categories.includes(category.slug)" @change="toggleCategory(category.slug)" />
          {{ category.label }}
        </label>
      </div>
    </div>
  </section>

  <section class="card">
    <h2 class="card-title">
      <i class="fa-solid fa-city text-brand-600" aria-hidden="true"></i>
      Şehirler
      <span class="pill-glass ml-auto font-mono">{{ draft.cities.length }}</span>
    </h2>
    <CityPicker v-model="draft.cities" :cities="cities" />
  </section>

  <section class="card">
    <h2 class="card-title">
      <i class="fa-solid fa-clock text-brand-600" aria-hidden="true"></i>
      Zamanlama
    </h2>

    <label class="check glass-inset mb-3">
      <input v-model="draft.autoScan" type="checkbox" />
      Otomatik tarama açık
    </label>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <span class="label">Aralık (dk)</span>
        <input v-model.number="draft.intervalMinutes" class="field font-mono" type="number" min="15" max="1440" />
      </div>
      <div>
        <span class="label">Sayfa / arama</span>
        <input v-model.number="draft.maxPagesPerSearch" class="field font-mono" type="number" min="1" max="20" />
      </div>
      <div>
        <span class="label">En az bekleme (sn)</span>
        <input v-model.number="draft.minDelaySeconds" class="field font-mono" type="number" min="2" max="120" />
      </div>
      <div>
        <span class="label">En çok bekleme (sn)</span>
        <input v-model.number="draft.maxDelaySeconds" class="field font-mono" type="number" min="2" max="300" />
      </div>
    </div>

    <div class="mt-3">
      <span class="label">Ek sorgu parametreleri</span>
      <input v-model="draft.extraQuery" class="field font-mono text-xs" type="text" placeholder="a=b&c=d" />
      <p class="mt-1.5 text-[11.5px] leading-snug text-ink-muted">
        Sitede filtre seçip adres çubuğundaki soru işaretinden sonrasını yapıştırın. "Kimden: Sahibinden" filtresi burada verilirse emlakçı ilanları hiç açılmaz.
      </p>
    </div>

    <button class="btn mt-4 w-full justify-center" :class="dirty ? 'btn-primary' : 'btn-glass'" type="button" :disabled="!dirty" @click="save">
      <i class="fa-solid" :class="dirty ? 'fa-floppy-disk' : 'fa-check'" aria-hidden="true"></i>
      {{ dirty ? "Ayarları kaydet" : "Ayarlar kayıtlı" }}
    </button>
  </section>
</template>
