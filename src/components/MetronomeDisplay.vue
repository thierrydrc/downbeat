<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  currentBeat: { type: Number, default: -1 },
  isPlaying: { type: Boolean, default: false },
  beatsPerMeasure: { type: Number, default: 4 },
})

const emit = defineEmits(['toggle'])

const isDownbeat = computed(() => props.currentBeat === 0)
const dots = computed(() => Array.from({ length: props.beatsPerMeasure }, (_, i) => i))

// Purement visuel : force le redémarrage de l'animation de flash à chaque
// nouveau temps, sans jamais toucher au timing audio réel.
const flashKey = ref(0)
watch(
  () => props.currentBeat,
  (beat) => {
    if (beat >= 0) flashKey.value++
  },
)
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <button
      type="button"
      class="relative flex h-36 w-36 items-center justify-center rounded-full border-4 outline-none transition-colors duration-100 motion-reduce:transition-none focus-visible:ring-4 focus-visible:ring-offset-4 focus-visible:ring-offset-downbeat-bg sm:h-44 sm:w-44"
      :class="
        isDownbeat
          ? 'border-downbeat-accent bg-downbeat-accent/20 focus-visible:ring-downbeat-accent'
          : currentBeat >= 0
            ? 'border-downbeat-offbeat bg-downbeat-offbeat/20 focus-visible:ring-downbeat-offbeat'
            : 'border-downbeat-panel-2 bg-downbeat-panel focus-visible:ring-downbeat-accent'
      "
      :aria-pressed="isPlaying"
      aria-label="Démarrer ou arrêter le métronome"
      @click="emit('toggle')"
    >
      <span
        :key="flashKey"
        class="absolute inset-3 rounded-full motion-safe:animate-[pulse-beat_180ms_ease-out]"
        :class="isDownbeat ? 'bg-downbeat-accent' : currentBeat >= 0 ? 'bg-downbeat-offbeat' : 'bg-transparent'"
      />
      <span class="relative font-mono text-lg tracking-widest text-downbeat-text/80">
        {{ isPlaying ? 'STOP' : 'START' }}
      </span>
    </button>

    <div class="flex gap-3" role="list" aria-label="Position dans la mesure">
      <span
        v-for="dot in dots"
        :key="dot"
        role="listitem"
        class="h-3 w-3 rounded-full transition-colors duration-100 motion-reduce:transition-none"
        :class="
          dot === currentBeat
            ? dot === 0
              ? 'bg-downbeat-accent'
              : 'bg-downbeat-offbeat'
            : 'bg-downbeat-panel-2'
        "
      />
    </div>
  </div>
</template>
