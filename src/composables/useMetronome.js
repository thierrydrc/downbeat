import { ref, watch, onUnmounted } from 'vue'

// Loop-based engine: one full measure of clicks is pre-rendered into an
// AudioBuffer (OfflineAudioContext) and played as a natively looping
// AudioBufferSourceNode. Looping happens on the audio rendering thread,
// sample-accurate, with no main-thread timer involved - unlike a lookahead
// scheduler, it survives screen lock and background timer throttling on iOS
// (combined with the 'playback' audio session below, which is what allows
// Web Audio to keep running there at all).
const CLICK_DURATION = 0.05
// A bare instant peak carries almost no energy; holding full amplitude for a
// short plateau makes the click audibly denser at equal peak level.
const CLICK_SUSTAIN = 0.008

export const MIN_TEMPO = 30
export const MAX_TEMPO = 240

const TAP_MAX_INTERVALS = 8
const TAP_TIMEOUT_MS = 2000

// Minimum lead time before a scheduled loop swap; if the next beat boundary
// is closer than this, the swap targets the boundary after it.
const SWAP_MIN_LEAD = 0.05

// iOS/WebKit bars Web Audio from playing in the background or under a locked
// screen unless the page opts into the 'playback' audio session category -
// the only WebKit mechanism that keeps an AudioContext running there
// (reliable since iOS 17.5), and the prerequisite for it to surface Now
// Playing / lock-screen controls (Media Session). It also routes sound to
// the media channel, so the ringer/silent switch no longer mutes it. No-op
// on browsers without the API (they don't restrict background Web Audio the
// same way).
function configureAudioSession() {
  if (!('audioSession' in navigator)) return
  try {
    navigator.audioSession.type = 'playback'
    // WebKit silently ignores the setter when the Permissions-Policy
    // 'microphone' feature is blocked; reading back is the only signal.
    if (navigator.audioSession.type !== 'playback') {
      console.warn('downbeat: audio session "playback" refused - sound may stop when the screen locks')
    }
  } catch {
    // Same degraded behavior as browsers without the API.
  }
}

// Renders one full measure of clicks (accented downbeat) into a mono
// AudioBuffer at the live context's sample rate (no resampling). Same click
// recipe as always: square rather than sine - at equal peak amplitude a
// square wave carries much more energy (RMS close to peak, vs ~70% for a
// sine), so it's perceived louder without exceeding 0 dBFS - with a 1 ms
// attack, short sustain and exponential decay. At the fastest tempo
// (240 BPM) beats are 250 ms apart and a click lasts 60 ms, so the loop
// seam always falls on digital silence.
function renderMeasureBuffer(bpm, beats, sampleRate) {
  const secondsPerBeat = 60 / bpm
  const offline = new OfflineAudioContext(1, Math.round(secondsPerBeat * beats * sampleRate), sampleRate)

  for (let beat = 0; beat < beats; beat++) {
    const time = beat * secondsPerBeat
    const osc = offline.createOscillator()
    const envelope = offline.createGain()

    osc.type = 'square'
    osc.frequency.value = beat === 0 ? 1500 : 1000

    envelope.gain.setValueAtTime(0, time)
    envelope.gain.linearRampToValueAtTime(1, time + 0.001)
    envelope.gain.setValueAtTime(1, time + 0.001 + CLICK_SUSTAIN)
    envelope.gain.exponentialRampToValueAtTime(0.001, time + CLICK_DURATION)

    osc.connect(envelope)
    envelope.connect(offline.destination)

    osc.start(time)
    osc.stop(time + CLICK_DURATION + 0.01)
  }

  return offline.startRendering()
}

