<script setup>
/**
 * Sidebar: saved search profiles and timing. A profile is a named set of
 * categories and cities with an on/off switch; one profile at a time is
 * open for editing. Changes are sent to the main process with the "save"
 * event; the parent stores the result. The panel tracks whether the draft
 * differs from the saved settings so the save button only lights up when
 * there is something to save.
 */
import { computed, reactive, ref, watch } from "vue";
import CityPicker from "./CityPicker.vue";

const props = defineProps({
  settings: { type: Object, required: true },
  cities: { type: Array, required: true },
  categories: { type: Array, required: true }
});

const emit = defineEmits(["save"]);

/** Upper bound mirrored from the settings store. */
const MAX_PROFILES = 20;

/**
 * Deep-copies settings so that editing the draft never mutates the parent's
 * state. Settings are plain JSON, and a JSON round trip also works on Vue's
 * reactive proxies, which `structuredClone` refuses.
 *
 * @param {object} settings Settings from the main process.
 * @returns {object} Independent copy.
 */
function copySettings(settings) {
  return JSON.parse(JSON.stringify(settings));
}

const draft = reactive(copySettings(props.settings));
const openProfileId = ref(props.settings.profiles[0]?.id ?? null);

watch(
  () => props.settings,
  (next) => {
    Object.assign(draft, copySettings(next));
    if (!draft.profiles.some((profile) => profile.id === openProfileId.value)) {
      openProfileId.value = draft.profiles[0]?.id ?? null;
    }
  }
);

const dirty = computed(() => JSON.stringify(draft) !== JSON.stringify(props.settings));

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

const cityLabel = (slug) => props.cities.find((city) => city.slug === slug)?.label ?? slug;

/**
 * Short description shown under a profile name.
 *
 * @param {object} profile Profile.
 * @returns {string} Summary in Turkish.
 */
function summarise(profile) {
  if (profile.categories.length === 0 || profile.cities.length === 0) {
    return "Kategori veya şehir seçilmedi";
  }
  const cityText = profile.cities.length <= 2 ? profile.cities.map(cityLabel).join(", ") : `${profile.cities.length} şehir`;
  return `${profile.categories.length} kategori · ${cityText}`;
}

function toggleOpen(id) {
  openProfileId.value = openProfileId.value === id ? null : id;
}

function toggleCategory(profile, slug) {
  const index = profile.categories.indexOf(slug);
  if (index === -1) {
    profile.categories.push(slug);
  } else {
    profile.categories.splice(index, 1);
  }
}

function addProfile() {
  if (draft.profiles.length >= MAX_PROFILES) {
    return;
  }
  // A temporary id is enough for the draft; the store assigns a permanent one on save.
  const profile = { id: `new-${Date.now()}`, name: `Arama ${draft.profiles.length + 1}`, enabled: true, categories: [], cities: [] };
  draft.profiles.push(profile);
  openProfileId.value = profile.id;
}

function removeProfile(id) {
  const index = draft.profiles.findIndex((profile) => profile.id === id);
  if (index !== -1 && window.confirm("Bu arama profili silinecek. Emin misiniz?")) {
    draft.profiles.splice(index, 1);
    if (openProfileId.value === id) {
      openProfileId.value = draft.profiles[0]?.id ?? null;
    }
  }
}

function save() {
  emit("save", copySettings(draft));
}
</script>

