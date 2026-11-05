<script setup>
/**
 * Lets the user pick categories, cities and timing. Changes are sent to the
 * main process with the "save" event; the parent stores the result.
 */
import { computed, reactive, watch } from "vue";

const props = defineProps({
  settings: { type: Object, required: true },
  cities: { type: Array, required: true },
  categories: { type: Array, required: true }
});

const emit = defineEmits(["save"]);

const draft = reactive({ ...props.settings });

watch(
  () => props.settings,
  (next) => Object.assign(draft, next)
);

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

function toggle(list, slug) {
  const index = list.indexOf(slug);
  if (index === -1) {
    list.push(slug);
  } else {
    list.splice(index, 1);
  }
}

function save() {
  emit("save", { ...draft, categories: [...draft.categories], cities: [...draft.cities] });
}
</script>

<template>
  <section class="card">
    <h2>Kategoriler</h2>
    <div v-for="[group, items] in categoryGroups" :key="group" class="group">
      <div class="muted group-title">{{ group }}</div>
      <label v-for="category in items" :key="category.slug" class="check">
        <input type="checkbox" :checked="draft.categories.includes(category.slug)" @change="toggle(draft.categories, category.slug)" />
        {{ category.label }}
      </label>
    </div>
  </section>

  <section class="card">
    <h2>Şehirler <span class="muted">({{ draft.cities.length }})</span></h2>
    <div class="cities">
      <label v-for="city in cities" :key="city.slug" class="check">
        <input type="checkbox" :checked="draft.cities.includes(city.slug)" @change="toggle(draft.cities, city.slug)" />
        {{ city.label }}
      </label>
    </div>
  </section>

  <section class="card">
    <h2>Zamanlama</h2>
    <label class="field">
      <input v-model="draft.autoScan" type="checkbox" />
      Otomatik tarama açık
    </label>
    <label class="field">
      Aralık (dakika)
      <input v-model.number="draft.intervalMinutes" type="number" min="15" max="1440" />
    </label>
    <label class="field">
      Her arama için sayfa sayısı
      <input v-model.number="draft.maxPagesPerSearch" type="number" min="1" max="20" />
    </label>
    <label class="field">
      Sayfalar arası bekleme (sn, en az / en çok)
      <span class="pair">
        <input v-model.number="draft.minDelaySeconds" type="number" min="2" max="120" />
        <input v-model.number="draft.maxDelaySeconds" type="number" min="2" max="300" />
      </span>
    </label>
    <label class="field">
      Ek sorgu parametreleri
      <input v-model="draft.extraQuery" type="text" placeholder="siteden kopyalanan ?a=b&c=d" />
      <span class="muted hint">Sitede filtre seçip adres çubuğundaki soru işaretinden sonrasını yapıştırın. "Kimden: Sahibinden" filtresi burada verilirse emlakçı ilanları hiç açılmaz.</span>
    </label>
    <button @click="save">Ayarları kaydet</button>
  </section>
</template>

<style scoped>
.group {
  margin-bottom: 8px;
}

.group-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.check {
  display: block;
  padding: 2px 0;
}

.cities {
  max-height: 220px;
  overflow: auto;
  columns: 2;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}

.pair {
  display: flex;
  gap: 6px;
}

.pair input {
  width: 50%;
}

.hint {
  font-size: 12px;
}
</style>
