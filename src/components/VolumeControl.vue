<script setup>
defineProps({
  volume: { type: Number, required: true },
  maxVolume: { type: Number, default: 1 },
})

const emit = defineEmits(['set-volume'])
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-2 rounded-2xl bg-downbeat-panel p-5 shadow-lg">
    <div class="flex items-center justify-between">
      <label for="volume-slider" class="text-sm text-downbeat-text/70">Volume</label>
      <span class="font-mono text-sm tabular-nums text-downbeat-text/70">
        {{ Math.round(volume * 100) }}%
      </span>
    </div>
    <input
      id="volume-slider"
      type="range"
      min="0"
      :max="maxVolume"
      step="0.01"
      :value="volume"
      class="h-2 w-full cursor-pointer appearance-none rounded-full bg-downbeat-panel-2 accent-downbeat-offbeat outline-none focus-visible:ring-2 focus-visible:ring-downbeat-offbeat"
      @input="emit('set-volume', Number($event.target.value))"
    />
    <p v-if="maxVolume > 1" class="text-[11px] text-downbeat-text/40">
      Au-delà de 100%, le son est amplifié numériquement puis limité pour éviter toute
      saturation — utile pour une sortie ligne/casque vers une console (scène).
    </p>
  </div>
</template>
