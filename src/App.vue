<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  mdiChevronLeft,
  mdiChevronRight,
  mdiClose,
  mdiGithub,
  mdiPlaylistMusic,
  mdiWeatherNight,
  mdiWeatherSunny,
} from '@mdi/js'
import { useMetronome } from './composables/useMetronome.js'
import { usePresets } from './composables/usePresets.js'
import { useTheme } from './composables/useTheme.js'
import { useServiceWorkerUpdate } from './composables/useServiceWorkerUpdate.js'
import { version, repository } from '../package.json'
import MetronomeDisplay from './components/MetronomeDisplay.vue'
import MetronomeControls from './components/MetronomeControls.vue'
import VolumeControl from './components/VolumeControl.vue'
import PresetList from './components/PresetList.vue'
import Modal from './components/Modal.vue'
import MdiIcon from './components/MdiIcon.vue'

const repositoryUrl = repository.url.replace(/\.git$/, '')

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

const { presets, addPreset, updatePreset } = usePresets()
const { theme, toggleTheme } = useTheme()
const { needRefresh, reload: reloadForUpdate, dismiss: dismissUpdate } = useServiceWorkerUpdate()

const loadedPreset = ref(null)
const isEditingPreset = ref(false)
const isSidebarOpen = ref(false)
const isSavePresetModalOpen = ref(false)
const newPresetName = ref('')

function closeSidebar() {
  isSidebarOpen.value = false
}

function isEditableTarget(target) {
  const tag = target?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable
}

