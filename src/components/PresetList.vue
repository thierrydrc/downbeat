<script setup>
import { ref } from 'vue'
import { mdiDotsVertical, mdiDownload, mdiDragVertical, mdiPlus, mdiTrashCanOutline, mdiUpload } from '@mdi/js'
import { usePresets } from '../composables/usePresets.js'
import MdiIcon from './MdiIcon.vue'
import Modal from './Modal.vue'

const props = defineProps({
  selectedPresetId: { type: String, default: null },
})

const emit = defineEmits(['load-preset', 'remove-preset'])

const { presets, addPreset, removePreset, exportPresets, importPresets } = usePresets()

const isAddModalOpen = ref(false)
const name = ref('')
const tempo = ref(120)
const beatsPerMeasure = ref(4)
const fileInput = ref(null)
const importError = ref('')

function closeAddModal() {
  isAddModalOpen.value = false
  name.value = ''
  tempo.value = 120
  beatsPerMeasure.value = 4
}

function handleAdd() {
  if (!name.value.trim()) return
  addPreset({ name: name.value, tempo: tempo.value, beatsPerMeasure: beatsPerMeasure.value })
  closeAddModal()
}

function handleLoad(preset) {
  emit('load-preset', preset.id === props.selectedPresetId ? null : preset)
}

function handleRemove(preset) {
  if (!window.confirm(`Supprimer "${preset.name}" de la liste ?`)) return
  removePreset(preset.id)
  emit('remove-preset', preset.id)
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleFileChange(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  importError.value = ''
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    const replace = window.confirm(
      'Remplacer la liste actuelle par le fichier importé ?\nOK = remplacer\nAnnuler = fusionner avec la liste existante',
    )
    importPresets(data, { replace })
  } catch {
    importError.value = 'Fichier JSON invalide.'
  }
}

const isExportModalOpen = ref(false)

function handleExportClick() {
  exportPresets()
  isExportModalOpen.value = false
}

function handleImportClick() {
  isExportModalOpen.value = false
  triggerImport()
}

// Réordonnancement au doigt/souris via Pointer Events (l'API HTML5
// dragstart/dragover ne fonctionne pas sur écran tactile).
const draggedId = ref(null)

