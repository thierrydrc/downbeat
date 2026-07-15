<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { mdiClose, mdiPlaylistMusic } from '@mdi/js'
import { useMetronome } from './composables/useMetronome.js'
import MetronomeDisplay from './components/MetronomeDisplay.vue'
import MetronomeControls from './components/MetronomeControls.vue'
import VolumeControl from './components/VolumeControl.vue'
import SongList from './components/SongList.vue'
import MdiIcon from './components/MdiIcon.vue'

const {
  isPlaying,
  tempo,
  beatsPerMeasure,
  volume,
  currentBeat,
  minTempo,
  maxTempo,
  toggle,
  setTempo,
  incrementTempo,
  setBeatsPerMeasure,
  setVolume,
  tapTempo,
  loadPreset,
} = useMetronome()

const loadedSong = ref(null)
const isSidebarOpen = ref(false)

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

function handleLoadSong(song) {
  if (!song) {
    loadedSong.value = null
    return
  }
  loadedSong.value = { id: song.id, name: song.name }
  loadPreset({ tempo: song.tempo, beatsPerMeasure: song.beatsPerMeasure })
  closeSidebar()
}

function handleRemoveSong(id) {
  if (loadedSong.value?.id === id) {
    loadedSong.value = null
  }
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
          <button
            type="button"
            class="shrink-0 rounded-lg border border-downbeat-panel-2 bg-downbeat-panel p-2.5 text-downbeat-text outline-none transition-colors motion-reduce:transition-none hover:bg-downbeat-panel-2 focus-visible:ring-2 focus-visible:ring-downbeat-accent md:hidden"
            aria-label="Ouvrir la liste des chansons"
            aria-controls="song-sidebar"
            :aria-expanded="isSidebarOpen"
            @click="isSidebarOpen = true"
          >
            <MdiIcon :path="mdiPlaylistMusic" class="h-6 w-6" />
          </button>
        </header>

        <main class="flex flex-1 flex-col items-center gap-4">
          <MetronomeDisplay
            :current-beat="currentBeat"
            :is-playing="isPlaying"
            :beats-per-measure="beatsPerMeasure"
            @toggle="toggle"
          />

          <div class="flex min-h-10 w-full max-w-md flex-col">
            <template v-if="loadedSong">
              <div class="flex flex-col gap-0.5 rounded-xl bg-downbeat-panel px-3 py-2 shadow-sm">
                <span class="text-[11px] text-downbeat-text/50">Chanson chargée</span>
                <div class="flex items-start justify-between gap-2">
                  <span class="break-words text-sm font-semibold text-downbeat-accent">{{ loadedSong.name }}</span>
                  <button
                    type="button"
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-downbeat-panel-2 text-downbeat-text/60 outline-none transition-colors motion-reduce:transition-none hover:bg-downbeat-panel-2/70 hover:text-downbeat-accent focus-visible:ring-2 focus-visible:ring-downbeat-accent"
                    aria-label="Désélectionner la chanson"
                    @click="loadedSong = null"
                  >
                    <MdiIcon :path="mdiClose" class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </template>
          </div>

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

          <VolumeControl :volume="volume" @set-volume="setVolume" />
        </main>
      </div>
    </div>

    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 z-30 bg-black/60 md:hidden"
      @click="closeSidebar"
    />

    <aside
      id="song-sidebar"
      class="fixed inset-y-0 right-0 z-40 w-80 max-w-[85vw] transform overflow-y-auto bg-downbeat-panel transition-transform duration-200 ease-out motion-reduce:transition-none md:translate-x-0"
      :class="isSidebarOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <div class="flex items-center justify-between p-4 md:hidden">
        <span class="text-lg font-semibold">Chansons</span>
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full text-downbeat-text/70 outline-none transition-colors motion-reduce:transition-none hover:text-downbeat-accent focus-visible:ring-2 focus-visible:ring-downbeat-accent"
          aria-label="Fermer la liste des chansons"
          @click="closeSidebar"
        >
          <MdiIcon :path="mdiClose" class="h-5 w-5" />
        </button>
      </div>

      <div class="h-full px-4 pb-6 md:p-6">
        <SongList
          :selected-song-id="loadedSong?.id ?? null"
          @load-song="handleLoadSong"
          @remove-song="handleRemoveSong"
        />
      </div>
    </aside>
  </div>
</template>
