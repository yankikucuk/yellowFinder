<script setup>
/**
 * Floating glass top bar: app mark, name and version on the left; the
 * primary actions and the settings gear on the right. The scan button
 * swaps to a stop button while a scan runs.
 */
defineProps({
  version: { type: String, required: true },
  running: { type: Boolean, required: true }
});

const emit = defineEmits(["open-site", "start", "stop", "open-settings"]);
</script>

<template>
  <header class="glass-raised mx-4 mt-4 flex items-center justify-between px-5 py-3">
    <div class="flex items-center gap-3">
      <span class="btn-primary flex h-10 w-10 items-center justify-center rounded-xl">
        <i class="fa-solid fa-magnifying-glass-location text-base" aria-hidden="true"></i>
      </span>
      <h1 class="text-[17px] leading-none font-bold tracking-tight">YellowFinder</h1>
      <span class="pill-glass font-mono leading-none">v{{ version }}</span>
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
      <button class="btn-icon ml-1 h-9 w-9" type="button" title="Ayarlar" aria-label="Ayarlar" @click="emit('open-settings')">
        <i class="fa-solid fa-gear text-base" aria-hidden="true"></i>
      </button>
    </div>
  </header>
</template>
