import { ref, watch } from 'vue'

// Clé conservée telle quelle (héritage de l'ancien nom "songs") pour ne pas
// perdre les presets déjà enregistrés par les utilisateurs existants.
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

// État au niveau du module (et non à l'intérieur de usePresets()) : plusieurs
// composants (App.vue, PresetList.vue) appellent usePresets() et doivent
// partager la même liste réactive, pas des copies indépendantes.
const presets = ref(loadFromStorage())

// Persistance = donnée, pas timing : un watcher Vue classique convient ici.
watch(
  presets,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true },
)

function addPreset({ name, tempo, beatsPerMeasure }) {
  const entry = normalizeEntry({ name, tempo, beatsPerMeasure })
  if (!entry) return null
  presets.value.push(entry)
  return entry
}

function updatePreset(id, { tempo, beatsPerMeasure }) {
  const preset = presets.value.find((p) => p.id === id)
  if (!preset) return
  if (Number.isFinite(tempo)) preset.tempo = tempo
  if (Number.isFinite(beatsPerMeasure)) preset.beatsPerMeasure = beatsPerMeasure
}

function removePreset(id) {
  presets.value = presets.value.filter((preset) => preset.id !== id)
}

function exportPresets() {
  const blob = new Blob([JSON.stringify(presets.value, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'downbeat-presets.json'
  link.click()
  URL.revokeObjectURL(url)
}

function importPresets(data, { replace }) {
  if (!Array.isArray(data)) {
    throw new Error('Le fichier JSON doit contenir une liste de presets.')
  }
  const imported = data.map(normalizeEntry).filter(Boolean)
  presets.value = replace ? imported : [...presets.value, ...imported]
  return imported.length
}

export function usePresets() {
  return {
    presets,
    addPreset,
    updatePreset,
    removePreset,
    exportPresets,
    importPresets,
  }
}