<template>
  <section class="card">
    <h2 class="card-title">
      <i class="fa-solid fa-bookmark text-brand-600" aria-hidden="true"></i>
      Arama profilleri
      <button
        class="btn-icon ml-auto"
        type="button"
        title="Yeni profil"
        aria-label="Yeni profil"
        :disabled="draft.profiles.length >= MAX_PROFILES"
        @click="addProfile"
      >
        <i class="fa-solid fa-plus" aria-hidden="true"></i>
      </button>
    </h2>

    <p v-if="draft.profiles.length === 0" class="glass-inset px-3 py-4 text-center text-[12px] text-ink-muted">
      Henüz profil yok. Artı ile bir profil ekleyin.
    </p>

    <div v-for="profile in draft.profiles" :key="profile.id" class="glass-inset mb-2 last:mb-0">
      <div class="flex items-center gap-2 px-2.5 py-2">
        <label class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center" :title="profile.enabled ? 'Taramaya dahil' : 'Tarama dışı'">
          <input v-model="profile.enabled" type="checkbox" class="peer sr-only" />
          <span class="absolute inset-0 rounded-full bg-inset-border transition-colors peer-checked:bg-brand-400"></span>
          <span class="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4"></span>
        </label>
        <button class="min-w-0 flex-1 text-left" type="button" @click="toggleOpen(profile.id)">
          <span class="block truncate text-[13px] font-semibold" :class="{ 'text-ink-muted': !profile.enabled }">{{ profile.name }}</span>
          <span class="block truncate text-[11px] text-ink-muted">{{ summarise(profile) }}</span>
        </button>
        <button class="btn-icon h-7 w-7" type="button" :title="openProfileId === profile.id ? 'Kapat' : 'Düzenle'" @click="toggleOpen(profile.id)">
          <i class="fa-solid text-xs" :class="openProfileId === profile.id ? 'fa-chevron-up' : 'fa-pen'" aria-hidden="true"></i>
        </button>
      </div>

      <div v-if="openProfileId === profile.id" class="border-t border-inset-border px-2.5 pt-3 pb-2.5">
        <span class="label">Ad</span>
        <input v-model="profile.name" class="field mb-3" type="text" maxlength="60" />

        <span class="label">Kategoriler <span class="font-mono normal-case">{{ profile.categories.length }}</span></span>
        <div class="scroll-thin mb-3 max-h-[22vh] min-h-32 overflow-y-auto rounded-xl border border-inset-border p-1">
          <div v-for="[group, items] in categoryGroups" :key="group" class="mb-1 last:mb-0">
            <div class="label px-2 pt-1.5">{{ group }}</div>
            <label v-for="category in items" :key="category.slug" class="check py-1">
              <input type="checkbox" :checked="profile.categories.includes(category.slug)" @change="toggleCategory(profile, category.slug)" />
              {{ category.label }}
            </label>
          </div>
        </div>

        <span class="label">Şehirler <span class="font-mono normal-case">{{ profile.cities.length }}</span></span>
        <CityPicker v-model="profile.cities" :cities="cities" />

        <button class="btn btn-danger mt-3 w-full justify-center" type="button" @click="removeProfile(profile.id)">
          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
          Profili sil
        </button>
      </div>
    </div>
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

    <details class="group mt-3">
      <summary class="label cursor-pointer list-none">
        <i class="fa-solid fa-chevron-right mr-1 text-[9px] transition-transform group-open:rotate-90" aria-hidden="true"></i>
        Gelişmiş
      </summary>
      <span class="label mt-2">Ek sorgu parametreleri (isteğe bağlı)</span>
      <input v-model="draft.extraQuery" class="field font-mono text-xs" type="text" placeholder="a=b&c=d" />
      <p class="mt-1.5 text-[11.5px] leading-snug text-ink-muted">
        Sitede seçtiğiniz ek filtreleri adres çubuğundan kopyalayıp buraya yapıştırabilirsiniz. Emlakçı ilanları bundan bağımsız olarak her zaman elenir.
      </p>
    </details>

    <button class="btn mt-4 w-full justify-center" :class="dirty ? 'btn-primary' : 'btn-glass'" type="button" :disabled="!dirty" @click="save">
      <i class="fa-solid" :class="dirty ? 'fa-floppy-disk' : 'fa-check'" aria-hidden="true"></i>
      {{ dirty ? "Ayarları kaydet" : "Ayarlar kayıtlı" }}
    </button>
  </section>
</template>
