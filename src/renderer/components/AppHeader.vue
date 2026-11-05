<script setup>
/**
 * Floating glass top bar: app mark, name and version on the left, the two
 * primary actions on the right. The scan button swaps to a stop button
 * while a scan runs.
 */
defineProps({
  version: { type: String, required: true },
  running: { type: Boolean, required: true }
});

const emit = defineEmits(["open-site", "start", "stop"]);
</script>

<template>
  <header class="glass-raised mx-4 mt-4 flex items-center justify-between px-5 py-3">
    <div class="flex items-center gap-3">
      <span class="btn-primary flex h-11 w-11 items-center justify-center rounded-2xl text-ink">
        <i class="fa-solid fa-magnifying-glass-location text-lg" aria-hidden="true"></i>
      </span>
      <div>
        <h1 class="text-[15px] leading-tight font-bold tracking-tight">yellowFinder</h1>
        <p class="text-[11px] font-medium text-ink-muted">sahibinden.com · emlakçısı olmayan ilanlar</p>
      </div>
      <span class="pill-glass font-mono">v{{ version }}</span>
    </div>

    <div class="flex items-center gap-2">
      <button class="btn btn-glass" type="button" @click="emit('open-site')">
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
