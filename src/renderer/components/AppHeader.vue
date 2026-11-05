<script setup>
/**
 * Top bar: app mark, name and version on the left, the two primary actions
 * on the right. The scan button swaps to a stop button while a scan runs.
 */
defineProps({
  version: { type: String, required: true },
  running: { type: Boolean, required: true }
});

const emit = defineEmits(["open-site", "start", "stop"]);
</script>

<template>
  <header class="flex items-center justify-between border-b border-line bg-brand-100 px-5 py-3">
    <div class="flex items-center gap-3">
      <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-400 text-ink">
        <i class="fa-solid fa-magnifying-glass-location text-lg" aria-hidden="true"></i>
      </span>
      <div>
        <h1 class="text-base leading-tight font-semibold">yellowFinder</h1>
        <p class="text-xs text-ink-muted">sahibinden.com · emlakçısı olmayan ilanlar</p>
      </div>
      <span class="pill bg-white/70 text-ink-muted">v{{ version }}</span>
    </div>

    <div class="flex items-center gap-2">
      <button class="btn btn-secondary" type="button" @click="emit('open-site')">
        <i class="fa-solid fa-right-to-bracket" aria-hidden="true"></i>
        Siteyi aç / giriş yap
      </button>
      <button v-if="!running" class="btn btn-primary" type="button" @click="emit('start')">
        <i class="fa-solid fa-play" aria-hidden="true"></i>
        Şimdi tara
      </button>
      <button v-else class="btn btn-danger" type="button" @click="emit('stop')">
        <i class="fa-solid fa-stop" aria-hidden="true"></i>
        Taramayı durdur
      </button>
    </div>
  </header>
</template>