// Silent looping track played alongside the click, ONLY on browsers without
// the Audio Session API (Chrome, Android...): there, a genuinely playing
// <audio> element is what makes the OS treat the app as active media
// playback (lock-screen controls via Media Session). On iOS/WebKit the
// 'playback' audio session covers all of that for the AudioContext itself,
// and a parallel <audio> element would actually steal the lock-screen
// controls from it - so it's skipped (see ensureKeepAliveAudio). Generated
// in memory rather than a public/ file to stay compatible with the
// single-file bundle (viteSingleFile) and file:// use.
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
  const currentBeat = ref(-1)
  const wakeLockActive = ref(false)
  const wakeLockSupported = 'wakeLock' in navigator

  let audioCtx = null
  let masterGain = null
  let keepAliveAudio = null

  // Loop engine state. `loop` describes the measure currently heard;
  // `pendingLoop` a swap already scheduled in the AudioContext whose beat
  // boundary hasn't been reached yet. `startTime` is the audio-clock instant
  // at which phase 0 of the measure began (possibly in the past, for swaps
  // landing mid-measure).
  let loopSource = null
  let loop = null
  let pendingLoop = null
  let swapInProgress = false
  // Bumped by start/stop and each swap: any async work holding an older
  // generation aborts instead of touching the audio graph.
  let engineGeneration = 0
  // Every source that may still be sounding (current + the one retiring at
  // the next swap boundary), so stop() can silence them all instantly.
  const liveSources = new Set()

  let rafId = null

  let wakeLockSentinel = null
  let wakeLockRequestPending = false
  let lastWakeLockRetry = 0

  let tapTimes = []

  // WebKit reports the non-standard 'interrupted' state when iOS pauses the
  // context from outside the page (screen lock without a 'playback' audio
  // session, phone call...). Resuming is only worth attempting while
  // visible: hidden-page resumes are rejected, and WebKit fires another
  // statechange when the interruption actually ends.
  function handleAudioStateChange() {
    if (!isPlaying.value || !audioCtx) return
    if (document.visibilityState !== 'visible') return
    if (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted') {
      audioCtx.resume().catch(() => {})
    }
  }

  function ensureAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      audioCtx = new AudioContextClass()
      audioCtx.onstatechange = handleAudioStateChange
      masterGain = audioCtx.createGain()
      masterGain.gain.value = volume.value

      masterGain.connect(audioCtx.destination)
    }
    // 'suspended' but also WebKit's 'interrupted'; a rejection (e.g. hidden
    // page) is non-fatal - playback catches up when the context resumes.
    if (audioCtx.state !== 'running') {
      return audioCtx.resume().catch(() => {})
    }
    return Promise.resolve()
  }

  function ensureKeepAliveAudio() {
    // Skipped when the Audio Session API exists (iOS/WebKit): the 'playback'
    // session already keeps the AudioContext alive and Now Playing-eligible,
    // and a parallel <audio> element would steal the lock-screen controls
    // from it.
    if ('audioSession' in navigator) return
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

  function trackSource(source) {
    liveSources.add(source)
    source.onended = () => {
      source.disconnect()
      liveSources.delete(source)
    }
  }

  function stopAllSources() {
    for (const source of liveSources) {
      source.onended = null
      try {
        source.stop()
      } catch {
        // never started or already stopped - nothing to do
      }
      source.disconnect()
    }
    liveSources.clear()
  }

  function promotePendingLoop() {
    if (pendingLoop && audioCtx.currentTime >= pendingLoop.time) {
      loop = pendingLoop
      pendingLoop = null
    }
  }

  // Display loop: derives the current beat from the audio clock's position
  // within the looping measure. A pure function of currentTime, so it
  // resynchronizes instantly after time spent hidden (rAF frozen).
  function visualSync() {
    if (audioCtx && loop) {
      promotePendingLoop()
      const elapsed = audioCtx.currentTime - loop.startTime
      if (elapsed >= 0) {
        const position = elapsed % loop.buffer.duration
        const beat = Math.min(loop.beats - 1, Math.floor(position / loop.secondsPerBeat))
        if (beat !== currentBeat.value) currentBeat.value = beat
      }
    }
    rafId = requestAnimationFrame(visualSync)
  }

  // Applies tempo/measure changes while playing: renders the new measure,
  // then swaps loops at the next beat boundary of the current one - the
  // change takes effect on the next beat, in phase, like the old lookahead
  // scheduler did. The seam is sample-accurate on the audio thread
  // (stop(when)/start(when, offset)) and falls on digital silence on both
  // sides, so no click is cut and no glitch is possible. Serialized by
  // `swapInProgress`: a burst of changes (tap tempo, slider drag) coalesces
  // into at most one swap per beat, each taking the freshest values. Only
  // ever triggered by foreground UI interactions, so the setTimeout below
  // is safe.
  async function requestLoopUpdate() {
    if (swapInProgress) return
    swapInProgress = true
    try {
      while (isPlaying.value && loop) {
        const generation = ++engineGeneration
        const targetTempo = tempo.value
        const targetBeats = beatsPerMeasure.value
        const buffer = await renderMeasureBuffer(targetTempo, targetBeats, audioCtx.sampleRate)
        if (!isPlaying.value || generation !== engineGeneration) return

        promotePendingLoop()
        const now = audioCtx.currentTime
        let nextBeatIndex = Math.max(1, Math.ceil((now - loop.startTime) / loop.secondsPerBeat))
        let swapTime = loop.startTime + nextBeatIndex * loop.secondsPerBeat
        if (swapTime - now < SWAP_MIN_LEAD) {
          nextBeatIndex += 1
          swapTime += loop.secondsPerBeat
        }

        // Same modulo semantics as the old scheduler: the beat slot the
        // current loop was about to play, wrapped into the new measure.
        const secondsPerBeat = 60 / targetTempo
        const targetBeat = (nextBeatIndex % loop.beats) % targetBeats
        const offset = targetBeat * secondsPerBeat

        const source = audioCtx.createBufferSource()
        source.buffer = buffer
        source.loop = true
        source.connect(masterGain)
        loopSource.stop(swapTime)
        source.start(swapTime, offset)
        trackSource(source)
        loopSource = source
        pendingLoop = {
          buffer,
          startTime: swapTime - offset,
          secondsPerBeat,
          beats: targetBeats,
          time: swapTime,
        }

        // Wait until the boundary has passed before considering another
        // swap (avoids stacking scheduled sources during bursts), then loop
        // again if the values moved in the meantime.
        await new Promise((resolve) => setTimeout(resolve, (swapTime - audioCtx.currentTime) * 1000 + 20))
        if (tempo.value === targetTempo && beatsPerMeasure.value === targetBeats) return
      }
    } finally {
      swapInProgress = false
    }
  }

  // Keeps the screen from locking for as long as the app is open, not just
  // while playing - a musician on stage shouldn't have to touch the phone.
  // Best effort: iOS refuses it in Low Power Mode (sometimes by resolving
  // the request without any actual effect - undetectable), and the UI shows
  // a warning through `wakeLockActive`. The sound itself no longer depends
  // on the screen staying on (see the audio session / loop engine above).
  async function acquireWakeLock() {
    if (!wakeLockSupported || wakeLockSentinel || wakeLockRequestPending) return
    if (document.visibilityState !== 'visible') return
    wakeLockRequestPending = true
    try {
      const sentinel = await navigator.wakeLock.request('screen')
      wakeLockSentinel = sentinel
      wakeLockActive.value = true
      sentinel.addEventListener('release', () => {
        // Voluntary releases clear `wakeLockSentinel` first - skip those.
        if (wakeLockSentinel !== sentinel) return
        wakeLockSentinel = null
        wakeLockActive.value = false
        // The OS dropped a lock we still want: retry while visible,
        // throttled so a systematic refusal doesn't loop.
        if (document.visibilityState === 'visible' && Date.now() - lastWakeLockRetry > 3000) {
          lastWakeLockRetry = Date.now()
          acquireWakeLock()
        }
      })
    } catch {
      // Denied (Low Power Mode, hidden tab...): non-blocking, the metronome
      // keeps running without the screen lock.
      wakeLockActive.value = false
    } finally {
      wakeLockRequestPending = false
    }
  }

  async function releaseWakeLock() {
    const sentinel = wakeLockSentinel
    wakeLockSentinel = null
    wakeLockActive.value = false
    try {
      await sentinel?.release()
    } catch {
      // nothing to do
    }
  }

  // WebKit only grants the very first wake lock request from a user gesture
  // (later re-acquisitions are exempt), and the setup-time attempt below
  // runs outside one - so the first tap/keypress anywhere retries it.
  // 'click' rather than 'pointerdown': on touch devices pointerdown fires
  // before the transient activation exists.
  function handleFirstGesture() {
    window.removeEventListener('click', handleFirstGesture, true)
    window.removeEventListener('keydown', handleFirstGesture, true)
    if (!wakeLockActive.value) acquireWakeLock()
  }

  // The browser auto-releases the wake lock when the tab backgrounds, and
  // the AudioContext may have been suspended/interrupted while away (call,
  // notification, sleep...). Both are restarted on return to foreground so
  // the app stays awake and the metronome doesn't go silent without the
  // user noticing.
  function handleVisibilityChange() {
    if (document.visibilityState !== 'visible') return
    acquireWakeLock()
    if (!isPlaying.value) return
    if (audioCtx && (audioCtx.state === 'suspended' || audioCtx.state === 'interrupted')) {
      audioCtx.resume().catch(() => {})
    }
    if (keepAliveAudio?.paused) {
      keepAliveAudio.play().catch(() => {})
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('click', handleFirstGesture, { once: true, capture: true })
  window.addEventListener('keydown', handleFirstGesture, { once: true, capture: true })
  setupMediaSession()
  configureAudioSession()
  acquireWakeLock()

  async function start() {
    if (isPlaying.value) return
    configureAudioSession()
    // Everything up to the first await must stay synchronous within the
    // user gesture (autoplay policies, wake lock transient activation).
    acquireWakeLock()
    const resumed = ensureAudioContext()
    ensureKeepAliveAudio()
    const targetTempo = tempo.value
    const targetBeats = beatsPerMeasure.value
    isPlaying.value = true
    const generation = ++engineGeneration
    const buffer = await renderMeasureBuffer(targetTempo, targetBeats, audioCtx.sampleRate)
    await resumed
    if (!isPlaying.value || generation !== engineGeneration) return
    const startTime = audioCtx.currentTime + 0.05
    const source = audioCtx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    source.connect(masterGain)
    source.start(startTime)
    trackSource(source)
    loopSource = source
    loop = { buffer, startTime, secondsPerBeat: 60 / targetTempo, beats: targetBeats }
    pendingLoop = null
    rafId = requestAnimationFrame(visualSync)
    updateMediaSessionMetadata()
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'
    // Tempo/measure may have changed during the render (a few ms window).
    if (tempo.value !== targetTempo || beatsPerMeasure.value !== targetBeats) requestLoopUpdate()
  }

  function stop() {
    isPlaying.value = false
    engineGeneration++
    stopAllSources()
    loopSource = null
    loop = null
    pendingLoop = null
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    currentBeat.value = -1
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

  watch([tempo, beatsPerMeasure], () => {
    if (!isPlaying.value) return
    updateMediaSessionMetadata()
    requestLoopUpdate()
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
    masterGain.gain.value = volume.value
  }

  function setVolume(value) {
    volume.value = Math.min(1, Math.max(0, value))
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
    releaseWakeLock()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('click', handleFirstGesture, true)
    window.removeEventListener('keydown', handleFirstGesture, true)
    keepAliveAudio?.remove()
  })

  return {
    isPlaying,
    tempo,
    beatsPerMeasure,
    volume,
    currentBeat,
    wakeLockActive,
    wakeLockSupported,
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
