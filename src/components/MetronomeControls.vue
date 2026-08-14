<script setup>
import { mdiMinus, mdiPlus } from '@mdi/js'
import { useI18n } from '../composables/useI18n.js'
import MdiIcon from './MdiIcon.vue'

const { t } = useI18n()

defineProps({
  tempo: { type: Number, required: true },
  beatsPerMeasure: { type: Number, required: true },
  minTempo: { type: Number, required: true },
  maxTempo: { type: Number, required: true },
})

const emit = defineEmits(['set-tempo', 'increment-tempo', 'tap-tempo', 'set-beats-per-measure'])
</script>

<template>
  <div class="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-downbeat-panel p-5 shadow-lg">
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label for="tempo-slider" class="text-sm text-downbeat-text/70">{{ t('controls.tempo') }}</label>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="flex h-10 items-center rounded-lg bg-downbeat-panel-2 px-4 text-xs font-semibold uppercase tracking-wide text-downbeat-text outline-none transition-colors motion-reduce:transition-none hover:bg-downbeat-panel-2/70 focus-visible:ring-2 focus-visible:ring-downbeat-accent"
            @click="emit('tap-tempo')"
          >
            Tap
          </button>
          <span class="select-none font-mono text-2xl tabular-nums text-downbeat-text">
            {{ tempo }} <span class="text-sm text-downbeat-text/50">BPM</span>
          </span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-downbeat-panel-2 text-downbeat-text outline-none transition-colors motion-reduce:transition-none hover:bg-downbeat-panel-2/70 focus-visible:ring-2 focus-visible:ring-downbeat-accent disabled:opacity-40"
          :disabled="tempo <= minTempo"
          :aria-label="t('controls.decreaseTempo')"
          @click="emit('increment-tempo', -1)"
        >
          <MdiIcon :path="mdiMinus" class="h-5 w-5" />
        </button>
        <input
          id="tempo-slider"
          type="range"
          :min="minTempo"
          :max="maxTempo"
          :value="tempo"
          class="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-downbeat-panel-2 accent-downbeat-accent outline-none focus-visible:ring-2 focus-visible:ring-downbeat-accent"
          @input="emit('set-tempo', Number($event.target.value))"
        />
        <button
          type="button"
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-downbeat-panel-2 text-downbeat-text outline-none transition-colors motion-reduce:transition-none hover:bg-downbeat-panel-2/70 focus-visible:ring-2 focus-visible:ring-downbeat-accent disabled:opacity-40"
          :disabled="tempo >= maxTempo"
          :aria-label="t('controls.increaseTempo')"
          @click="emit('increment-tempo', 1)"
        >
          <MdiIcon :path="mdiPlus" class="h-5 w-5" />
        </button>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <span class="select-none text-sm text-downbeat-text/70">{{ t('controls.measure') }}</span>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="option in [4, 3]"
          :key="option"
          type="button"
          class="rounded-xl py-3 text-sm font-semibold outline-none transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-downbeat-accent"
          :class="
            beatsPerMeasure === option
              ? 'bg-downbeat-panel-2 text-downbeat-text ring-2 ring-downbeat-offbeat'
              : 'bg-downbeat-panel-2 text-downbeat-text/60 hover:text-downbeat-text'
          "
          :aria-pressed="beatsPerMeasure === option"
          @click="emit('set-beats-per-measure', option)"
        >
          {{ option }}/4
        </button>
      </div>
    </div>

    <slot />
  </div>
</template>