function handleKeydown(event) {
  if (event.key === 'Escape' && isSidebarOpen.value) {
    closeSidebar()
    return
  }
  // Espace/flèches ne doivent pas agir pendant la saisie d'un nom de preset,
  // d'un tempo dans la modale d'ajout, etc.
  if (isEditableTarget(event.target)) return

  if (event.code === 'Space') {
    event.preventDefault()
    toggle()
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
    event.preventDefault()
    incrementTempo(1)
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
    event.preventDefault()
    incrementTempo(-1)
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

const currentPresetIndex = computed(() => {
  if (!loadedPreset.value) return -1
  return presets.value.findIndex((preset) => preset.id === loadedPreset.value.id)
})
const canGoPrevPreset = computed(() => currentPresetIndex.value > 0)
const canGoNextPreset = computed(
  () => currentPresetIndex.value !== -1 && currentPresetIndex.value < presets.value.length - 1,
)

function goToPreset(offset) {
  const target = presets.value[currentPresetIndex.value + offset]
  if (target) handleLoadPreset(target)
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
            <h1 class="text-base font-bold tracking-tight">Down<span class="text-downbeat-accent">beat</span></h1>
          </div>
          <div class="flex shrink-0 items-center gap-2 md:hidden">
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
              class="rounded-lg border border-downbeat-panel-2 bg-downbeat-panel p-2.5 text-downbeat-text outline-none transition-colors motion-reduce:transition-none hover:bg-downbeat-panel-2 focus-visible:ring-2 focus-visible:ring-downbeat-accent"
              aria-label="Ouvrir la liste des presets"
              aria-controls="preset-sidebar"
              :aria-expanded="isSidebarOpen"
              @click="isSidebarOpen = true"
            >
              <MdiIcon :path="mdiPlaylistMusic" class="h-6 w-6" />
            </button>
          </div>
        </header>

        <!-- Desktop : la sidebar est toujours visible (pas de bouton pour
        l'ouvrir), donc ce bouton vit hors du header centré, fixé contre son
        bord gauche avec une petite marge. -->
        <button
          type="button"
          class="hidden rounded-lg border border-downbeat-panel-2 bg-downbeat-panel p-2.5 text-downbeat-text outline-none transition-colors motion-reduce:transition-none hover:bg-downbeat-panel-2 focus-visible:ring-2 focus-visible:ring-downbeat-accent md:fixed md:right-84 md:top-5 md:z-20 md:flex"
          :aria-label="theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'"
          @click="toggleTheme"
        >
          <MdiIcon :path="theme === 'dark' ? mdiWeatherSunny : mdiWeatherNight" class="h-6 w-6" />
        </button>

        <main class="flex flex-1 flex-col items-center gap-4">
          <MetronomeDisplay
            :current-beat="currentBeat"
            :is-playing="isPlaying"
            :beats-per-measure="beatsPerMeasure"
            @toggle="toggle"
          />

          <div v-if="loadedPreset" class="flex w-full max-w-md flex-col">
            <template v-if="loadedPreset">
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-downbeat-text/60 outline-none transition-colors motion-reduce:transition-none hover:text-downbeat-accent focus-visible:ring-2 focus-visible:ring-downbeat-accent disabled:pointer-events-none disabled:opacity-30"
                  aria-label="Preset précédent"
                  :disabled="!canGoPrevPreset"
                  @click="goToPreset(-1)"
                >
                  <MdiIcon :path="mdiChevronLeft" class="h-5 w-5" />
                </button>

                <div class="flex min-w-0 flex-1 flex-col gap-0.5 rounded-xl bg-downbeat-panel px-3 py-2 shadow-sm">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[11px] text-downbeat-text/50">
                      Preset chargé · {{ currentPresetIndex + 1 }} sur {{ presets.length }}
                    </span>
                    <button
                      type="button"
                      class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-downbeat-text/60 outline-none transition-colors motion-reduce:transition-none hover:bg-downbeat-panel-2 hover:text-downbeat-accent focus-visible:ring-2 focus-visible:ring-downbeat-accent"
                      aria-label="Désélectionner le preset"
                      @click="deselectPreset"
                    >
                      <MdiIcon :path="mdiClose" class="h-4 w-4" />
                    </button>
                  </div>
                  <span class="break-words text-sm font-semibold text-downbeat-accent">{{ loadedPreset.name }}</span>
                </div>

                <button
                  type="button"
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-downbeat-text/60 outline-none transition-colors motion-reduce:transition-none hover:text-downbeat-accent focus-visible:ring-2 focus-visible:ring-downbeat-accent disabled:pointer-events-none disabled:opacity-30"
                  aria-label="Preset suivant"
                  :disabled="!canGoNextPreset"
                  @click="goToPreset(1)"
                >
                  <MdiIcon :path="mdiChevronRight" class="h-5 w-5" />
                </button>
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
            >
              <button
                v-if="loadedPreset && isEditingPreset"
                type="button"
                class="flex h-11 w-full items-center justify-center rounded-lg bg-downbeat-accent px-3 text-sm font-semibold text-downbeat-on-accent outline-none transition-colors motion-reduce:transition-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-downbeat-accent/50"
                @click="handleSaveEdit"
              >
                Enregistrer
              </button>
              <button
                v-if="!loadedPreset"
                type="button"
                class="flex h-11 w-full items-center justify-center rounded-lg bg-downbeat-accent px-3 text-sm font-semibold text-downbeat-on-accent outline-none transition-colors motion-reduce:transition-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-downbeat-accent/50"
                @click="openSavePresetModal"
              >
                Enregistrer le preset
              </button>
            </MetronomeControls>
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

          <VolumeControl
            :volume="volume"
            :boost-enabled="boostEnabled"
            @set-volume="setVolume"
            @set-boost="setBoost"
          />
        </main>

        <footer class="flex items-center justify-center gap-1.5 pb-1 text-[11px] text-downbeat-text/30">
          <span>v{{ version }}</span>
          <a
            :href="repositoryUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-downbeat-text/30 outline-none transition-colors motion-reduce:transition-none hover:text-downbeat-text/60 focus-visible:ring-2 focus-visible:ring-downbeat-accent"
            aria-label="Voir le projet sur GitHub"
          >
            <MdiIcon :path="mdiGithub" class="h-3.5 w-3.5" />
          </a>
        </footer>
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
        <span class="text-lg font-semibold">Presets ({{ presets.length }})</span>
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

    <div
      v-if="needRefresh"
      class="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl bg-downbeat-panel px-4 py-3 shadow-xl ring-1 ring-downbeat-panel-2"
      role="status"
    >
      <span class="text-sm text-downbeat-text">Nouvelle version disponible</span>
      <div class="flex shrink-0 gap-1">
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm text-downbeat-text/60 outline-none transition-colors motion-reduce:transition-none hover:text-downbeat-text focus-visible:ring-2 focus-visible:ring-downbeat-accent"
          @click="dismissUpdate"
        >
          Plus tard
        </button>
        <button
          type="button"
          class="rounded-lg bg-downbeat-accent px-3 py-1.5 text-sm font-semibold text-downbeat-on-accent outline-none transition-colors motion-reduce:transition-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-downbeat-accent/50"
          @click="reloadForUpdate"
        >
          Recharger
        </button>
      </div>
    </div>
  </div>
</template>
