<script setup>
defineProps({
  volume: { type: Number, required: true },
  boostEnabled: { type: Boolean, default: false },
})

const emit = defineEmits(['set-volume', 'set-boost'])
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

    <!-- Generous spacing + distinct frame: on mobile, a finger slipping off
    the volume slider shouldn't accidentally toggle the boost. -->
    <label
      class="mt-5 flex min-h-11 items-center gap-3 rounded-lg border border-downbeat-panel-2 px-3 py-2.5 text-sm text-downbeat-text outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-downbeat-accent"
    >
      <input
        type="checkbox"
        class="h-5 w-5 shrink-0 accent-downbeat-accent"
        :checked="boostEnabled"
        @change="emit('set-boost', $event.target.checked)"
      />
      <span class="flex-1">Boost entrée ligne</span>
    </label>
    <p v-if="boostEnabled" class="mt-2 text-[11px] text-downbeat-text/40">
      Le son est amplifié numériquement au-delà de 100 % puis limité pour éviter toute
      saturation — utile pour une sortie ligne/casque vers une console. Le résultat réel
      dépend du plafond matériel de sortie de l'appareil : testez en conditions réelles.
    </p>
  </div>
</template>
