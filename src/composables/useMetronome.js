import { ref, onUnmounted } from 'vue'

// Scheduler "lookahead" (technique du double clock, cf. "A Tale of Two Clocks" -
// Chris Wilson). Le timing réel du clic est piloté par audioContext.currentTime,
// jamais par le cycle de rendu de Vue : une boucle setTimeout courte planifie les
// sons en avance sur l'horloge audio pour absorber la latence/dérive de setTimeout.
const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_TIME = 0.1
const CLICK_DURATION = 0.05
// Un simple pic instantané qui redescend aussitôt ne contient presque aucune
// énergie (quelques ms au-dessus de 0 dBFS) : même avec un gain > 1 et un
// limiteur derrière, il n'y a quasiment rien à "pousser" vers le plafond, donc
// le volume perçu ne bouge presque pas entre 100% et 400%. Ce plateau force
// le clic à rester à pleine amplitude un court instant avant de redescendre,
// ce qui donne au limiteur une vraie plage à comprimer/pousser vers le
// plafond quand le gain augmente - c'est ça, plus que le gain seul, qui rend
// le clic perceptiblement plus fort à volume élevé.
const CLICK_SUSTAIN = 0.008

export const MIN_TEMPO = 30
export const MAX_TEMPO = 240

// Le volume "normal" (slider) reste dans la plage naturelle 0-1 (0-100%,
// gain unitaire max = 0 dBFS). Le boost scène est un choix explicite et
// séparé (case à cocher), pas un point sur un slider continu - on autorise
// alors un gain > 1 et on s'appuie sur un limiteur en aval pour absorber le
// dépassement de 0 dBFS que ça provoquerait sinon, sans distorsion audible.
// À noter : ce boost ne peut agir que sur le signal numérique envoyé au
// système - il ne peut pas dépasser le plafond physique de la sortie casque/
// ligne de l'appareil, ni contourner un éventuel limiteur matériel/OS.
const BOOST_FACTOR = 4

const TAP_MAX_INTERVALS = 8
const TAP_TIMEOUT_MS = 2000

export function useMetronome() {
  const isPlaying = ref(false)
  const tempo = ref(120)
  const beatsPerMeasure = ref(4)
  const volume = ref(0.7)
  const boostEnabled = ref(false)
  const currentBeat = ref(-1)

  let audioCtx = null
  let masterGain = null
  let limiter = null
  let wakeLockSentinel = null

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
      masterGain.gain.value = volume.value * (boostEnabled.value ? BOOST_FACTOR : 1)

      // Limiteur agressif mais propre : absorbe le dépassement de 0 dBFS
      // provoqué par un gain > 1 (boost au-delà de l'unité) sans laisser
      // passer de distorsion audible qui dénaturerait le clic.
      limiter = audioCtx.createDynamicsCompressor()
      limiter.threshold.value = -3
      limiter.knee.value = 0
      limiter.ratio.value = 16
      limiter.attack.value = 0.003
      limiter.release.value = 0.08

      masterGain.connect(limiter)
      limiter.connect(audioCtx.destination)
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
  }

  function scheduleClick(beatNumber, time) {
    const osc = audioCtx.createOscillator()
    const envelope = audioCtx.createGain()

    const isDownbeat = beatNumber === 0
    // Carrée plutôt que sinusoïdale : à amplitude de crête égale, une onde
    // carrée transporte nettement plus d'énergie (RMS proche du pic, contre
    // ~70% pour une sinusoïdale), donc un son perçu comme plus fort sans
    // dépasser 0 dBFS ni ajouter de distorsion (c'est une forme d'onde
    // propre, pas un signal saturé).
    osc.type = 'square'
    osc.frequency.value = isDownbeat ? 1500 : 1000

    envelope.gain.setValueAtTime(0, time)
    envelope.gain.linearRampToValueAtTime(1, time + 0.001)
    envelope.gain.setValueAtTime(1, time + 0.001 + CLICK_SUSTAIN)
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

  // Empêche l'écran de se verrouiller tant que le métronome joue - un usage
  // scène typique n'implique pas de retoucher l'écran pendant plusieurs
  // minutes, et un verrouillage peut suspendre l'AudioContext (surtout sur
  // iOS Safari) et arrêter le clic silencieusement en plein morceau.
  async function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockSentinel = await navigator.wakeLock.request('screen')
    } catch {
      // Refusé (économie d'énergie, onglet caché...) : non bloquant, le
      // métronome continue de fonctionner sans le verrou d'écran.
      wakeLockSentinel = null
    }
  }

  async function releaseWakeLock() {
    try {
      await wakeLockSentinel?.release()
    } catch {
      // rien à faire
    }
    wakeLockSentinel = null
  }

  // Le wake lock est automatiquement relâché par le navigateur quand l'onglet
  // passe en arrière-plan, et l'AudioContext peut être suspendu (appel,
  // notification, mise en veille...). On relance les deux au retour au
  // premier plan pour que le métronome ne reste pas silencieux sans que
  // l'utilisateur s'en rende compte.
  function handleVisibilityChange() {
    if (document.visibilityState !== 'visible' || !isPlaying.value) return
    if (audioCtx?.state === 'suspended') {
      audioCtx.resume()
    }
    acquireWakeLock()
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  function start() {
    if (isPlaying.value) return
    ensureAudioContext()
    currentBeatNumber = 0
    nextNoteTime = audioCtx.currentTime + 0.05
    scheduledBeats.length = 0
    isPlaying.value = true
    scheduler()
    rafId = requestAnimationFrame(visualSync)
    acquireWakeLock()
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
    releaseWakeLock()
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

  function applyGain() {
    if (!masterGain) return
    masterGain.gain.value = volume.value * (boostEnabled.value ? BOOST_FACTOR : 1)
  }

  function setVolume(value) {
    volume.value = Math.min(1, Math.max(0, value))
    applyGain()
  }

  function setBoost(enabled) {
    boostEnabled.value = !!enabled
    applyGain()
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
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return {
    isPlaying,
    tempo,
    beatsPerMeasure,
    volume,
    boostEnabled,
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
    setBoost,
    tapTempo,
    loadPreset,
  }
}
