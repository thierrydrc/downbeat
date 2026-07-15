<script setup>
import { onUnmounted, watch } from 'vue'
import { mdiClose } from '@mdi/js'
import MdiIcon from './MdiIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
})

const emit = defineEmits(['close'])

function handleKeydown(event) {
  if (event.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeydown)
    } else {
      window.removeEventListener('keydown', handleKeydown)
    }
  },
)

onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60" @click="emit('close')" />
      <div
        class="relative z-10 w-full max-w-sm rounded-2xl bg-downbeat-panel p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-downbeat-text">{{ title }}</h2>
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full text-downbeat-text/60 outline-none transition-colors motion-reduce:transition-none hover:text-downbeat-accent focus-visible:ring-2 focus-visible:ring-downbeat-accent"
            aria-label="Fermer"
            @click="emit('close')"
          >
            <MdiIcon :path="mdiClose" class="h-5 w-5" />
          </button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