function startDrag(preset, event) {
  draggedId.value = preset.id
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function handlePointerMove(event) {
  if (!draggedId.value) return
  const target = document.elementFromPoint(event.clientX, event.clientY)
  const li = target?.closest('[data-preset-id]')
  if (!li) return
  const overId = li.dataset.presetId
  if (overId === draggedId.value) return

  const list = presets.value
  const fromIndex = list.findIndex((p) => p.id === draggedId.value)
  const toIndex = list.findIndex((p) => p.id === overId)
  if (fromIndex === -1 || toIndex === -1) return

  const updated = [...list]
  const [moved] = updated.splice(fromIndex, 1)
  updated.splice(toIndex, 0, moved)
  presets.value = updated
}

function endDrag() {
  draggedId.value = null
}
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <h2 class="hidden text-lg font-semibold text-downbeat-text md:block">Presets</h2>

    <div class="flex gap-2">
      <button
        type="button"
        class="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-downbeat-accent px-3 text-sm font-semibold text-downbeat-bg outline-none transition-colors motion-reduce:transition-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-downbeat-accent/50"
        @click="isAddModalOpen = true"
      >
        <MdiIcon :path="mdiPlus" class="h-4 w-4" />
        Ajouter un preset
      </button>

      <button
        type="button"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-downbeat-panel-2 text-downbeat-text/80 outline-none transition-colors motion-reduce:transition-none hover:bg-downbeat-panel-2 hover:text-downbeat-text focus-visible:ring-2 focus-visible:ring-downbeat-accent"
        aria-label="Options d'export et d'import"
        @click="isExportModalOpen = true"
      >
        <MdiIcon :path="mdiDotsVertical" class="h-5 w-5" />
      </button>
      <input
        ref="fileInput"
        type="file"
        accept="application/json"
        class="hidden"
        @change="handleFileChange"
      />
    </div>
    <p v-if="importError" class="text-sm text-downbeat-accent">{{ importError }}</p>

    <ul v-if="presets.length" class="flex flex-col gap-2">
      <li
        v-for="preset in presets"
        :key="preset.id"
        :data-preset-id="preset.id"
        class="flex items-center gap-2 rounded-lg bg-downbeat-panel-2 px-2 py-2 transition-colors motion-reduce:transition-none"
        :class="[
          preset.id === selectedPresetId ? 'ring-2 ring-downbeat-accent' : '',
          preset.id === draggedId ? 'opacity-60' : '',
        ]"
      >
        <span
          class="flex h-10 w-10 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-downbeat-text/40 outline-none focus-visible:ring-2 focus-visible:ring-downbeat-accent active:cursor-grabbing"
          role="button"
          tabindex="0"
          aria-label="Réordonner le preset"
          @pointerdown="startDrag(preset, $event)"
          @pointermove="handlePointerMove"
          @pointerup="endDrag"
          @pointercancel="endDrag"
        >
          <MdiIcon :path="mdiDragVertical" class="h-5 w-5" />
        </span>

        <button
          type="button"
          class="min-w-0 flex-1 truncate rounded-lg px-1 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-downbeat-accent"
          @click="handleLoad(preset)"
        >
          <span
            class="block truncate"
            :class="preset.id === selectedPresetId ? 'font-semibold text-downbeat-accent' : 'text-downbeat-text'"
          >
            {{ preset.name }}
          </span>
          <span class="font-mono text-xs text-downbeat-text/60">
            {{ preset.tempo }} BPM · {{ preset.beatsPerMeasure }}/4
          </span>
        </button>

        <button
          type="button"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-downbeat-text/60 outline-none transition-colors motion-reduce:transition-none hover:text-downbeat-accent focus-visible:ring-2 focus-visible:ring-downbeat-accent"
          aria-label="Supprimer le preset"
          @click="handleRemove(preset)"
        >
          <MdiIcon :path="mdiTrashCanOutline" class="h-4 w-4" />
        </button>
      </li>
    </ul>
    <p v-else class="text-sm text-downbeat-text/50">Aucun preset enregistré.</p>

    <Modal :open="isAddModalOpen" title="Ajouter un preset" @close="closeAddModal">
      <form class="flex flex-col gap-3" @submit.prevent="handleAdd">
        <input
          v-model="name"
          type="text"
          placeholder="Nom du preset"
          class="rounded-lg bg-downbeat-panel-2 px-3 py-2 text-downbeat-text outline-none placeholder:text-downbeat-text/40 focus-visible:ring-2 focus-visible:ring-downbeat-accent"
          required
          autofocus
        />
        <div class="flex gap-2">
          <input
            v-model.number="tempo"
            type="number"
            min="30"
            max="240"
            placeholder="Tempo"
            class="w-1/2 rounded-lg bg-downbeat-panel-2 px-3 py-2 font-mono text-downbeat-text outline-none focus-visible:ring-2 focus-visible:ring-downbeat-accent"
            required
          />
          <select
            v-model.number="beatsPerMeasure"
            class="w-1/2 rounded-lg bg-downbeat-panel-2 px-3 py-2 text-downbeat-text outline-none focus-visible:ring-2 focus-visible:ring-downbeat-accent"
          >
            <option :value="4">4/4</option>
            <option :value="3">3/4</option>
          </select>
        </div>
        <button
          type="submit"
          class="rounded-lg bg-downbeat-accent py-2 text-sm font-semibold text-downbeat-bg outline-none transition-colors motion-reduce:transition-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-downbeat-accent/50"
        >
          Ajouter
        </button>
      </form>
    </Modal>

    <Modal :open="isExportModalOpen" title="Exporter / Importer" @close="isExportModalOpen = false">
      <div class="flex flex-col gap-2">
        <button
          type="button"
          class="flex h-11 items-center justify-center gap-2 rounded-lg border border-downbeat-panel-2 px-3 text-sm font-medium text-downbeat-text outline-none transition-colors motion-reduce:transition-none hover:bg-downbeat-panel-2 focus-visible:ring-2 focus-visible:ring-downbeat-accent disabled:opacity-40"
          :disabled="!presets.length"
          @click="handleExportClick"
        >
          <MdiIcon :path="mdiDownload" class="h-4 w-4" />
          Exporter la liste en JSON
        </button>
        <button
          type="button"
          class="flex h-11 items-center justify-center gap-2 rounded-lg border border-downbeat-panel-2 px-3 text-sm font-medium text-downbeat-text outline-none transition-colors motion-reduce:transition-none hover:bg-downbeat-panel-2 focus-visible:ring-2 focus-visible:ring-downbeat-accent"
          @click="handleImportClick"
        >
          <MdiIcon :path="mdiUpload" class="h-4 w-4" />
          Importer une liste JSON
        </button>
      </div>
    </Modal>
  </div>
</template>
