import { ref, onUnmounted } from 'vue'

// Scheduler "lookahead" (technique du double clock, cf. "A Tale of Two Clocks" -
// Chris Wilson). Le timing réel du clic est piloté par audioContext.currentTime,
// jamais par le cycle de rendu de Vue : une boucle setTimeout courte planifie les
// sons en avance sur l'horloge audio pour absorber la latence/dérive de setTimeout.
const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_TIME = 0.1
const CLICK_DURATION = 0.05

const MIN_TEMPO = 30
const MAX_TEMPO = 240

const TAP_MAX_INTERVALS = 8
const TAP_TIMEOUT_MS = 2000

export function useMetronome() {
  const isPlaying = ref(false)
  const tempo = ref(120)
  const beatsPerMeasure = ref(4)
  const volume = ref(0.7)
  const currentBeat = ref(-1)

  let audioCtx = null
  let masterGain = null

  let nextNoteTime = 0
  let currentBeatNumber = 0
  let schedulerTimerId = null
  let rafId = null

  // Temps réel restant hors réactivité Vue : beats déjà planifiés dans
  // audioContext mais pas encore "arrivés" côté horloge, pour synchroniser
  // l'affichage via requestAnimationFrame plutôt que de dériver du scheduler.
  const scheduledBeats = []

  let tapTimes = []

  function ensureAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      audioCtx = new AudioContextClass()
      masterGain = audioCtx.createGain()
      masterGain.gain.value = volume.value
      masterGain.connect(audioCtx.destination)
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
  }

  function scheduleClick(beatNumber, time) {
    const osc = audioCtx.createOscillator()
    const envelope = audioCtx.createGain()

    const isDownbeat = beatNumber === 0
    osc.type = 'sine'
    osc.frequency.value = isDownbeat ? 1500 : 1000

    envelope.gain.setValueAtTime(0, time)
    envelope.gain.linearRampToValueAtTime(1, time + 0.001)
    envelope.gain.exponentialRampToValueAtTime(0.001, time + CLICK_DURATION)

    osc.connect(envelope)
    envelope.connect(masterGain)

    osc.start(time)
    osc.stop(time + CLICK_DURATION + 0.01)

    scheduledBeats.push({ beatNumber, time })
  }

  function advanceNote() {
    const secondsPerBeat = 60.0 / tempo.value
    nextNoteTime += secondsPerBeat
    currentBeatNumber = (currentBeatNumber + 1) % beatsPerMeasure.value
  }

  function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + SCHEDULE_AHEAD_TIME) {
      scheduleClick(currentBeatNumber, nextNoteTime)
      advanceNote()
    }
    schedulerTimerId = setTimeout(scheduler, LOOKAHEAD_MS)
  }

  // Boucle d'affichage : compare l'horloge audio réelle au temps des beats déjà
  // planifiés pour mettre à jour l'état réactif exposé aux composants. C'est la
  // seule chose que Vue a le droit de piloter : l'affichage, pas le timing.
  function visualSync() {
    if (audioCtx) {
      const now = audioCtx.currentTime
      while (scheduledBeats.length && scheduledBeats[0].time <= now) {
        const beat = scheduledBeats.shift()
        currentBeat.value = beat.beatNumber
      }
    }
    rafId = requestAnimationFrame(visualSync)
  }

  function start() {
    if (isPlaying.value) return
    ensureAudioContext()
    currentBeatNumber = 0
    nextNoteTime = audioCtx.currentTime + 0.05
    scheduledBeats.length = 0
    isPlaying.value = true
    scheduler()
    rafId = requestAnimationFrame(visualSync)
  }

  function stop() {
    isPlaying.value = false
    if (schedulerTimerId !== null) {
      clearTimeout(schedulerTimerId)
      schedulerTimerId = null
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    scheduledBeats.length = 0
    currentBeat.value = -1
  }

  function toggle() {
    if (isPlaying.value) {
      stop()
    } else {
      start()
    }
  }

  function setTempo(bpm) {
    const rounded = Math.round(bpm)
    tempo.value = Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, rounded))
  }

  function incrementTempo(delta) {
    setTempo(tempo.value + delta)
  }

  function setBeatsPerMeasure(count) {
    beatsPerMeasure.value = count
    if (!isPlaying.value) {
      currentBeat.value = -1
    }
  }

  function setVolume(value) {
    volume.value = Math.min(1, Math.max(0, value))
    if (masterGain) {
      masterGain.gain.value = volume.value
    }
  }

  function tapTempo() {
    const now = performance.now()
    if (tapTimes.length && now - tapTimes[tapTimes.length - 1] > TAP_TIMEOUT_MS) {
      tapTimes = []
    }
    tapTimes.push(now)
    if (tapTimes.length > TAP_MAX_INTERVALS + 1) {
      tapTimes.shift()
    }
    if (tapTimes.length >= 2) {
      const intervals = []
      for (let i = 1; i < tapTimes.length; i++) {
        intervals.push(tapTimes[i] - tapTimes[i - 1])
      }
      const avgIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length
      setTempo(60000 / avgIntervalMs)
    }
  }

  function loadPreset({ tempo: presetTempo, beatsPerMeasure: presetBeats }) {
    if (presetTempo !== undefined) setTempo(presetTempo)
    if (presetBeats !== undefined) setBeatsPerMeasure(presetBeats)
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isPlaying,
    tempo,
    beatsPerMeasure,
    volume,
    currentBeat,
    minTempo: MIN_TEMPO,
    maxTempo: MAX_TEMPO,
    start,
    stop,
    toggle,
    setTempo,
    incrementTempo,
    setBeatsPerMeasure,
    setVolume,
    tapTempo,
    loadPreset,
  }
}
