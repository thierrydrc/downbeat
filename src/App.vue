<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { mdiClose, mdiPlaylistMusic, mdiWeatherNight, mdiWeatherSunny } from '@mdi/js'
import { useMetronome } from './composables/useMetronome.js'
import { usePresets } from './composables/usePresets.js'
import { useTheme } from './composables/useTheme.js'
import MetronomeDisplay from './components/MetronomeDisplay.vue'
import MetronomeControls from './components/MetronomeControls.vue'
import VolumeControl from './components/VolumeControl.vue'
import PresetList from './components/PresetList.vue'
import Modal from './components/Modal.vue'
import MdiIcon from './components/MdiIcon.vue'

const {
  isPlaying,
  tempo,
  beatsPerMeasure,
  volume,
  currentBeat,
  minTempo,
  maxTempo,
  boostEnabled,
  toggle,
  setTempo,
  incrementTempo,
  setBeatsPerMeasure,
  setVolume,
  setBoost,
  tapTempo,
  loadPreset,
} = useMetronome()

const { addPreset, updatePreset } = usePresets()
const { theme, toggleTheme } = useTheme()

const loadedPreset = ref(null)
const isEditingPreset = ref(false)
const isSidebarOpen = ref(false)
const isSavePresetModalOpen = ref(false)
const newPresetName = ref('')

function closeSidebar() {
  isSidebarOpen.value = false
}

