import { ref, watch, onUnmounted } from 'vue'

// Lookahead scheduler (double-clock technique, cf. "A Tale of Two Clocks" -
// Chris Wilson). Click timing is driven by audioContext.currentTime, never
// by Vue's render cycle: a short setTimeout loop schedules sound ahead of
// the audio clock to absorb setTimeout's latency/drift.
const LOOKAHEAD_MS = 25
const SCHEDULE_AHEAD_TIME = 0.1
const CLICK_DURATION = 0.05
// A bare instant peak has almost no energy above 0 dBFS for the limiter to
// compress, so perceived loudness barely moves between 100% and 400% gain.
// Holding full amplitude for a short plateau first gives the limiter an
// actual range to push toward the ceiling as gain increases.
const CLICK_SUSTAIN = 0.008

export const MIN_TEMPO = 30
export const MAX_TEMPO = 240

// Normal volume (slider) stays in the natural 0-1 range (0-100%, unity gain
// = 0 dBFS). Line input boost is a separate explicit toggle rather than a
// point further up the slider: it allows gain > 1, relying on a limiter
// downstream to absorb the resulting overshoot past 0 dBFS without audible
// distortion. Note this can't exceed the device's physical output ceiling
// or bypass any hardware/OS limiter.
const BOOST_FACTOR = 4

const TAP_MAX_INTERVALS = 8
const TAP_TIMEOUT_MS = 2000

// Silent looping track played alongside the click. A genuinely playing
// <audio> element makes the browser/OS treat the app as active media
// playback (lock-screen controls via Media Session, and on iOS Safari,
// bypasses the ringer/silent switch) - a bare AudioContext doesn't get that
// treatment. Generated in memory rather than a public/ file to stay
// compatible with the single-file bundle (viteSingleFile) and file:// use.
function createSilentLoopUrl() {
  const sampleRate = 8000
  const dataSize = 400 * 2 // 50ms of 16-bit mono, enough to loop seamlessly

  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)
  // Rest of the buffer stays zeroed by default: silence.

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

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
  let keepAliveAudio = null

  let nextNoteTime = 0
  let currentBeatNumber = 0
  let schedulerTimerId = null
  let rafId = null

  // Beats already scheduled in the AudioContext but not yet "arrived" on the
  // clock, so the display can sync via requestAnimationFrame instead of
  // deriving from the scheduler.
  const scheduledBeats = []

  let tapTimes = []

  function ensureAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      audioCtx = new AudioContextClass()
      masterGain = audioCtx.createGain()
      masterGain.gain.value = volume.value * (boostEnabled.value ? BOOST_FACTOR : 1)

      // Aggressive but clean limiter: absorbs the 0 dBFS overshoot caused by
      // gain > 1 (boost) without letting audible distortion through.
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

  function ensureKeepAliveAudio() {
    if (!keepAliveAudio) {
      keepAliveAudio = new Audio(createSilentLoopUrl())
      keepAliveAudio.loop = true
      keepAliveAudio.setAttribute('playsinline', '')
    }
    // Must stay synchronous within the user gesture (START click) for
    // autoplay policies to allow it.
    keepAliveAudio.play().catch(() => {})
  }

  function updateMediaSessionMetadata() {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'downbeat',
      artist: `${tempo.value} BPM`,
      artwork: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    })
  }

  // Play/pause controls the browser surfaces on the lock screen/notifications
  // - wired to start/stop so they work without unlocking the phone.
  function setupMediaSession() {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', start)
    navigator.mediaSession.setActionHandler('pause', stop)
    navigator.mediaSession.setActionHandler('stop', stop)
  }

  function scheduleClick(beatNumber, time) {
    const osc = audioCtx.createOscillator()
    const envelope = audioCtx.createGain()

    const isDownbeat = beatNumber === 0
    // Square rather than sine: at equal peak amplitude, a square wave
    // carries much more energy (RMS close to peak, vs ~70% for a sine),
    // so it's perceived louder without exceeding 0 dBFS or adding
    // distortion (it's a clean waveform, not a clipped one).
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

  // Display loop: compares the real audio clock to already-scheduled beat
  // times to update the reactive state exposed to components. This is the
  // only thing Vue is allowed to drive - the display, not the timing.
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

  // Keeps the screen from locking while the metronome runs - typical stage
  // use means the screen goes untouched for minutes, and locking can
  // suspend the AudioContext (especially on iOS Safari), silently killing
  // the click mid-song.
  async function acquireWakeLock() {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockSentinel = await navigator.wakeLock.request('screen')
    } catch {
      // Denied (power saving, hidden tab...): non-blocking, the metronome
      // keeps running without the screen lock.
      wakeLockSentinel = null
    }
  }

  async function releaseWakeLock() {
    try {
      await wakeLockSentinel?.release()
    } catch {
      // nothing to do
    }
    wakeLockSentinel = null
  }

  // The browser auto-releases the wake lock when the tab backgrounds, and
  // the AudioContext can get suspended (call, notification, sleep...).
  // Both are restarted on return to foreground so the metronome doesn't go
  // silent without the user noticing.
  function handleVisibilityChange() {
    if (document.visibilityState !== 'visible' || !isPlaying.value) return
    if (audioCtx?.state === 'suspended') {
      audioCtx.resume()
    }
    if (keepAliveAudio?.paused) {
      keepAliveAudio.play().catch(() => {})
    }
    acquireWakeLock()
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  setupMediaSession()

  function start() {
    if (isPlaying.value) return
    ensureAudioContext()
    ensureKeepAliveAudio()
    currentBeatNumber = 0
    nextNoteTime = audioCtx.currentTime + 0.05
    scheduledBeats.length = 0
    isPlaying.value = true
    scheduler()
    rafId = requestAnimationFrame(visualSync)
    acquireWakeLock()
    updateMediaSessionMetadata()
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
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
    keepAliveAudio?.pause()
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
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

  watch(tempo, () => {
    if (isPlaying.value) updateMediaSessionMetadata()
  })

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
    keepAliveAudio?.remove()
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
