import { ref, watch } from 'vue'

const STORAGE_KEY = 'downbeat.songs.v1'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeEntry(entry) {
  if (!entry || typeof entry.name !== 'string') return null
  const name = entry.name.trim()
  const tempo = Number(entry.tempo)
  const beatsPerMeasure = Number(entry.beatsPerMeasure)
  if (!name || !Number.isFinite(tempo) || !Number.isFinite(beatsPerMeasure)) return null
  return { id: makeId(), name, tempo, beatsPerMeasure }
}

export function useSongs() {
  const songs = ref(loadFromStorage())

  // Persistance = donnée, pas timing : un watcher Vue classique convient ici.
  watch(
    songs,
    (value) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    },
    { deep: true },
  )

  function addSong({ name, tempo, beatsPerMeasure }) {
    const entry = normalizeEntry({ name, tempo, beatsPerMeasure })
    if (!entry) return
    songs.value.push(entry)
  }

  function removeSong(id) {
    songs.value = songs.value.filter((song) => song.id !== id)
  }

  function exportSongs() {
    const blob = new Blob([JSON.stringify(songs.value, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'downbeat-songs.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  function importSongs(data, { replace }) {
    if (!Array.isArray(data)) {
      throw new Error('Le fichier JSON doit contenir une liste de chansons.')
    }
    const imported = data.map(normalizeEntry).filter(Boolean)
    songs.value = replace ? imported : [...songs.value, ...imported]
    return imported.length
  }

  return {
    songs,
    addSong,
    removeSong,
    exportSongs,
    importSongs,
  }
}
