<script setup>
defineProps({
  volume: { type: Number, required: true },
})

const emit = defineEmits(['set-volume'])
</script>

<template>
  <div class="flex w-full max-w-md flex-col rounded-2xl bg-downbeat-panel p-5 shadow-lg">
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label for="volume-slider" class="text-sm text-downbeat-text/70">Volume</label>
        <span class="select-none font-mono text-sm tabular-nums text-downbeat-text/70">
          {{ Math.round(volume * 100) }}%
        </span>
      </div>
      <input
        id="volume-slider"
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="volume"
        class="h-2 w-full cursor-pointer appearance-none rounded-full bg-downbeat-panel-2 accent-downbeat-offbeat outline-none focus-visible:ring-2 focus-visible:ring-downbeat-offbeat"
        @input="emit('set-volume', Number($event.target.value))"
      />
    </div>
  </div>
</template>