function handleKeydown(event) {
  if (event.key === 'Escape' && isSidebarOpen.value) {
    closeSidebar()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

function deselectPreset() {
  loadedPreset.value = null
  isEditingPreset.value = false
}

function handleLoadPreset(preset) {
  if (!preset) {
    deselectPreset()
    return
  }
  loadedPreset.value = { id: preset.id, name: preset.name }
  isEditingPreset.value = false
  loadPreset({ tempo: preset.tempo, beatsPerMeasure: preset.beatsPerMeasure })
  closeSidebar()
}

function handleRemovePreset(id) {
  if (loadedPreset.value?.id === id) {
    deselectPreset()
  }
}

function handleSaveEdit() {
  if (!loadedPreset.value) return
  updatePreset(loadedPreset.value.id, { tempo: tempo.value, beatsPerMeasure: beatsPerMeasure.value })
  isEditingPreset.value = false
}

function openSavePresetModal() {
  newPresetName.value = ''
  isSavePresetModalOpen.value = true
}

function closeSavePresetModal() {
  isSavePresetModalOpen.value = false
}

function handleSaveNewPreset() {
  if (!newPresetName.value.trim()) return
  const created = addPreset({ name: newPresetName.value, tempo: tempo.value, beatsPerMeasure: beatsPerMeasure.value })
  if (created) {
    loadedPreset.value = { id: created.id, name: created.name }
    isEditingPreset.value = false
  }
  closeSavePresetModal()
}
</script>

<template>
  <div id="app" class="min-h-screen w-full bg-downbeat-bg text-downbeat-text">
    <div class="flex min-h-screen flex-col px-4 py-5 md:mr-80">
      <div class="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5">
        <header class="flex items-center justify-between gap-4 md:justify-center">
          <div class="md:text-center">
            <h1 class="text-base font-bold tracking-tight">Downbeat</h1>
            <p class="text-xs text-downbeat-text/50">Métronome hors ligne</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <button
              type="button"
              class="rounded-lg border border-downbeat-panel-2 bg-downbeat-panel p-2.5 text-downbeat-text outline-none transition-colors motion-reduce:transition-none hover:bg-downbeat-panel-2 focus-visible:ring-2 focus-visible:ring-downbeat-accent"
              :aria-label="theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'"
              @click="toggleTheme"
            >
              <MdiIcon :path="theme === 'dark' ? mdiWeatherSunny : mdiWeatherNight" class="h-6 w-6" />
            </button>
            <button
              type="button"
              class="rounded-lg border border-downbeat-panel-2 bg-downbeat-panel p-2.5 text-downbeat-text outline-none transition-colors motion-reduce:transition-none hover:bg-downbeat-panel-2 focus-visible:ring-2 focus-visible:ring-downbeat-accent md:hidden"
              aria-label="Ouvrir la liste des presets"
              aria-controls="preset-sidebar"
              :aria-expanded="isSidebarOpen"
              @click="isSidebarOpen = true"
            >
              <MdiIcon :path="mdiPlaylistMusic" class="h-6 w-6" />
            </button>
          </div>
        </header>

        <main class="flex flex-1 flex-col items-center gap-4">
          <MetronomeDisplay
            :current-beat="currentBeat"
            :is-playing="isPlaying"
            :beats-per-measure="beatsPerMeasure"
            @toggle="toggle"
          />

          <div class="flex min-h-10 w-full max-w-md flex-col">
            <template v-if="loadedPreset">
              <div class="flex flex-col gap-0.5 rounded-xl bg-downbeat-panel px-3 py-2 shadow-sm">
                <span class="text-[11px] text-downbeat-text/50">Preset chargé</span>
                <div class="flex items-start justify-between gap-2">
                  <span class="break-words text-sm font-semibold text-downbeat-accent">{{ loadedPreset.name }}</span>
                  <button
                    type="button"
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-downbeat-panel-2 text-downbeat-text/60 outline-none transition-colors motion-reduce:transition-none hover:bg-downbeat-panel-2/70 hover:text-downbeat-accent focus-visible:ring-2 focus-visible:ring-downbeat-accent"
                    aria-label="Désélectionner le preset"
                    @click="deselectPreset"
                  >
                    <MdiIcon :path="mdiClose" class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </template>
          </div>

          <template v-if="!loadedPreset || isEditingPreset">
            <MetronomeControls
              :tempo="tempo"
              :beats-per-measure="beatsPerMeasure"
              :min-tempo="minTempo"
              :max-tempo="maxTempo"
              @set-tempo="setTempo"
              @increment-tempo="incrementTempo"
              @tap-tempo="tapTempo"
              @set-beats-per-measure="setBeatsPerMeasure"
            />
          </template>
          <template v-else>
            <div class="flex w-full max-w-md items-center justify-between rounded-2xl bg-downbeat-panel p-5 shadow-lg">
              <span class="font-mono text-lg tabular-nums text-downbeat-text">
                {{ tempo }} <span class="text-sm text-downbeat-text/50">BPM</span>
                <span class="text-downbeat-text/50">·</span>
                {{ beatsPerMeasure }}/4
              </span>
              <button
                type="button"
                class="flex h-10 items-center rounded-lg bg-downbeat-panel-2 px-4 text-sm font-semibold text-downbeat-text outline-none transition-colors motion-reduce:transition-none hover:bg-downbeat-panel-2/70 focus-visible:ring-2 focus-visible:ring-downbeat-accent"
                @click="isEditingPreset = true"
              >
                Modifier
              </button>
            </div>
          </template>

          <button
            v-if="loadedPreset && isEditingPreset"
            type="button"
            class="flex h-11 w-full max-w-md items-center justify-center rounded-lg bg-downbeat-accent px-3 text-sm font-semibold text-downbeat-on-accent outline-none transition-colors motion-reduce:transition-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-downbeat-accent/50"
            @click="handleSaveEdit"
          >
            Enregistrer
          </button>
          <button
            v-if="!loadedPreset"
            type="button"
            class="flex h-11 w-full max-w-md items-center justify-center rounded-lg bg-downbeat-accent px-3 text-sm font-semibold text-downbeat-on-accent outline-none transition-colors motion-reduce:transition-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-downbeat-accent/50"
            @click="openSavePresetModal"
          >
            Enregistrer le preset
          </button>

          <VolumeControl
            :volume="volume"
            :boost-enabled="boostEnabled"
            @set-volume="setVolume"
            @set-boost="setBoost"
          />
        </main>
      </div>
    </div>

    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-30 bg-black/60 md:hidden"
      @click="closeSidebar"
    />

    <aside
      id="preset-sidebar"
      class="fixed inset-y-0 right-0 z-40 w-80 max-w-[85vw] transform overflow-y-auto bg-downbeat-panel transition-transform duration-200 ease-out motion-reduce:transition-none md:translate-x-0"
      :class="isSidebarOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <div class="flex items-center justify-between p-4 md:hidden">
        <span class="text-lg font-semibold">Presets</span>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full text-downbeat-text/70 outline-none transition-colors motion-reduce:transition-none hover:text-downbeat-accent focus-visible:ring-2 focus-visible:ring-downbeat-accent"
          aria-label="Fermer la liste des presets"
          @click="closeSidebar"
        >
          <MdiIcon :path="mdiClose" class="h-5 w-5" />
        </button>
      </div>

      <div class="h-full px-4 pb-6 md:p-6">
        <PresetList
          :selected-preset-id="loadedPreset?.id ?? null"
          @load-preset="handleLoadPreset"
          @remove-preset="handleRemovePreset"
        />
      </div>
    </aside>

    <Modal :open="isSavePresetModalOpen" title="Enregistrer le preset" @close="closeSavePresetModal">
      <form class="flex flex-col gap-3" @submit.prevent="handleSaveNewPreset">
        <input
          v-model="newPresetName"
          type="text"
          placeholder="Nom du preset"
          class="rounded-lg bg-downbeat-panel-2 px-3 py-2 text-downbeat-text outline-none placeholder:text-downbeat-text/40 focus-visible:ring-2 focus-visible:ring-downbeat-accent"
          required
          autofocus
        />
        <button
          type="submit"
          class="rounded-lg bg-downbeat-accent py-2 text-sm font-semibold text-downbeat-on-accent outline-none transition-colors motion-reduce:transition-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-downbeat-accent/50"
        >
          Enregistrer
        </button>
      </form>
    </Modal>
  </div>
</template>
